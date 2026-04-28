import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

async function getWarehouseInventoryCounts(storeId: string, warehouseIds: string[]) {
  if (warehouseIds.length === 0) return new Map<string, number>();
  const rows = await prisma.$queryRaw<Array<{ warehouseId: string; inventoryCount: number }>>(
    Prisma.sql`
      SELECT
        po."warehouse_id" AS "warehouseId",
        COUNT(DISTINCT poi."sku")::int AS "inventoryCount"
      FROM "purchase_order_items" poi
      INNER JOIN "purchase_orders" po ON po."id" = poi."purchase_order_id"
      WHERE
        po."store_id" = ${storeId}
        AND po."status" <> 'CANCELLED'
        AND po."warehouse_id" IN (${Prisma.join(warehouseIds)})
        AND poi."sku" IS NOT NULL
        AND poi."sku" <> ''
      GROUP BY po."warehouse_id"
    `
  );
  return new Map(rows.map((row) => [row.warehouseId, Number(row.inventoryCount) || 0]));
}

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
    warehousesRaw,
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
    prisma.warehouse.findMany({ where: { storeId } }),
    prisma.order.aggregate({ where: { storeId }, _sum: { totalAmount: true } }),
    prisma.expense.aggregate({ where: { storeId }, _sum: { amount: true } }),
  ]);
  const inventoryCountMap = await getWarehouseInventoryCounts(
    storeId,
    warehousesRaw.map((warehouse) => warehouse.id)
  );
  const warehouses = warehousesRaw.map((warehouse) => ({
    ...warehouse,
    _count: { inventory: inventoryCountMap.get(warehouse.id) || 0 },
  }));

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
