import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { assertStoreOwnership, getAuthContext, parseBody, withTryCatch } from "@/lib/api-utils";

const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "DRAFT", "INACTIVE", "ARCHIVED"]),
});

const syncOnlyDeleteResponse = {
  error: "Product deletions are synchronized from Purchasing only.",
  code: "PRODUCT_SYNCED_FROM_PURCHASING_ONLY",
};

export const PUT = withTryCatch(async (req: NextRequest, context) => {
  const ctx = await getAuthContext(req);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.products.edit);
  if (denied) return denied;

  const { id } = context!.params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, storeId: true, status: true },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ownershipError = assertStoreOwnership(product.storeId, ctx.storeId);
  if (ownershipError) return ownershipError;

  const body = await parseBody(req, updateStatusSchema);
  if (body instanceof NextResponse) return body;

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { status: body.status },
    select: { id: true, status: true },
  });

  return NextResponse.json(updated);
});

export const DELETE = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext(req);
  if (ctx instanceof NextResponse) return ctx;
  return NextResponse.json(syncOnlyDeleteResponse, { status: 403 });
});
