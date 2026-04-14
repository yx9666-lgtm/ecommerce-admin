import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, parseBody, withTryCatch, apiSuccess } from "@/lib/api-utils";
import prisma from "@/lib/db";

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const createPromotionSchema = z.object({
  nameZh: z.string().min(1),
  nameEn: z.string().min(1),
  type: z.string().min(1),
  platform: z.enum(["SHOPEE", "LAZADA", "TIKTOK", "PGMALL"]).nullable().optional(),
  discount: z.number().min(0).max(100).nullable().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  budget: z.number().min(0).nullable().optional(),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeStatus(startDate: Date, endDate: Date): string {
  const now = new Date();
  if (now < startDate) return "scheduled";
  if (now > endDate) return "ended";
  return "active";
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTryCatch(async (_req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const promotions = await prisma.promotion.findMany({
    where: { storeId },
    orderBy: { startDate: "desc" },
  });

  const items = promotions.map((p) => ({
    ...p,
    status: computeStatus(new Date(p.startDate), new Date(p.endDate)),
  }));

  const activeCount = items.filter((p) => p.status === "active").length;
  const totalBudget = items.reduce((s, p) => s + (p.budget ?? 0), 0);
  const totalSpent = items.reduce((s, p) => s + p.spent, 0);

  return apiSuccess({ items, activeCount, totalBudget, totalSpent });
});

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const body = await parseBody(req, createPromotionSchema);
  if (body instanceof NextResponse) return body;

  const promotion = await prisma.promotion.create({
    data: {
      storeId,
      nameZh: body.nameZh,
      nameEn: body.nameEn,
      type: body.type,
      platform: body.platform ?? null,
      discount: body.discount ?? null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      budget: body.budget ?? null,
    },
  });

  return apiSuccess(promotion, 201);
});
