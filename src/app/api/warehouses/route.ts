import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, withTryCatch, parseBody } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const createWarehouseSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  isDefault: z.boolean().optional(),
});

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
    include: { _count: { select: { inventory: true } } },
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

  return NextResponse.json({
    items: warehouses,
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
