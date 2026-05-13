import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getAuthContext, parseBody, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const updateUserSchema = z.object({
  displayName: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["SUPER_ADMIN", "STORE_ADMIN", "OPERATOR", "CUSTOMER_SERVICE", "FINANCE"]).optional(),
  isActive: z.boolean().optional(),
});

export const PUT = withTryCatch(async (req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.settings.edit);
  if (denied) return denied;
  const { storeId, role } = ctx;

  if (role !== "SUPER_ADMIN" && role !== "STORE_ADMIN") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Verify user belongs to this store
  const storeUser = await prisma.storeUser.findUnique({
    where: { storeId_userId: { storeId, userId: id } },
  });
  if (!storeUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (targetUser.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot modify SUPER_ADMIN user" }, { status: 403 });
  }

  const body = await parseBody(req, updateUserSchema);
  if (body instanceof NextResponse) return body;

  if (body.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot assign SUPER_ADMIN role" }, { status: 403 });
  }

  const data: any = {};
  if (body.displayName !== undefined) data.displayName = body.displayName;
  if (body.username !== undefined) data.username = body.username;
  if (body.email !== undefined) data.email = body.email;
  if (body.role !== undefined) data.role = body.role;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      displayName: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
    },
  });

  return NextResponse.json(user);
});

export const DELETE = withTryCatch(async (_req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.settings.delete);
  if (denied) return denied;
  const { storeId, role, userId } = ctx;

  if (role !== "SUPER_ADMIN" && role !== "STORE_ADMIN") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  if (id === userId) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  // Verify user belongs to this store
  const storeUser = await prisma.storeUser.findUnique({
    where: { storeId_userId: { storeId, userId: id } },
  });
  if (!storeUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (targetUser.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot delete SUPER_ADMIN user" }, { status: 403 });
  }

  // Remove store link and deactivate user
  await prisma.storeUser.delete({
    where: { storeId_userId: { storeId, userId: id } },
  });

  // If user has no more stores, deactivate
  const remainingStores = await prisma.storeUser.count({ where: { userId: id } });
  if (remainingStores === 0) {
    await prisma.user.update({ where: { id }, data: { isActive: false } });
  }

  return NextResponse.json({ success: true });
});
