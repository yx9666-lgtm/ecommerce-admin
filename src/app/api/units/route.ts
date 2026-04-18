import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, withTryCatch, parseBody } from "@/lib/api-utils";
import prisma from "@/lib/db";

const unitSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  symbol: z.string().optional(),
});

export const GET = withTryCatch(async () => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const units = await prisma.unitOfMeasure.findMany({
    where: { storeId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(units);
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const body = await parseBody(req, unitSchema);
  if (body instanceof NextResponse) return body;

  const unit = await prisma.unitOfMeasure.create({
    data: {
      storeId,
      name: body.name,
      nameEn: body.nameEn || null,
      symbol: body.symbol || null,
    },
  });

  return NextResponse.json(unit, { status: 201 });
});
