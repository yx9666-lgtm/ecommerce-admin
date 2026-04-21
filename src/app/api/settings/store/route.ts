import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, parseBody, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

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
    },
  });

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  return NextResponse.json(store);
});

// ─── PUT: update store settings ─────────────────────────────────────────────

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
});

export const PUT = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.settings.edit);
  if (denied) return denied;
  const { storeId } = ctx;

  const body = await parseBody(req, updateStoreSchema);
  if (body instanceof NextResponse) return body;

  const store = await prisma.store.update({
    where: { id: storeId },
    data: body,
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
    },
  });

  return NextResponse.json(store);
});
