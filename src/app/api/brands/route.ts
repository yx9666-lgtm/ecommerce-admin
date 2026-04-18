import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, withTryCatch, parseBody } from "@/lib/api-utils";
import prisma from "@/lib/db";

const brandSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  position: z.number().int().min(0).optional(),
});

export const GET = withTryCatch(async () => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const brands = await prisma.brand.findMany({
    where: { storeId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(brands);
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const body = await parseBody(req, brandSchema);
  if (body instanceof NextResponse) return body;

  const brand = await prisma.brand.create({
    data: {
      storeId,
      name: body.name,
      nameEn: body.nameEn || null,
      position: body.position || 0,
    },
  });

  return NextResponse.json(brand, { status: 201 });
});
