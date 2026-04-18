import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, parseBody, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";

export const GET = withTryCatch(async (_req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const categories = await prisma.category.findMany({
    where: { storeId },
    orderBy: [{ position: "asc" }, { nameZh: "asc" }],
  });

  return NextResponse.json(categories);
});

const createCategorySchema = z.object({
  nameZh: z.string().min(1),
  nameEn: z.string().optional(),
  parentId: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const body = await parseBody(req, createCategorySchema);
  if (body instanceof NextResponse) return body;

  const category = await prisma.category.create({
    data: {
      storeId,
      nameZh: body.nameZh,
      nameEn: body.nameEn || "",
      parentId: body.parentId || null,
      position: body.position || 0,
    },
  });

  return NextResponse.json(category, { status: 201 });
});
