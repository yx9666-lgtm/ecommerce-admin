import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, parseBody, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const notificationPrefsSchema = z.object({
  email: z.boolean().optional(),
  lowStock: z.boolean().optional(),
  newOrder: z.boolean().optional(),
  syncError: z.boolean().optional(),
  refund: z.boolean().optional(),
});

const defaultPrefs = {
  email: true,
  lowStock: true,
  newOrder: true,
  syncError: true,
  refund: false,
};

export const GET = withTryCatch(async () => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.settings.view);
  if (denied) return denied;
  const { storeId } = ctx;

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { notificationPrefs: true },
  });

  const prefs = (store?.notificationPrefs as Record<string, boolean>) || defaultPrefs;
  return NextResponse.json({ ...defaultPrefs, ...prefs });
});

export const PUT = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.settings.edit);
  if (denied) return denied;
  const { storeId } = ctx;

  const body = await parseBody(req, notificationPrefsSchema);
  if (body instanceof NextResponse) return body;

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { notificationPrefs: true },
  });

  const existing = (store?.notificationPrefs as Record<string, boolean>) || defaultPrefs;
  const merged = { ...defaultPrefs, ...existing, ...body };

  await prisma.store.update({
    where: { id: storeId },
    data: { notificationPrefs: merged },
  });

  return NextResponse.json(merged);
});
