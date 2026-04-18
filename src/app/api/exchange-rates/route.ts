import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, withTryCatch, parseBody } from "@/lib/api-utils";
import prisma from "@/lib/db";

const upsertRateSchema = z.object({
  fromCurrency: z.string().min(1),
  toCurrency: z.string().min(1),
  rate: z.number().positive(),
});

export const GET = withTryCatch(async () => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const rates = await prisma.exchangeRate.findMany({
    where: { storeId },
    orderBy: { fromCurrency: "asc" },
  });

  return NextResponse.json(rates);
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const body = await parseBody(req, upsertRateSchema);
  if (body instanceof NextResponse) return body;

  const rate = await prisma.exchangeRate.upsert({
    where: {
      storeId_fromCurrency_toCurrency: {
        storeId,
        fromCurrency: body.fromCurrency,
        toCurrency: body.toCurrency,
      },
    },
    update: { rate: body.rate },
    create: {
      storeId,
      fromCurrency: body.fromCurrency,
      toCurrency: body.toCurrency,
      rate: body.rate,
    },
  });

  return NextResponse.json(rate);
});
