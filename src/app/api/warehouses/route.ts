import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getAuthContext, withTryCatch, parseBody } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const createWarehouseSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  isDefault: z.boolean().optional(),
});

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

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.warehouses.tableView);
  if (denied) return denied;
  const { storeId } = ctx;

  const { searchParams } = new URL(req.url);
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const pageSize = Math.max(1, parseInt(pageSizeParam || "20", 10) || 20);
  const usePagination = Boolean(pageParam || pageSizeParam);
  const search = searchParams.get("search") || "";

  const where: any = { storeId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
    ];
  }

  const warehouseQuery: any = {
    where,
    orderBy: { name: "asc" },
  };
  if (usePagination) {
    warehouseQuery.skip = (page - 1) * pageSize;
    warehouseQuery.take = pageSize;
  }

  const [warehouses, total, defaultWarehouse] = await Promise.all([
    prisma.warehouse.findMany(warehouseQuery),
    prisma.warehouse.count({ where }),
    prisma.warehouse.findFirst({
      where: { storeId, isDefault: true },
      select: { name: true },
    }),
  ]);
  const inventoryCountMap = await getWarehouseInventoryCounts(
    storeId,
    warehouses.map((w) => w.id)
  );
  const warehousesWithCount = warehouses.map((warehouse) => ({
    ...warehouse,
    _count: { inventory: inventoryCountMap.get(warehouse.id) || 0 },
  }));

  return NextResponse.json({
    items: warehousesWithCount,
    total,
    page: usePagination ? page : 1,
    pageSize: usePagination ? pageSize : warehouses.length,
    defaultWarehouseName: defaultWarehouse?.name || null,
  });
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.warehouses.create);
  if (denied) return denied;
  const { storeId } = ctx;

  const body = await parseBody(req, createWarehouseSchema);
  if (body instanceof NextResponse) return body;

  // If setting as default, unset other defaults first
  if (body.isDefault) {
    await prisma.warehouse.updateMany({
      where: { storeId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const warehouse = await prisma.warehouse.create({
    data: { storeId, name: body.name, address: body.address || null, isDefault: body.isDefault || false },
  });

  return NextResponse.json(warehouse, { status: 201 });
});
