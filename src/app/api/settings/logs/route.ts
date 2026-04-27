import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

// ─── GET: recent login logs for users in the current store ──────────────────

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.settings.tableView);
  if (denied) return denied;
  const { storeId } = ctx;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20);

  // Get all user IDs linked to this store
  const storeUsers = await prisma.storeUser.findMany({
    where: { storeId },
    select: { userId: true },
  });
  const userIds = storeUsers.map((su) => su.userId);

  if (userIds.length === 0) {
    return NextResponse.json({ items: [], total: 0, page, pageSize });
  }

  const [logs, total] = await Promise.all([
    prisma.loginLog.findMany({
      where: { userId: { in: userIds } },
      include: {
        user: {
          select: { username: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.loginLog.count({
      where: { userId: { in: userIds } },
    }),
  ]);

  const result = logs.map((log) => ({
    id: log.id,
    time: log.createdAt.toISOString(),
    username: log.user.username,
    success: log.success,
    ip: log.ip,
  }));

  return NextResponse.json({ items: result, total, page, pageSize });
});
