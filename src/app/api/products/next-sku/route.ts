import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { buildSkuFromSerial, extractSerialNo, normalizeSkuConfig } from "@/lib/sku-config";

export const GET = withTryCatch(async (_req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.products.view);
  if (denied) return denied;
  const { storeId } = ctx;

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { skuPrefix: true, skuStartNo: true, notificationPrefs: true },
  });

  const notificationPrefs =
    store?.notificationPrefs && typeof store.notificationPrefs === "object" && !Array.isArray(store.notificationPrefs)
      ? (store.notificationPrefs as Record<string, unknown>)
      : {};
  const skuConfig = normalizeSkuConfig(notificationPrefs.skuConfig, store?.skuPrefix, store?.skuStartNo);

  const products = await prisma.product.findMany({
    where: { storeId },
    select: { sku: true },
  });

  let maxSerial = -1;
  for (const product of products) {
    const serial = extractSerialNo(skuConfig, product.sku);
    if (serial !== null) {
      maxSerial = Math.max(maxSerial, serial);
    }
  }

  const startSerial = parseInt(skuConfig.serialStartNo, 10);
  const nextSerial = maxSerial >= 0 ? maxSerial + 1 : (Number.isNaN(startSerial) ? 1001 : startSerial);
  const sku = buildSkuFromSerial(skuConfig, nextSerial);

  return NextResponse.json({
    sku,
    nextSerial,
    skuConfig,
  });
});
