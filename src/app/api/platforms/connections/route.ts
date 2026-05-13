import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext, assertStoreOwnership, withTryCatch, apiError, parseBody } from "@/lib/api-utils";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const createConnectionSchema = z.object({
  platform: z.enum(["SHOPEE", "LAZADA", "TIKTOK", "PGMALL"]),
  shopName: z.string().optional(),
});

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.platforms.view);
  if (denied) return denied;
  const { storeId } = ctx;

  const connections = await prisma.platformConnection.findMany({
    where: { storeId },
    include: {
      syncLogs: {
        orderBy: { startedAt: "desc" },
        take: 1,
      },
      _count: {
        select: { syncLogs: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Batch: get counts per platform in 2 queries instead of 2*N
  const platforms = Array.from(new Set(connections.map((c) => c.platform)));

  const [listingCounts, orderCounts] = await Promise.all([
    platforms.length > 0
      ? prisma.platformListing.groupBy({
          by: ["platform"],
          where: { platform: { in: platforms }, product: { storeId } },
          _count: { id: true },
        })
      : [],
    platforms.length > 0
      ? prisma.order.groupBy({
          by: ["platform"],
          where: { storeId, platform: { in: platforms as any } },
          _count: { id: true },
        })
      : [],
  ]);

  const listingCountMap: Record<string, number> = {};
  (listingCounts as any[]).forEach((g) => { listingCountMap[g.platform] = g._count.id; });
  const orderCountMap: Record<string, number> = {};
  (orderCounts as any[]).forEach((g) => { if (g.platform) orderCountMap[g.platform] = g._count.id; });

  const enriched = connections.map((conn) => {
    let tokenStatus: "active" | "token_expiring" | "expired" | "no_token" = "no_token";
    if (conn.accessToken) {
      if (!conn.tokenExpiresAt) {
        tokenStatus = "active";
      } else {
        const hoursUntilExpiry = (conn.tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntilExpiry <= 0) tokenStatus = "expired";
        else if (hoursUntilExpiry <= 72) tokenStatus = "token_expiring";
        else tokenStatus = "active";
      }
    } else if (conn.isActive) {
      tokenStatus = "active";
    }

    return {
      ...conn,
      accessToken: conn.accessToken ? "***" : null,
      refreshToken: conn.refreshToken ? "***" : null,
      productCount: listingCountMap[conn.platform] || 0,
      orderCount: orderCountMap[conn.platform] || 0,
      tokenStatus,
      hasToken: !!conn.accessToken,
    };
  });

  return NextResponse.json({ connections: enriched });
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.platforms.create);
  if (denied) return denied;
  const { storeId } = ctx;

  const body = await parseBody(req, createConnectionSchema);
  if (body instanceof NextResponse) return body;
  const { platform, shopName } = body;

  if (!platform) return apiError("Platform is required", 400);

  const validPlatforms = ["SHOPEE", "LAZADA", "TIKTOK", "PGMALL"];
  if (!validPlatforms.includes(platform)) {
    return apiError("Invalid platform", 400);
  }

  const existing = await prisma.platformConnection.findFirst({
    where: { storeId, platform, isActive: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Platform already connected", connectionId: existing.id }, { status: 409 });
  }

  const connection = await prisma.platformConnection.create({
    data: {
      storeId,
      platform,
      shopName: shopName || null,
      isActive: false,
    },
  });

  return NextResponse.json({ connection });
});

export const DELETE = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.platforms.delete);
  if (denied) return denied;
  const { storeId } = ctx;

  const connectionId = req.nextUrl.searchParams.get("id");
  if (!connectionId) return apiError("Connection ID required", 400);

  const connection = await prisma.platformConnection.findUnique({ where: { id: connectionId } });
  if (!connection) return apiError("Connection not found", 404);

  const ownershipError = assertStoreOwnership(connection.storeId, storeId);
  if (ownershipError) return ownershipError;

  await prisma.platformConnection.update({
    where: { id: connectionId },
    data: {
      isActive: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
    },
  });

  return NextResponse.json({ success: true });
});
