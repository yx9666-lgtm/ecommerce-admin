import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";

export const GET = withTryCatch(async (_req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { skuPrefix: true, skuStartNo: true } });
  const prefix = store?.skuPrefix || "RJ";
  const startStr = store?.skuStartNo || "1001";
  const fullPrefix = `${prefix}-`;

  const latest = await prisma.product.findFirst({
    where: { storeId, sku: { startsWith: fullPrefix } },
    orderBy: { sku: "desc" },
    select: { sku: true },
  });

  if (!latest) return NextResponse.json({ sku: `${fullPrefix}${startStr}` });

  const num = parseInt(latest.sku.replace(fullPrefix, ""), 10);
  const nextSku = isNaN(num) ? `${fullPrefix}${startStr}` : `${fullPrefix}${num + 1}`;

  return NextResponse.json({ sku: nextSku });
});
