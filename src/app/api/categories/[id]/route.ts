import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, parseBody, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";

const updateCategorySchema = z.object({
  nameZh: z.string().min(1).optional(),
  nameEn: z.string().optional(),
  parentId: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

export const PUT = withTryCatch(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const existing = await prisma.category.findFirst({ where: { id: params.id, storeId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await parseBody(req, updateCategorySchema);
  if (body instanceof NextResponse) return body;

  const category = await prisma.category.update({
    where: { id: params.id },
    data: body,
  });

  return NextResponse.json(category);
});

export const DELETE = withTryCatch(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const existing = await prisma.category.findFirst({ where: { id: params.id, storeId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.category.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
});
