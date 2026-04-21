import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getAuthContext, parseBody, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";

// ─── GET: list users belonging to the current store ─────────────────────────

export const GET = withTryCatch(async () => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.settings.view);
  if (denied) return denied;
  const { storeId } = ctx;

  const storeUsers = await prisma.storeUser.findMany({
    where: { storeId },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
        },
      },
    },
  });

  const users = storeUsers.map((su) => su.user);

  return NextResponse.json(users);
});

// ─── POST: create a new user and link to the current store ──────────────────

const createUserSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email").optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["SUPER_ADMIN", "STORE_ADMIN", "OPERATOR", "CUSTOMER_SERVICE", "FINANCE"]),
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.settings.create);
  if (denied) return denied;
  const { storeId, role } = ctx;

  // Only SUPER_ADMIN and STORE_ADMIN can create users
  if (role !== "SUPER_ADMIN" && role !== "STORE_ADMIN") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await parseBody(req, createUserSchema);
  if (body instanceof NextResponse) return body;

  // Non-SUPER_ADMIN cannot create SUPER_ADMIN users
  if (body.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot create SUPER_ADMIN user" }, { status: 403 });
  }

  // Check uniqueness
  const orConditions: any[] = [{ username: body.username }];
  if (body.email) {
    orConditions.push({ email: body.email });
  }
  const existing = await prisma.user.findFirst({
    where: { OR: orConditions },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Username or email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const email = body.email || `${body.username}@local`;

  const user = await prisma.user.create({
    data: {
      displayName: body.displayName,
      username: body.username,
      email,
      passwordHash,
      role: body.role,
    },
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

  // Link user to the current store with default permissions based on role
  await prisma.storeUser.create({
    data: {
      storeId,
      userId: user.id,
      permissions: DEFAULT_ROLE_PERMISSIONS[body.role] || {},
    },
  });

  return NextResponse.json(user, { status: 201 });
});
