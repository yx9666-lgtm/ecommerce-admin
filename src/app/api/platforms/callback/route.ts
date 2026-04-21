import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createPlatformAdapter, PlatformType } from "@/lib/platforms";
import { withTryCatch } from "@/lib/api-utils";

// OAuth callback — intentionally unauthenticated
export const GET = withTryCatch(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const shopIdParam = searchParams.get("shop_id");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/platforms?error=missing_params", req.url));
  }

  const [platform, connectionId] = state.split(":");

  const connection = await prisma.platformConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    return NextResponse.redirect(new URL("/platforms?error=invalid_connection", req.url));
  }

  // Verify the platform matches the connection to prevent CSRF
  if (connection.platform.toLowerCase() !== platform.toLowerCase()) {
    return NextResponse.redirect(new URL("/platforms?error=platform_mismatch", req.url));
  }

  const envPrefix = platform.toUpperCase();
  const adapter = createPlatformAdapter(platform as PlatformType, {
    appKey: process.env[`${envPrefix}_APP_KEY`] || process.env[`${envPrefix}_PARTNER_ID`] || "",
    appSecret: process.env[`${envPrefix}_APP_SECRET`] || process.env[`${envPrefix}_PARTNER_KEY`] || "",
    redirectUrl: process.env[`${envPrefix}_REDIRECT_URL`] || "",
  });

  const token = await adapter.authorize(code);

  await prisma.platformConnection.update({
    where: { id: connectionId },
    data: {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      tokenExpiresAt: token.expiresAt,
      shopId: token.shopId || shopIdParam || undefined,
      isActive: true,
    },
  });

  return NextResponse.redirect(new URL("/platforms?success=connected", req.url));
});
