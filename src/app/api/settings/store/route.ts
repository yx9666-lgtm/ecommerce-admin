import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getAuthContext, parseBody, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { buildSkuFromSerial, extractSerialNo, formatSerialNo, normalizeSkuConfig, type SkuConfig } from "@/lib/sku-config";

type StockStatusThresholds = {
  low: number;
  critical: number;
  out: number;
};

async function resolveEffectiveSkuConfig(storeId: string, baseConfig: SkuConfig) {
  const products = await prisma.product.findMany({
    where: { storeId },
    select: { sku: true },
  });

  let maxSerial = -1;
  for (const product of products) {
    const serial = extractSerialNo(baseConfig, product.sku);
    if (serial !== null) {
      maxSerial = Math.max(maxSerial, serial);
    }
  }

  const startSerial = parseInt(baseConfig.serialStartNo, 10);
  const nextSerial = maxSerial >= 0 ? maxSerial + 1 : (Number.isNaN(startSerial) ? 1001 : startSerial);
  const serialWidth = baseConfig.serialStartNo.length || 4;

  return {
    nextSerial,
    nextSku: buildSkuFromSerial(baseConfig, nextSerial),
    skuConfig: {
      ...baseConfig,
      serialStartNo: formatSerialNo(nextSerial, serialWidth),
    },
  };
}

function normalizeStockStatusThresholds(input: unknown, fallbackLow: number): StockStatusThresholds {
  const safeFallbackLow = Math.max(0, Number.isFinite(fallbackLow) ? Math.floor(fallbackLow) : 10);
  let low = safeFallbackLow;
  let critical = safeFallbackLow > 0 ? Math.max(0, Math.floor(safeFallbackLow * 0.3)) : 0;
  let out = 0;

  if (input && typeof input === "object" && !Array.isArray(input)) {
    const raw = input as Record<string, unknown>;
    const toInt = (value: unknown, fallback: number) => {
      if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
      if (typeof value === "string" && /^\d+$/.test(value)) return parseInt(value, 10);
      return fallback;
    };
    low = Math.max(0, toInt(raw.low, low));
    critical = Math.max(0, toInt(raw.critical, critical));
    out = Math.max(0, toInt(raw.out, out));
  }

  if (critical > low) critical = low;
  if (out > critical) out = critical;

  return { low, critical, out };
}

// ─── GET: return current store info ─────────────────────────────────────────

export const GET = withTryCatch(async () => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.settings.view);
  if (denied) return denied;
  const { storeId } = ctx;

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      currency: true,
      timezone: true,
      description: true,
      skuPrefix: true,
      skuStartNo: true,
      supplierPrefix: true,
      supplierStartNo: true,
      poPrefix: true,
      lowStockThreshold: true,
      notificationPrefs: true,
    },
  });

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const notificationPrefs =
    store.notificationPrefs && typeof store.notificationPrefs === "object" && !Array.isArray(store.notificationPrefs)
      ? (store.notificationPrefs as Record<string, unknown>)
      : {};
  const stockStatusThresholds = normalizeStockStatusThresholds(
    notificationPrefs.stockStatusThresholds,
    store.lowStockThreshold
  );
  const baseSkuConfig = normalizeSkuConfig(notificationPrefs.skuConfig, store.skuPrefix, store.skuStartNo);
  const effective = await resolveEffectiveSkuConfig(storeId, baseSkuConfig);

  return NextResponse.json({
    ...store,
    lowStockThreshold: stockStatusThresholds.low,
    stockStatusThresholds,
    skuConfig: effective.skuConfig,
    nextSku: effective.nextSku,
    nextSerial: effective.nextSerial,
  });
});

// ─── PUT: update store settings ─────────────────────────────────────────────

const skuConfigSchema = z
  .object({
    partCount: z.number().int().min(1).max(5),
    serialPart: z.number().int().min(1).max(5),
    separator: z.string().min(1).max(3),
    serialStartNo: z.string().min(1).max(20),
    parts: z.array(z.string().max(20)).min(1).max(5),
  })
  .superRefine((value, ctx) => {
    if (value.serialPart > value.partCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["serialPart"],
        message: "serialPart must be within partCount",
      });
    }
    if (value.parts.length !== value.partCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parts"],
        message: "parts length must equal partCount",
      });
    }
    for (let index = 0; index < value.partCount; index++) {
      const partIndex = index + 1;
      if (partIndex === value.serialPart) continue;
      if (!value.parts[index]?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["parts", index],
          message: "non-serial sku parts are required",
        });
      }
    }
    if (!/^\d+$/.test(value.serialStartNo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["serialStartNo"],
        message: "serialStartNo must contain digits only",
      });
    }
  });

const updateStoreSchema = z.object({
  name: z.string().min(1).optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  description: z.string().nullable().optional(),
  skuPrefix: z.string().min(1).max(10).optional(),
  skuStartNo: z.string().min(1).max(10).optional(),
  supplierPrefix: z.string().min(1).max(10).optional(),
  supplierStartNo: z.string().min(1).max(10).optional(),
  poPrefix: z.string().min(1).max(10).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  stockStatusThresholds: z
    .object({
      low: z.number().int().min(0),
      critical: z.number().int().min(0),
      out: z.number().int().min(0),
    })
    .superRefine((value, ctx) => {
      if (value.critical > value.low) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["critical"],
          message: "critical must be less than or equal to low",
        });
      }
      if (value.out > value.critical) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["out"],
          message: "out must be less than or equal to critical",
        });
      }
    })
    .optional(),
  skuConfig: skuConfigSchema.optional(),
});

export const PUT = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.settings.edit);
  if (denied) return denied;
  const { storeId } = ctx;

  const body = await parseBody(req, updateStoreSchema);
  if (body instanceof NextResponse) return body;

  const { skuConfig, stockStatusThresholds, ...rest } = body;

  const existingStore = await prisma.store.findUnique({
    where: { id: storeId },
    select: { notificationPrefs: true, lowStockThreshold: true },
  });
  const existingPrefs =
    existingStore?.notificationPrefs &&
    typeof existingStore.notificationPrefs === "object" &&
    !Array.isArray(existingStore.notificationPrefs)
      ? (existingStore.notificationPrefs as Record<string, unknown>)
      : {};
  const existingThresholds = normalizeStockStatusThresholds(
    existingPrefs.stockStatusThresholds,
    existingStore?.lowStockThreshold ?? 10
  );
  const mergedThresholds =
    stockStatusThresholds
      ? normalizeStockStatusThresholds(stockStatusThresholds, stockStatusThresholds.low)
      : body.lowStockThreshold !== undefined
        ? normalizeStockStatusThresholds(
            { ...existingThresholds, low: body.lowStockThreshold },
            body.lowStockThreshold
          )
        : null;
  const nextPrefs: Record<string, unknown> = { ...existingPrefs };
  if (skuConfig) {
    nextPrefs.skuConfig = {
      partCount: skuConfig.partCount,
      serialPart: skuConfig.serialPart,
      separator: skuConfig.separator,
      serialStartNo: skuConfig.serialStartNo,
      parts: skuConfig.parts.map((part) => part.trim().toUpperCase()),
    };
  }
  if (mergedThresholds) {
    nextPrefs.stockStatusThresholds = mergedThresholds;
  }

  const store = await prisma.store.update({
    where: { id: storeId },
    data: {
      ...rest,
      ...(skuConfig || mergedThresholds
        ? {
            notificationPrefs: nextPrefs as Prisma.InputJsonValue,
          }
        : {}),
      ...(mergedThresholds
        ? {
            lowStockThreshold: mergedThresholds.low,
          }
        : {}),
      ...(skuConfig
        ? {
            skuStartNo: skuConfig.serialStartNo,
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      currency: true,
      timezone: true,
      description: true,
      skuPrefix: true,
      skuStartNo: true,
      supplierPrefix: true,
      supplierStartNo: true,
      poPrefix: true,
      lowStockThreshold: true,
      notificationPrefs: true,
    },
  });

  const notificationPrefs =
    store.notificationPrefs && typeof store.notificationPrefs === "object" && !Array.isArray(store.notificationPrefs)
      ? (store.notificationPrefs as Record<string, unknown>)
      : {};
  const normalizedThresholds = normalizeStockStatusThresholds(
    notificationPrefs.stockStatusThresholds,
    store.lowStockThreshold
  );
  const normalizedSkuConfig = normalizeSkuConfig(notificationPrefs.skuConfig, store.skuPrefix, store.skuStartNo);
  const effective = await resolveEffectiveSkuConfig(storeId, normalizedSkuConfig);

  return NextResponse.json({
    ...store,
    lowStockThreshold: normalizedThresholds.low,
    stockStatusThresholds: normalizedThresholds,
    skuConfig: effective.skuConfig,
    nextSku: effective.nextSku,
    nextSerial: effective.nextSerial,
  });
});
