import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, parseBody, withTryCatch, assertStoreOwnership } from "@/lib/api-utils";
import prisma from "@/lib/db";

const updatePromotionSchema = z.object({
  nameZh: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  platform: z.enum(["SHOPEE", "LAZADA", "TIKTOK", "PGMALL"]).nullable().optional(),
  discount: z.number().min(0).max(100).nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().min(0).nullable().optional(),
});

export const PUT = withTryCatch(async (req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const existing = await prisma.promotion.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  const body = await parseBody(req, updatePromotionSchema);
  if (body instanceof NextResponse) return body;

  const data: any = {};
  if (body.nameZh !== undefined) data.nameZh = body.nameZh;
  if (body.nameEn !== undefined) data.nameEn = body.nameEn;
  if (body.type !== undefined) data.type = body.type;
  if (body.platform !== undefined) data.platform = body.platform;
  if (body.discount !== undefined) data.discount = body.discount;
  if (body.startDate) data.startDate = new Date(body.startDate);
  if (body.endDate) data.endDate = new Date(body.endDate);
  if (body.budget !== undefined) data.budget = body.budget;

  const promotion = await prisma.promotion.update({ where: { id }, data });
  return NextResponse.json(promotion);
});

export const DELETE = withTryCatch(async (_req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const existing = await prisma.promotion.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  await prisma.promotion.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
