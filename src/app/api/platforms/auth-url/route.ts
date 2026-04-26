import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createPlatformAdapter, PlatformType } from "@/lib/platforms";
import { getAuthContext, assertStoreOwnership, withTryCatch } from "@/lib/api-utils";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;

  const denied = requirePermission(ctx, PERMISSIONS.platforms.edit);
  if (denied) return denied;

  const { storeId } = ctx;

  const body = await req.json();
  const { connectionId, mode } = body;

  if (!connectionId) {
    return NextResponse.json({ error: "Connection ID required" }, { status: 400 });
  }

  const connection = await prisma.platformConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const ownershipError = assertStoreOwnership(connection.storeId, storeId);
  if (ownershipError) return ownershipError;

  const envPrefix = connection.platform;
  const appKey = process.env[`${envPrefix}_APP_KEY`] || process.env[`${envPrefix}_PARTNER_ID`] || "";
  const appSecret = process.env[`${envPrefix}_APP_SECRET`] || process.env[`${envPrefix}_PARTNER_KEY`] || "";
  const redirectUrl = process.env[`${envPrefix}_REDIRECT_URL`] || `${process.env.NEXTAUTH_URL}/api/platforms/callback`;

  if (!appKey || !appSecret || mode === "direct") {
    await prisma.platformConnection.update({
      where: { id: connectionId },
      data: {
        isActive: true,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
      },
    });

    return NextResponse.json({
      directConnect: true,
      message: "Connected in direct mode (no OAuth)",
    });
  }

  const adapter = createPlatformAdapter(connection.platform as PlatformType, {
    appKey,
    appSecret,
    redirectUrl,
  });

  const state = `${connection.platform.toLowerCase()}:${connection.id}`;
  const authUrl = adapter.getAuthUrl(state);

  return NextResponse.json({ authUrl });
});
