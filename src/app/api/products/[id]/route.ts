import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";

const syncOnlyResponse = {
  error: "Product updates and deletions are synchronized from Purchasing only.",
  code: "PRODUCT_SYNCED_FROM_PURCHASING_ONLY",
};

export const PUT = withTryCatch(async (_req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  return NextResponse.json(syncOnlyResponse, { status: 403 });
});

export const DELETE = withTryCatch(async (_req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  return NextResponse.json(syncOnlyResponse, { status: 403 });
});
