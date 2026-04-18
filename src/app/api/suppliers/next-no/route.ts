import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";

export const GET = withTryCatch(async (_req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { supplierStartNo: true } });
  const startStr = store?.supplierStartNo || "001";
  const startNum = parseInt(startStr, 10) || 1;
  const padLen = startStr.length;

  const latest = await prisma.supplier.findFirst({
    where: { storeId },
    orderBy: { supplierNo: "desc" },
    select: { supplierNo: true },
  });

  if (!latest || !latest.supplierNo) return NextResponse.json({ supplierNo: String(startNum).padStart(padLen, "0") });

  const num = parseInt(latest.supplierNo, 10);
  const next = isNaN(num) ? String(startNum).padStart(padLen, "0") : String(num + 1).padStart(padLen, "0");

  return NextResponse.json({ supplierNo: next });
});
