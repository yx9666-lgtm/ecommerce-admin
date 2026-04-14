import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, withTryCatch, parseBody } from "@/lib/api-utils";
import prisma from "@/lib/db";

const createWarehouseSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const GET = withTryCatch(async (_req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const warehouses = await prisma.warehouse.findMany({
    where: { storeId },
    include: { _count: { select: { inventory: true } } },
  });

  return NextResponse.json({ items: warehouses });
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const body = await parseBody(req, createWarehouseSchema);
  if (body instanceof NextResponse) return body;

  const warehouse = await prisma.warehouse.create({
    data: { storeId, name: body.name, address: body.address, isDefault: body.isDefault || false },
  });

  return NextResponse.json(warehouse, { status: 201 });
});
