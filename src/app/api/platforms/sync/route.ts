import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { createPlatformAdapter, PlatformType } from "@/lib/platforms";
import { ShopeeAdapter } from "@/lib/platforms/shopee";
import { getAuthContext, assertStoreOwnership, withTryCatch, parseBody } from "@/lib/api-utils";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";

const syncSchema = z.object({
  connectionId: z.string().min(1),
  syncType: z.enum(["orders", "products", "full_sync"]).optional(),
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;

  const denied = requirePermission(ctx, PERMISSIONS.platforms.edit);
  if (denied) return denied;

  const { storeId } = ctx;

  const body = await parseBody(req, syncSchema);
  if (body instanceof NextResponse) return body;
  const { connectionId, syncType } = body;

  const connection = await prisma.platformConnection.findUnique({
    where: { id: connectionId },
    include: { store: true },
  });

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  // IDOR check: verify connection belongs to this store
  const ownershipError = assertStoreOwnership(connection.storeId, storeId);
  if (ownershipError) return ownershipError;

  const syncLog = await prisma.syncLog.create({
    data: {
      connectionId: connection.id,
      action: syncType || "full_sync",
      status: "running",
      startedAt: new Date(),
    },
  });

  if (!connection.accessToken || !connection.refreshToken) {
    const [orderCount, productCount] = await Promise.all([
      prisma.order.count({ where: { storeId: connection.storeId, platform: connection.platform } }),
      prisma.platformListing.count({ where: { platform: connection.platform } }),
    ]);

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "success",
        itemCount: orderCount + productCount,
        completedAt: new Date(),
      },
    });

    await prisma.platformConnection.update({
      where: { id: connectionId },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      itemCount: orderCount + productCount,
      mode: "local",
    });
  }

  try {
    const envPrefix = connection.platform;
    const adapter = createPlatformAdapter(connection.platform as PlatformType, {
      appKey: process.env[`${envPrefix}_APP_KEY`] || process.env[`${envPrefix}_PARTNER_ID`] || "",
      appSecret: process.env[`${envPrefix}_APP_SECRET`] || process.env[`${envPrefix}_PARTNER_KEY`] || "",
      redirectUrl: process.env[`${envPrefix}_REDIRECT_URL`] || "",
    });

    if (connection.shopId && adapter instanceof ShopeeAdapter) {
      adapter.setShopId(connection.shopId);
    }

    adapter.setToken({
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      expiresAt: connection.tokenExpiresAt || new Date(),
    });

    let itemCount = 0;

    if (syncType === "orders" || syncType === "full_sync") {
      const result = await adapter.getOrders({ pageSize: 50 });
      for (const order of result.items) {
        const existing = await prisma.order.findFirst({
          where: {
            storeId: connection.storeId,
            platform: connection.platform,
            platformOrderId: order.platformOrderId,
          },
        });
        if (existing) {
          await prisma.order.update({
            where: { id: existing.id },
            data: {
              status: mapOrderStatus(order.status),
              totalAmount: order.totalAmount,
            },
          });
        } else {
          await prisma.order.create({
            data: {
              storeId: connection.storeId,
              platform: connection.platform,
              platformOrderId: order.platformOrderId,
              status: mapOrderStatus(order.status),
              subtotal: order.subtotal,
              shippingFee: order.shippingFee,
              discount: order.discount,
              totalAmount: order.totalAmount,
              currency: order.currency,
              platformFee: order.platformFee,
              commissionFee: order.commissionFee,
              shippingAddress: order.shippingAddress as any,
              createdAt: order.createdAt,
              paidAt: order.paidAt,
            },
          });
        }
        itemCount++;
      }
    }

    if (syncType === "products" || syncType === "full_sync") {
      const result = await adapter.getProducts({ pageSize: 50 });
      for (const product of result.items) {
        const existingListing = await prisma.platformListing.findFirst({
          where: {
            platform: connection.platform,
            platformItemId: product.platformItemId,
          },
        });

        if (existingListing) {
          await prisma.platformListing.update({
            where: { id: existingListing.id },
            data: {
              status: product.status,
              url: product.url,
              lastSyncAt: new Date(),
            },
          });
        }
        itemCount++;
      }
    }

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "success", itemCount, completedAt: new Date() },
    });

    await prisma.platformConnection.update({
      where: { id: connectionId },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({ success: true, itemCount });
  } catch (error: any) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { status: "error", errorMessage: error.message, completedAt: new Date() },
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

function mapOrderStatus(platformStatus: string): any {
  const statusMap: Record<string, string> = {
    READY_TO_SHIP: "PENDING_SHIPMENT",
    SHIPPED: "SHIPPED",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    IN_CANCEL: "CANCELLED",
    UNPAID: "PENDING_PAYMENT",
    NORMAL: "PENDING_SHIPMENT",
    PROCESSED: "PENDING_SHIPMENT",
  };
  return statusMap[platformStatus] || "PENDING_PAYMENT";
}
