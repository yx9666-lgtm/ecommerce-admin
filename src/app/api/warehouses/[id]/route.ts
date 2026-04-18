import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, withTryCatch, assertStoreOwnership, parseBody } from "@/lib/api-utils";
import prisma from "@/lib/db";

const updateWarehouseSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const PUT = withTryCatch(async (req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const existing = await prisma.warehouse.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  const body = await parseBody(req, updateWarehouseSchema);
  if (body instanceof NextResponse) return body;

  // If setting as default, unset other defaults first
  if (body.isDefault) {
    await prisma.warehouse.updateMany({
      where: { storeId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const warehouse = await prisma.warehouse.update({
    where: { id },
    data: {
      name: body.name,
      address: body.address || null,
      isDefault: body.isDefault ?? false,
    },
  });
  return NextResponse.json(warehouse);
});

export const DELETE = withTryCatch(async (_req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const existing = await prisma.warehouse.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  await prisma.warehouse.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
