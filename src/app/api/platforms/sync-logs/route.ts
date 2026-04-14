import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");

  const logs = await prisma.syncLog.findMany({
    where: {
      connection: { storeId },
    },
    include: {
      connection: {
        select: { platform: true, shopName: true },
      },
    },
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ logs });
});
