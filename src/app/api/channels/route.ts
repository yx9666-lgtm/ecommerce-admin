import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext, assertStoreOwnership, withTryCatch, apiError, parseBody } from "@/lib/api-utils";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const createChannelSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  type: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  shopName: z.string().optional(),
  shopUsername: z.string().optional(),
  shopUrl: z.string().optional(),
  notes: z.string().optional(),
});

const updateChannelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  shopName: z.string().optional(),
  shopUsername: z.string().optional(),
  shopUrl: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.platforms.view);
  if (denied) return denied;
  const { storeId } = ctx;

  const channels = await prisma.channel.findMany({
    where: { storeId },
    include: {
      _count: { select: { orders: true, channelInventory: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ items: channels });
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.platforms.create);
  if (denied) return denied;
  const { storeId } = ctx;

  const body = await parseBody(req, createChannelSchema);
  if (body instanceof NextResponse) return body;
  const {
    name,
    code,
    type,
    icon,
    color,
    shopName,
    shopUsername,
    shopUrl,
    notes,
  } = body;

  if (!name || !code) {
    return apiError("name and code are required", 400);
  }

  const existing = await prisma.channel.findUnique({
    where: { storeId_code: { storeId, code: code.toUpperCase() } },
  });
  if (existing) {
    return apiError("Channel code already exists", 409);
  }

  const channel = await prisma.channel.create({
    data: {
      storeId,
      name,
      code: code.toUpperCase(),
      type: type || "marketplace",
      icon: icon || name.charAt(0).toUpperCase(),
      color: color || "#6b7280",
      shopName,
      shopUsername,
      shopUrl,
      notes,
    },
  });

  return NextResponse.json(channel, { status: 201 });
});

export const PUT = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.platforms.edit);
  if (denied) return denied;
  const { storeId } = ctx;

  const body = await parseBody(req, updateChannelSchema);
  if (body instanceof NextResponse) return body;
  const { id, name, icon, color, shopName, shopUsername, shopUrl, notes, isActive } = body;

  if (!id) {
    return apiError("id is required", 400);
  }

  // IDOR check
  const existing = await prisma.channel.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  const channel = await prisma.channel.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(icon !== undefined && { icon }),
      ...(color !== undefined && { color }),
      ...(shopName !== undefined && { shopName }),
      ...(shopUsername !== undefined && { shopUsername }),
      ...(shopUrl !== undefined && { shopUrl }),
      ...(notes !== undefined && { notes }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(channel);
});

export const DELETE = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.platforms.delete);
  if (denied) return denied;
  const { storeId } = ctx;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return apiError("id is required", 400);
  }

  // IDOR check
  const existing = await prisma.channel.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  await prisma.channel.delete({ where: { id } });

  return NextResponse.json({ success: true });
});
