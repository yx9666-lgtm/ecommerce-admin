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
  const search = searchParams.get("search") || "";

  const where: any = { storeId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
    ];
  }

  const [warehouses, total] = await Promise.all([
    prisma.warehouse.findMany({
      where,
      include: { _count: { select: { inventory: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.count({ where }),
  ]);

  return NextResponse.json({ items: warehouses, total });
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
