import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, withTryCatch, assertStoreOwnership, parseBody } from "@/lib/api-utils";
import prisma from "@/lib/db";

const updateBrandSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  position: z.number().int().min(0).optional(),
});

export const PUT = withTryCatch(async (req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const existing = await prisma.brand.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  const body = await parseBody(req, updateBrandSchema);
  if (body instanceof NextResponse) return body;

  const brand = await prisma.brand.update({
    where: { id },
    data: {
      name: body.name,
      nameEn: body.nameEn || null,
      position: body.position ?? 0,
    },
  });

  return NextResponse.json(brand);
});

export const DELETE = withTryCatch(async (_req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const existing = await prisma.brand.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  await prisma.brand.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
