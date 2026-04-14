import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const search = searchParams.get("search");
  const tier = searchParams.get("tier");

  // ── Build where clause ──────────────────────────────────────────────
  const where: any = { storeId };

  if (tier && tier !== "all") {
    where.tier = tier;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  // ── Fetch customers + total count ───────────────────────────────────
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.count({ where }),
  ]);

  // ── Compute stats (scoped to store, ignoring filters) ──────────────
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [totalCustomers, newCustomers, vipCustomers, dormantCustomers] =
    await Promise.all([
      prisma.customer.count({ where: { storeId } }),
      prisma.customer.count({
        where: { storeId, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.customer.count({
        where: { storeId, tier: "vip" },
      }),
      prisma.customer.count({
        where: {
          storeId,
          OR: [
            { lastOrderAt: { lt: ninetyDaysAgo } },
            { lastOrderAt: null, createdAt: { lt: ninetyDaysAgo } },
          ],
        },
      }),
    ]);

  return NextResponse.json({
    data: customers,
    total,
    page,
    pageSize,
    stats: {
      total: totalCustomers,
      new: newCustomers,
      vip: vipCustomers,
      dormant: dormantCustomers,
    },
  });
});
