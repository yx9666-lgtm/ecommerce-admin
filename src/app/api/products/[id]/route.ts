import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, parseBody, withTryCatch, assertStoreOwnership } from "@/lib/api-utils";
import prisma from "@/lib/db";

const updateProductSchema = z.object({
  nameZh: z.string().min(1).optional(),
  nameEn: z.string().optional(),
  descZh: z.string().optional(),
  descEn: z.string().optional(),
  costPrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  comparePrice: z.number().positive().nullable().optional(),
  weight: z.number().min(0).nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  brand: z.string().optional(),
  totalStock: z.number().int().min(0).optional(),
});

export const PUT = withTryCatch(async (req: NextRequest, context) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const { id } = context!.params;

  // IDOR check: verify product belongs to session store
  const existing = await prisma.product.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  const body = await parseBody(req, updateProductSchema);
  if (body instanceof NextResponse) return body;

  const product = await prisma.product.update({
    where: { id },
    data: {
      nameZh: body.nameZh,
      nameEn: body.nameEn,
      descZh: body.descZh,
      descEn: body.descEn,
      costPrice: body.costPrice || 0,
      sellingPrice: body.sellingPrice || 0,
      comparePrice: body.comparePrice,
      weight: body.weight,
      status: body.status,
      brand: body.brand,
      totalStock: body.totalStock || 0,
    },
  });
  return NextResponse.json(product);
});

export const DELETE = withTryCatch(async (_req: NextRequest, context) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const { id } = context!.params;

  // IDOR check: verify product belongs to session store
  const existing = await prisma.product.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
