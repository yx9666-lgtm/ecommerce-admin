import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext, withTryCatch, parseBody } from "@/lib/api-utils";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const createExpenseSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().optional(),
  note: z.string().optional(),
  shopUsername: z.string().optional(),
  date: z.string().min(1),
});

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.finance.tableView);
  if (denied) return denied;
  const { storeId } = ctx;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where: { storeId },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where: { storeId } }),
  ]);

  return NextResponse.json({ items: expenses, total, page, pageSize });
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.finance.create);
  if (denied) return denied;
  const { storeId } = ctx;

  const body = await parseBody(req, createExpenseSchema);
  if (body instanceof NextResponse) return body;

  const expense = await prisma.expense.create({
    data: {
      storeId,
      category: body.category,
      amount: body.amount,
      currency: body.currency || "MYR",
      note: body.note,
      shopUsername: body.shopUsername || null,
      date: new Date(body.date),
    },
  });

  return NextResponse.json(expense, { status: 201 });
});
