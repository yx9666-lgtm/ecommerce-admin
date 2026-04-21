import { NextResponse } from "next/server";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

// ─── GET: recent login logs for users in the current store ──────────────────

export const GET = withTryCatch(async () => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.settings.view);
  if (denied) return denied;
  const { storeId } = ctx;

  // Get all user IDs linked to this store
  const storeUsers = await prisma.storeUser.findMany({
    where: { storeId },
    select: { userId: true },
  });
  const userIds = storeUsers.map((su) => su.userId);

  if (userIds.length === 0) {
    return NextResponse.json([]);
  }

  const logs = await prisma.loginLog.findMany({
    where: { userId: { in: userIds } },
    include: {
      user: {
        select: { username: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const result = logs.map((log) => ({
    id: log.id,
    time: log.createdAt.toISOString(),
    username: log.user.username,
    success: log.success,
    ip: log.ip,
  }));

  return NextResponse.json(result);
});
