import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext, assertStoreOwnership, withTryCatch, parseBody } from "@/lib/api-utils";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const updateIncomeSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().min(1),
  note: z.string().optional(),
  shopUsername: z.string().optional(),
});

export const PUT = withTryCatch(async (
  req: NextRequest,
  ctx?: { params: Record<string, string> }
) => {
  const authCtx = await getAuthContext();
  if (authCtx instanceof NextResponse) return authCtx;
  const denied = requirePermission(authCtx, PERMISSIONS.finance.edit);
  if (denied) return denied;
  const { storeId } = authCtx;

  const id = ctx?.params?.id;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const income = await prisma.income.findUnique({
    where: { id },
    select: { storeId: true },
  });

  const ownershipError = assertStoreOwnership(income?.storeId, storeId);
  if (ownershipError) return ownershipError;

  const body = await parseBody(req, updateIncomeSchema);
  if (body instanceof NextResponse) return body;

  const updated = await prisma.income.update({
    where: { id },
    data: {
      category: body.category,
      amount: body.amount,
      date: new Date(body.date),
      note: body.note || null,
      shopUsername: body.shopUsername || null,
    },
  });

  return NextResponse.json(updated);
});

export const DELETE = withTryCatch(async (
  _req: NextRequest,
  ctx?: { params: Record<string, string> }
) => {
  const authCtx = await getAuthContext();
  if (authCtx instanceof NextResponse) return authCtx;
  const denied = requirePermission(authCtx, PERMISSIONS.finance.delete);
  if (denied) return denied;
  const { storeId } = authCtx;

  const id = ctx?.params?.id;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const income = await prisma.income.findUnique({
    where: { id },
    select: { storeId: true },
  });

  const ownershipError = assertStoreOwnership(income?.storeId, storeId);
  if (ownershipError) return ownershipError;

  await prisma.income.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
