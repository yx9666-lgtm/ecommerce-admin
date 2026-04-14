import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, parseBody, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";

// ─── GET: return current store info ─────────────────────────────────────────

export const GET = withTryCatch(async () => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      currency: true,
      timezone: true,
      description: true,
    },
  });

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  return NextResponse.json(store);
});

// ─── PUT: update store settings ─────────────────────────────────────────────

const updateStoreSchema = z.object({
  name: z.string().min(1).optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  description: z.string().nullable().optional(),
});

export const PUT = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const body = await parseBody(req, updateStoreSchema);
  if (body instanceof NextResponse) return body;

  const store = await prisma.store.update({
    where: { id: storeId },
    data: body,
    select: {
      id: true,
      name: true,
      currency: true,
      timezone: true,
      description: true,
    },
  });

  return NextResponse.json(store);
});
