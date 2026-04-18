import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const result: {
    status: "ok" | "degraded" | "error";
    db: { status: "ok" | "error"; latency?: number };
    uptime: number;
  } = {
    status: "ok",
    db: { status: "ok" },
    uptime: process.uptime(),
  };

  // Check database
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    result.db = { status: "ok", latency: Date.now() - start };
  } catch {
    result.db = { status: "error" };
    result.status = "degraded";
  }

  const httpStatus = result.status === "ok" ? 200 : 503;
  return NextResponse.json(result, { status: httpStatus });
}
