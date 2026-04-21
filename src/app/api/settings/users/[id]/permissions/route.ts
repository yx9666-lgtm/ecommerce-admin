import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, parseBody, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";
import { requirePermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions";

const permissionsSchema = z.object({
  permissions: z.record(z.string(), z.boolean()),
});

export const GET = withTryCatch(async (_req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;

  const denied = requirePermission(ctx, PERMISSIONS.settings.view);
  if (denied) return denied;

  const storeUser = await prisma.storeUser.findFirst({
    where: { userId: id, storeId: ctx.storeId },
    select: { permissions: true },
  });

  if (!storeUser) {
    return NextResponse.json({ error: "User not found in this store" }, { status: 404 });
  }

  return NextResponse.json({
    permissions: (storeUser.permissions as Record<string, boolean>) || {},
  });
});

export const PUT = withTryCatch(async (req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;

  const denied = requirePermission(ctx, PERMISSIONS.settings.edit);
  if (denied) return denied;

  // Cannot modify own permissions
  if (id === ctx.userId) {
    return NextResponse.json({ error: "Cannot modify own permissions" }, { status: 403 });
  }

  // Cannot modify SUPER_ADMIN
  const targetUser = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (targetUser.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot modify SUPER_ADMIN permissions" }, { status: 403 });
  }

  const body = await parseBody(req, permissionsSchema);
  if (body instanceof NextResponse) return body;

  // Validate all keys
  const invalidKeys = Object.keys(body.permissions).filter(
    (k) => !ALL_PERMISSION_KEYS.includes(k)
  );
  if (invalidKeys.length > 0) {
    return NextResponse.json(
      { error: `Invalid permission keys: ${invalidKeys.join(", ")}` },
      { status: 400 }
    );
  }

  // Ensure user belongs to this store
  const storeUser = await prisma.storeUser.findUnique({
    where: { storeId_userId: { storeId: ctx.storeId, userId: id } },
  });
  if (!storeUser) {
    return NextResponse.json({ error: "User not found in this store" }, { status: 404 });
  }

  await prisma.storeUser.update({
    where: { id: storeUser.id },
    data: { permissions: body.permissions },
  });

  return NextResponse.json({ permissions: body.permissions });
});
