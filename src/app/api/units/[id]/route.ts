import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, withTryCatch, assertStoreOwnership, parseBody } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const updateUnitSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  symbol: z.string().optional(),
});

export const PUT = withTryCatch(async (req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.settings.edit);
  if (denied) return denied;
  const { storeId } = ctx;

  const existing = await prisma.unitOfMeasure.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  const body = await parseBody(req, updateUnitSchema);
  if (body instanceof NextResponse) return body;

  const unit = await prisma.unitOfMeasure.update({
    where: { id },
    data: {
      name: body.name,
      nameEn: body.nameEn || null,
      symbol: body.symbol || null,
    },
  });

  return NextResponse.json(unit);
});

export const DELETE = withTryCatch(async (_req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.settings.delete);
  if (denied) return denied;
  const { storeId } = ctx;

  const existing = await prisma.unitOfMeasure.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  await prisma.unitOfMeasure.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
