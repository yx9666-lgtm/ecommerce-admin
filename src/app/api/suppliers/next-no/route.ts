import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";

export const GET = withTryCatch(async (_req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const latest = await prisma.supplier.findFirst({
    where: { storeId, supplierNo: { startsWith: "SUP-" } },
    orderBy: { supplierNo: "desc" },
    select: { supplierNo: true },
  });

  if (!latest || !latest.supplierNo) return NextResponse.json({ supplierNo: "SUP-001" });

  const num = parseInt(latest.supplierNo.replace("SUP-", ""), 10);
  const next = isNaN(num) ? "SUP-001" : `SUP-${String(num + 1).padStart(3, "0")}`;

  return NextResponse.json({ supplierNo: next });
});
