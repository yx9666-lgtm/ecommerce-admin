import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthContext, assertStoreOwnership, withTryCatch } from "@/lib/api-utils";

export const DELETE = withTryCatch(async (
  _req: NextRequest,
  ctx?: { params: Record<string, string> }
) => {
  const authCtx = await getAuthContext();
  if (authCtx instanceof NextResponse) return authCtx;
  const { storeId } = authCtx;

  const id = ctx?.params?.id;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const income = await (prisma as any).income.findUnique({
    where: { id },
    select: { storeId: true },
  });

  const ownershipError = assertStoreOwnership(income?.storeId, storeId);
  if (ownershipError) return ownershipError;

  await (prisma as any).income.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
