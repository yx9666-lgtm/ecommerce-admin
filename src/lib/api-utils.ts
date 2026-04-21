import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import logger from "@/lib/logger";
import prisma from "@/lib/db";
import type { PermissionMap } from "@/lib/permissions";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuthContext = {
  session: { user: { id: string; role: string; username: string; stores: { id: string; name: string }[] } };
  storeId: string;
  userId: string;
  role: string;
  permissions: PermissionMap;
};

// ─── Auth Context ────────────────────────────────────────────────────────────

/**
 * Get authenticated session and extract storeId from the JWT — never from the client.
 * Supports multi-store: if x-store-id header is provided and matches a user's store, use it.
 * Returns a NextResponse (401/400) on failure, or an AuthContext on success.
 */
export async function getAuthContext(req?: NextRequest): Promise<AuthContext | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stores = session.user.stores || [];
  if (stores.length === 0) {
    return NextResponse.json({ error: "No store associated" }, { status: 400 });
  }

  // Allow store selection via header for multi-store users
  let storeId = stores[0]?.id;
  if (req) {
    const requestedStoreId = req.headers.get("x-store-id");
    if (requestedStoreId && stores.some((s: any) => s.id === requestedStoreId)) {
      storeId = requestedStoreId;
    }
  }

  if (!storeId) {
    return NextResponse.json({ error: "No store associated" }, { status: 400 });
  }

  // Load per-user permissions from StoreUser
  let permissions: PermissionMap = {};
  if (session.user.role !== "SUPER_ADMIN") {
    const storeUser = await prisma.storeUser.findUnique({
      where: { storeId_userId: { storeId, userId: session.user.id } },
      select: { permissions: true },
    });
    permissions = (storeUser?.permissions as PermissionMap) || {};
  }

  return {
    session: session as AuthContext["session"],
    storeId,
    userId: session.user.id,
    role: session.user.role,
    permissions,
  };
}

// ─── IDOR Protection ─────────────────────────────────────────────────────────

/**
 * Verify that a record belongs to the session user's store.
 * Returns a 404 response if the storeId does not match, or null if OK.
 */
export function assertStoreOwnership(
  recordStoreId: string | null | undefined,
  sessionStoreId: string
): NextResponse | null {
  if (!recordStoreId || recordStoreId !== sessionStoreId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

// ─── Try/Catch Wrapper ───────────────────────────────────────────────────────

type RouteHandler = (
  req: NextRequest,
  ctx?: { params: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Wraps a route handler with try/catch.
 * On error: logs to console, returns a safe 500 response (no stack trace leak).
 */
export function withTryCatch(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      logger.error({ err, method: req.method, path: req.nextUrl.pathname }, "API error");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

// ─── Rate Limiter ────────────────────────────────────────────────────────────

const rateLimitStore = new Map<string, number[]>();
let cleanupCounter = 0;

/**
 * Simple in-memory sliding-window rate limiter.
 * Returns a 429 response if the limit is exceeded, or null if OK.
 */
export function rateLimit(
  req: NextRequest,
  opts?: { window?: number; max?: number; key?: string }
): NextResponse | null {
  const window = opts?.window ?? 60_000; // default 60s
  const max = opts?.max ?? 60; // default 60 requests per window
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const key = opts?.key ? `${opts.key}:${ip}` : ip;

  const now = Date.now();
  const timestamps = rateLimitStore.get(key) ?? [];
  const valid = timestamps.filter((t) => now - t < window);
  valid.push(now);
  rateLimitStore.set(key, valid);

  // Periodic cleanup to prevent memory growth
  cleanupCounter++;
  if (cleanupCounter >= 500) {
    cleanupCounter = 0;
    const cutoff = now - window * 2;
    rateLimitStore.forEach((v, k) => {
      const filtered = v.filter((t: number) => t > cutoff);
      if (filtered.length === 0) rateLimitStore.delete(k);
      else rateLimitStore.set(k, filtered);
    });
    // Hard cap on map size
    if (rateLimitStore.size > 10_000) rateLimitStore.clear();
  }

  if (valid.length > max) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(window / 1000)) } }
    );
  }

  return null;
}

// ─── Zod Body Parser ─────────────────────────────────────────────────────────

/**
 * Parse and validate request body with a Zod schema.
 * Returns the validated data or a 400 response with error details.
 */
export async function parseBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<T | NextResponse> {
  try {
    const raw = await req.json();
    return schema.parse(raw);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: e.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

// ─── Response Helpers ────────────────────────────────────────────────────────

export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess(data: unknown, status: number = 200) {
  return NextResponse.json(data, { status });
}
