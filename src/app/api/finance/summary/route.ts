import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.finance.view);
  if (denied) return denied;
  const { storeId } = ctx;

  // Get total revenue from orders
  const revenueAgg = await prisma.order.aggregate({
    where: {
      storeId,
      status: { in: ["COMPLETED", "SHIPPED", "DELIVERED", "PENDING_SHIPMENT"] },
    },
    _sum: { totalAmount: true, platformFee: true, commissionFee: true },
  });

  const orderRevenue = revenueAgg._sum.totalAmount || 0;
  const totalCommission =
    (revenueAgg._sum.platformFee || 0) + (revenueAgg._sum.commissionFee || 0);

  // Get total manual income (graceful if Income model not yet generated)
  let totalManualIncome = 0;
  try {
    const incomeAgg = await (prisma as any).income.aggregate({
      where: { storeId },
      _sum: { amount: true },
    });
    totalManualIncome = incomeAgg._sum.amount || 0;
  } catch {
    // Income model may not be generated yet
  }

  const totalRevenue = orderRevenue + totalManualIncome;

  // Get manual expenses + purchase order expenses
  const [expenseAgg, purchaseExpenseAgg] = await Promise.all([
    prisma.expense.aggregate({
      where: { storeId },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.purchaseOrder.aggregate({
      where: { storeId, status: { not: "CANCELLED" } },
      _sum: { totalAmountLocal: true },
      _count: { _all: true },
    }),
  ]);
  const totalManualExpenses = expenseAgg._sum.amount || 0;
  const totalPurchaseExpenses = purchaseExpenseAgg._sum.totalAmountLocal || 0;
  const totalExpenses = totalManualExpenses + totalPurchaseExpenses;
  const purchaseExpenseCount = purchaseExpenseAgg._count._all || 0;

  // Channel-level revenue breakdown
  const channelOrders = await prisma.order.groupBy({
    by: ["channelId"],
    where: {
      storeId,
      status: { in: ["COMPLETED", "SHIPPED", "DELIVERED", "PENDING_SHIPMENT"] },
      channelId: { not: null },
    },
    _sum: { totalAmount: true, platformFee: true, commissionFee: true },
  });

  const channelIds = channelOrders
    .map((c) => c.channelId)
    .filter(Boolean) as string[];
  const channels =
    channelIds.length > 0
      ? await prisma.channel.findMany({
          where: { id: { in: channelIds } },
          select: { id: true, name: true, code: true, color: true },
        })
      : [];
  const channelMap = new Map(channels.map((c) => [c.id, c]));

  const channelRevenue = channelOrders.map((co) => {
    const ch = channelMap.get(co.channelId!);
    const revenue = co._sum.totalAmount || 0;
    const commission = (co._sum.platformFee || 0) + (co._sum.commissionFee || 0);
    return {
      channelId: co.channelId,
      channelName: ch?.name || "Unknown",
      channelCode: ch?.code || "",
      color: ch?.color || "#6b7280",
      revenue,
      commission,
      net: revenue - commission,
    };
  });

  // Monthly finance for the last 6 months
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const monthlyOrders = await prisma.order.findMany({
    where: {
      storeId,
      status: { in: ["COMPLETED", "SHIPPED", "DELIVERED", "PENDING_SHIPMENT"] },
      createdAt: { gte: sixMonthsAgo },
    },
    select: { totalAmount: true, createdAt: true },
  });

  const monthlyExpenses = await prisma.expense.findMany({
    where: { storeId, date: { gte: sixMonthsAgo } },
    select: { amount: true, date: true },
  });
  const monthlyPurchaseExpenses = await prisma.purchaseOrder.findMany({
    where: {
      storeId,
      status: { not: "CANCELLED" },
      createdAt: { gte: sixMonthsAgo },
    },
    select: { totalAmountLocal: true, createdAt: true },
  });

  let monthlyIncomes: { amount: number; date: Date }[] = [];
  try {
    monthlyIncomes = await (prisma as any).income.findMany({
      where: { storeId, date: { gte: sixMonthsAgo } },
      select: { amount: true, date: true },
    });
  } catch {
    // Income model may not be generated yet
  }

  // Build monthly buckets
  const monthlyMap = new Map<string, { revenue: number; expenses: number }>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, { revenue: 0, expenses: 0 });
  }

  for (const o of monthlyOrders) {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = monthlyMap.get(key);
    if (bucket) bucket.revenue += o.totalAmount;
  }

  for (const inc of monthlyIncomes) {
    const d = new Date(inc.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = monthlyMap.get(key);
    if (bucket) bucket.revenue += inc.amount;
  }

  for (const e of monthlyExpenses) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = monthlyMap.get(key);
    if (bucket) bucket.expenses += e.amount;
  }

  for (const po of monthlyPurchaseExpenses) {
    const d = new Date(po.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = monthlyMap.get(key);
    if (bucket) bucket.expenses += po.totalAmountLocal || 0;
  }

  const recentPurchases = await prisma.purchaseOrder.findMany({
    where: { storeId, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      poNumber: true,
      totalAmountLocal: true,
      notes: true,
      createdAt: true,
      expectedDate: true,
      supplier: {
        select: { name: true, supplierNo: true },
      },
    },
  });

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const monthlyFinance = Array.from(monthlyMap.entries()).map(
    ([key, data]) => {
      const month = parseInt(key.split("-")[1]) - 1;
      return {
        month: monthNames[month],
        revenue: Math.round(data.revenue * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
        profit: Math.round((data.revenue - data.expenses) * 100) / 100,
      };
    }
  );

  return NextResponse.json({
    totalRevenue,
    totalManualIncome,
    totalExpenses,
    totalManualExpenses,
    totalPurchaseExpenses,
    purchaseExpenseCount,
    totalCommission,
    netProfit: totalRevenue - totalCommission - totalExpenses,
    channelRevenue,
    monthlyFinance,
    recentPurchases,
  });
});
