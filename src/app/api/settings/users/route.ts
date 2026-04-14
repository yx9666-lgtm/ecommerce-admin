import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getAuthContext, parseBody, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";

// ─── GET: list users belonging to the current store ─────────────────────────

export const GET = withTryCatch(async () => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
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
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["SUPER_ADMIN", "STORE_ADMIN", "OPERATOR", "CUSTOMER_SERVICE", "FINANCE"]),
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const body = await parseBody(req, createUserSchema);
  if (body instanceof NextResponse) return body;

  // Check uniqueness
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username: body.username }, { email: body.email }],
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Username or email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.create({
    data: {
      displayName: body.displayName,
      username: body.username,
      email: body.email,
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

  // Link user to the current store
  await prisma.storeUser.create({
    data: { storeId, userId: user.id },
  });

  return NextResponse.json(user, { status: 201 });
});
