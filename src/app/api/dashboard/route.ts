import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

export const GET = withTryCatch(async (_req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.dashboard.view);
  if (denied) return denied;
  const { storeId } = ctx;

  const [
    productCount,
    orderCount,
    customerCount,
    recentOrders,
    topProducts,
    suppliers,
    purchaseOrders,
    warehouses,
    revenueAgg,
    expenseAgg,
  ] = await Promise.all([
    prisma.product.count({ where: { storeId } }),
    prisma.order.count({ where: { storeId } }),
    prisma.customer.count({ where: { storeId } }),
    prisma.order.findMany({ where: { storeId }, orderBy: { createdAt: "desc" }, take: 5, include: { customer: true } }),
    prisma.product.findMany({ where: { storeId, status: "ACTIVE" }, orderBy: { totalStock: "desc" }, take: 5 }),
    prisma.supplier.count({ where: { storeId } }),
    prisma.purchaseOrder.count({ where: { storeId } }),
    prisma.warehouse.findMany({ where: { storeId }, include: { _count: { select: { inventory: true } } } }),
    prisma.order.aggregate({ where: { storeId }, _sum: { totalAmount: true } }),
    prisma.expense.aggregate({ where: { storeId }, _sum: { amount: true } }),
  ]);

  const totalRevenue = revenueAgg._sum.totalAmount || 0;
  const totalExpenses = expenseAgg._sum.amount || 0;

  return NextResponse.json({
    stats: {
      totalRevenue,
      orderCount,
      productCount,
      customerCount,
      supplierCount: suppliers,
      purchaseOrderCount: purchaseOrders,
      totalExpenses,
    },
    recentOrders,
    topProducts,
    warehouses,
  });
});
