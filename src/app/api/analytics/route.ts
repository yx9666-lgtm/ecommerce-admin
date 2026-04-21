import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const CATEGORY_COLORS = [
  "#D97706", "#06B6D4", "#10B981", "#F59E0B", "#6B7280",
  "#8B5CF6", "#EF4444", "#14B8A6", "#F97316", "#A3A3A3",
];

function getStartDate(range: string): Date {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "last7days":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "last90days":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "last30days":
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

function formatDateKey(date: Date, useWeek: boolean): string {
  if (useWeek) {
    // Get ISO week-based key: "YYYY-Www"
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
  }
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${m}/${day}`;
}

const PLATFORMS = ["SHOPEE", "LAZADA", "TIKTOK", "PGMALL"] as const;

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.analytics.view);
  if (denied) return denied;
  const { storeId } = ctx;

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "last30days";
  const startDate = getStartDate(range);
  const useWeekGrouping = range === "last90days";

  // ── Fetch orders for sales trend + platform comparison ──
  const orders = await prisma.order.findMany({
    where: { storeId, createdAt: { gte: startDate } },
    select: { platform: true, totalAmount: true, createdAt: true },
  });

  // ── salesTrend: group by date (or week) and platform ──
  const trendMap = new Map<string, Record<string, number>>();
  for (const order of orders) {
    const key = formatDateKey(order.createdAt, useWeekGrouping);
    if (!trendMap.has(key)) {
      trendMap.set(key, { shopee: 0, lazada: 0, tiktok: 0, pgmall: 0 });
    }
    const bucket = trendMap.get(key)!;
    const platform = order.platform?.toLowerCase();
    if (platform && platform in bucket) {
      bucket[platform] += order.totalAmount;
    }
  }
  const salesTrend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, platforms]) => ({
      date,
      shopee: Math.round(platforms.shopee * 100) / 100,
      lazada: Math.round(platforms.lazada * 100) / 100,
      tiktok: Math.round(platforms.tiktok * 100) / 100,
      pgmall: Math.round(platforms.pgmall * 100) / 100,
    }));

  // ── platformComparison ──
  const platformStats: Record<string, { count: number; revenue: number }> = {};
  for (const p of PLATFORMS) {
    platformStats[p] = { count: 0, revenue: 0 };
  }
  for (const order of orders) {
    if (order.platform && platformStats[order.platform]) {
      platformStats[order.platform].count += 1;
      platformStats[order.platform].revenue += order.totalAmount;
    }
  }

  const platformComparison = [
    {
      metric: "Orders",
      shopee: platformStats.SHOPEE.count,
      lazada: platformStats.LAZADA.count,
      tiktok: platformStats.TIKTOK.count,
      pgmall: platformStats.PGMALL.count,
    },
    {
      metric: "Revenue",
      shopee: Math.round(platformStats.SHOPEE.revenue * 100) / 100,
      lazada: Math.round(platformStats.LAZADA.revenue * 100) / 100,
      tiktok: Math.round(platformStats.TIKTOK.revenue * 100) / 100,
      pgmall: Math.round(platformStats.PGMALL.revenue * 100) / 100,
    },
    {
      metric: "Avg Order",
      shopee: platformStats.SHOPEE.count ? Math.round((platformStats.SHOPEE.revenue / platformStats.SHOPEE.count) * 100) / 100 : 0,
      lazada: platformStats.LAZADA.count ? Math.round((platformStats.LAZADA.revenue / platformStats.LAZADA.count) * 100) / 100 : 0,
      tiktok: platformStats.TIKTOK.count ? Math.round((platformStats.TIKTOK.revenue / platformStats.TIKTOK.count) * 100) / 100 : 0,
      pgmall: platformStats.PGMALL.count ? Math.round((platformStats.PGMALL.revenue / platformStats.PGMALL.count) * 100) / 100 : 0,
    },
  ];

  // ── productRanking: top 10 by quantity ──
  const orderItems = await prisma.orderItem.findMany({
    where: { order: { storeId, createdAt: { gte: startDate } } },
    select: { name: true, productId: true, quantity: true, totalPrice: true },
  });

  const productMap = new Map<string, { name: string; sales: number; revenue: number }>();
  for (const item of orderItems) {
    const key = item.productId || item.name;
    const existing = productMap.get(key);
    if (existing) {
      existing.sales += item.quantity;
      existing.revenue += item.totalPrice;
    } else {
      productMap.set(key, { name: item.name, sales: item.quantity, revenue: item.totalPrice });
    }
  }
  const productRanking = Array.from(productMap.values())
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10)
    .map((p, i) => ({
      rank: i + 1,
      name: p.name,
      sales: p.sales,
      revenue: Math.round(p.revenue * 100) / 100,
    }));

  // ── categoryShare: revenue by product category ──
  const itemsWithCategory = await prisma.orderItem.findMany({
    where: { order: { storeId, createdAt: { gte: startDate } } },
    select: {
      totalPrice: true,
      product: {
        select: {
          category: { select: { nameZh: true } },
        },
      },
    },
  });

  const categoryMap = new Map<string, number>();
  for (const item of itemsWithCategory) {
    const catName = item.product?.category?.nameZh || "Others";
    categoryMap.set(catName, (categoryMap.get(catName) || 0) + item.totalPrice);
  }

  const totalCategoryRevenue = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0);
  const categoryShare = Array.from(categoryMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name, value], i) => ({
      name,
      value: totalCategoryRevenue > 0 ? Math.round((value / totalCategoryRevenue) * 1000) / 10 : 0,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

  // ── Summary totals ──
  const totalOrders = orders.length;
  const totalRevenue = Math.round(orders.reduce((sum, o) => sum + o.totalAmount, 0) * 100) / 100;
  const avgOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

  return NextResponse.json({
    salesTrend,
    platformComparison,
    productRanking,
    categoryShare,
    summary: { totalOrders, totalRevenue, avgOrderValue },
  });
});
