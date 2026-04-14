import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, withTryCatch, assertStoreOwnership, parseBody } from "@/lib/api-utils";
import prisma from "@/lib/db";

const updateSupplierSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  phone3: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});

export const PUT = withTryCatch(async (req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  // IDOR check
  const existing = await prisma.supplier.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  const body = await parseBody(req, updateSupplierSchema);
  if (body instanceof NextResponse) return body;
  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      name: body.name,
      contactName: body.contactName || null,
      phone1: body.phone1 || null,
      phone2: body.phone2 || null,
      phone3: body.phone3 || null,
      address: body.address || null,
      country: body.country || "MY",
      notes: body.notes || null,
    },
  });
  return NextResponse.json(supplier);
});

export const DELETE = withTryCatch(async (_req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  // IDOR check
  const existing = await prisma.supplier.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  await prisma.supplier.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
