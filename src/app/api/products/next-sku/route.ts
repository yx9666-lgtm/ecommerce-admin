import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";

export const GET = withTryCatch(async (_req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const latest = await prisma.product.findFirst({
    where: { storeId, sku: { startsWith: "RJ-" } },
    orderBy: { sku: "desc" },
    select: { sku: true },
  });

  if (!latest) return NextResponse.json({ sku: "RJ-1001" });

  const num = parseInt(latest.sku.replace("RJ-", ""), 10);
  const nextSku = isNaN(num) ? "RJ-1001" : `RJ-${num + 1}`;

  return NextResponse.json({ sku: nextSku });
});
