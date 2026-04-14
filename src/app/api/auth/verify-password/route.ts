import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAuthContext, withTryCatch, parseBody, rateLimit } from "@/lib/api-utils";

const verifyPasswordSchema = z.object({
  password: z.string().min(1),
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const rl = rateLimit(req, { max: 5, window: 60_000, key: "verify-pwd" });
  if (rl) return rl;

  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { userId } = ctx;

  const body = await parseBody(req, verifyPasswordSchema);
  if (body instanceof NextResponse) return body;
  const { password } = body;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) return NextResponse.json({ valid: false });

  const valid = await bcrypt.compare(password, user.passwordHash);
  return NextResponse.json({ valid });
});
