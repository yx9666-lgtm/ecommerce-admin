import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, parseBody, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { buildSkuFromSerial, extractSerialNo, formatSerialNo, normalizeSkuConfig, type SkuConfig } from "@/lib/sku-config";

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
  const baseSkuConfig = normalizeSkuConfig(notificationPrefs.skuConfig, store.skuPrefix, store.skuStartNo);
  const effective = await resolveEffectiveSkuConfig(storeId, baseSkuConfig);

  return NextResponse.json({
    ...store,
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

  const { skuConfig, ...rest } = body;

  const existingStore = await prisma.store.findUnique({
    where: { id: storeId },
    select: { notificationPrefs: true },
  });
  const existingPrefs =
    existingStore?.notificationPrefs &&
    typeof existingStore.notificationPrefs === "object" &&
    !Array.isArray(existingStore.notificationPrefs)
      ? (existingStore.notificationPrefs as Record<string, unknown>)
      : {};

  const store = await prisma.store.update({
    where: { id: storeId },
    data: {
      ...rest,
      ...(skuConfig
        ? {
            notificationPrefs: {
              ...existingPrefs,
              skuConfig: {
                partCount: skuConfig.partCount,
                serialPart: skuConfig.serialPart,
                separator: skuConfig.separator,
                serialStartNo: skuConfig.serialStartNo,
                parts: skuConfig.parts.map((part) => part.trim().toUpperCase()),
              },
            },
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
  const normalizedSkuConfig = normalizeSkuConfig(notificationPrefs.skuConfig, store.skuPrefix, store.skuStartNo);
  const effective = await resolveEffectiveSkuConfig(storeId, normalizedSkuConfig);

  return NextResponse.json({
    ...store,
    skuConfig: effective.skuConfig,
    nextSku: effective.nextSku,
    nextSerial: effective.nextSerial,
  });
});
