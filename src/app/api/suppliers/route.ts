import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, withTryCatch, parseBody } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const createSupplierSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  phone3: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.suppliers.view);
  if (denied) return denied;
  const { storeId } = ctx;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "100");
  const search = searchParams.get("search") || "";

  const where: any = { storeId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { supplierNo: { contains: search, mode: "insensitive" } },
    ];
  }

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supplier.count({ where }),
  ]);

  return NextResponse.json({ items: suppliers, total, page, pageSize });
});

async function generateSupplierNo(storeId: string): Promise<string> {
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { supplierStartNo: true } });
  const startStr = store?.supplierStartNo || "001";
  const startNum = parseInt(startStr, 10) || 1;
  const padLen = startStr.length;

  const latest = await prisma.supplier.findFirst({
    where: { storeId },
    orderBy: { supplierNo: "desc" },
    select: { supplierNo: true },
  });

  if (!latest || !latest.supplierNo) return String(startNum).padStart(padLen, "0");

  const num = parseInt(latest.supplierNo, 10);
  if (isNaN(num)) return String(startNum).padStart(padLen, "0");

  return String(num + 1).padStart(padLen, "0");
}

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.suppliers.create);
  if (denied) return denied;
  const { storeId } = ctx;

  const body = await parseBody(req, createSupplierSchema);
  if (body instanceof NextResponse) return body;

  const supplierNo = await generateSupplierNo(storeId);

  const supplier = await prisma.supplier.create({
    data: {
      storeId,
      supplierNo,
      name: body.name,
      contactName: body.contactName || null,
      phone1: body.phone1 || null,
      phone2: body.phone2 || null,
      phone3: body.phone3 || null,
      address: body.address || null,
      country: body.country || "MY",
      notes: body.notes || null,
    },
  });

  return NextResponse.json(supplier, { status: 201 });
});
