import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

function normalizeStockStatusThresholds(input: unknown, fallbackLow: number) {
  const safeFallbackLow = Math.max(0, Number.isFinite(fallbackLow) ? Math.floor(fallbackLow) : 10);
  let low = safeFallbackLow;
  let critical = safeFallbackLow > 0 ? Math.max(0, Math.floor(safeFallbackLow * 0.3)) : 0;
  let out = 0;

  if (input && typeof input === "object" && !Array.isArray(input)) {
    const raw = input as Record<string, unknown>;
    const toInt = (value: unknown, fallback: number) => {
      if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
      if (typeof value === "string" && /^\d+$/.test(value)) return parseInt(value, 10);
      return fallback;
    };
    low = Math.max(0, toInt(raw.low, low));
    critical = Math.max(0, toInt(raw.critical, critical));
    out = Math.max(0, toInt(raw.out, out));
  }

  if (critical > low) critical = low;
  if (out > critical) out = critical;

  return { low, critical, out };
}

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.inventory.tableView);
  if (denied) return denied;
  const { storeId } = ctx;
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { lowStockThreshold: true, notificationPrefs: true },
  });
  const notificationPrefs =
    store?.notificationPrefs && typeof store.notificationPrefs === "object" && !Array.isArray(store.notificationPrefs)
      ? (store.notificationPrefs as Record<string, unknown>)
      : {};
  const stockThresholds = normalizeStockStatusThresholds(
    notificationPrefs.stockStatusThresholds,
    store?.lowStockThreshold ?? 10
  );

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const search = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "all";
  const validStatusFilters = new Set(["all", "normal", "low", "critical", "out"]);
  const normalizedStatusFilter = validStatusFilters.has(statusFilter) ? statusFilter : "all";
  const shouldFilterByStatus = normalizedStatusFilter !== "all";

  const productWhere: any = { storeId };
  if (search) {
    productWhere.OR = [
      { sku: { contains: search, mode: "insensitive" } },
      { nameZh: { contains: search, mode: "insensitive" } },
      { nameEn: { contains: search, mode: "insensitive" } },
    ];
  }

  const channels = await prisma.channel.findMany({
    where: { storeId, isActive: true },
    select: { id: true, name: true, code: true, color: true },
    orderBy: { createdAt: "asc" },
  });
  const channelIds = channels.map((c) => c.id);

  // Product page + stats + movements + warehouses in parallel
  const [products, total, actions, warehouses, lowStockRaw] = await Promise.all([
    prisma.product.findMany({
      where: productWhere,
      orderBy: { sku: "asc" },
      ...(shouldFilterByStatus
        ? {}
        : {
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
      include: {
        images: {
          orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          take: 1,
          select: { url: true },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            channelInventory: {
              select: { channelId: true, allocated: true },
            },
          },
        },
      },
    }),
    shouldFilterByStatus ? Promise.resolve(0) : prisma.product.count({ where: productWhere }),
    prisma.inventoryAction.findMany({
      where: { warehouse: { storeId } },
      include: { warehouse: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.warehouse.findMany({ where: { storeId } }),
    // Count products with low stock using store setting threshold
    prisma.product.count({
      where: { storeId, totalStock: { lt: stockThresholds.low } },
    }),
  ]);

  // Only aggregate for current page's SKUs and product IDs
  const skus = products.map((p) => p.sku);
  const actionSkus = actions.map((a) => a.variantSku).filter((sku): sku is string => Boolean(sku));
  const relevantSkus = Array.from(new Set([...skus, ...actionSkus]));
  const productIds = products.map((p) => p.id);

  const [purchaseItems, channelOrderItems, poItemImages, channelOrderItemsBySku, channelAllocationRows] = await Promise.all([
    skus.length > 0
      ? prisma.purchaseOrderItem.findMany({
          where: {
            purchaseOrder: { storeId, status: { not: "CANCELLED" } },
            sku: { in: skus },
          },
          select: { sku: true, quantity: true },
        })
      : [],
    productIds.length > 0
      ? prisma.orderItem.findMany({
          where: {
            order: {
              storeId,
              status: { in: ["COMPLETED", "SHIPPED", "DELIVERED", "PENDING_SHIPMENT"] },
            },
            OR: [
              { productId: { in: productIds } },
              { sku: { in: skus } },
            ],
          },
          select: { productId: true, sku: true, quantity: true, order: { select: { channelId: true } } },
        })
      : [],
    skus.length > 0
      ? prisma.purchaseOrderItem.findMany({
          where: {
            purchaseOrder: { storeId },
            sku: { in: skus },
          },
          select: { sku: true, images: true },
          orderBy: { purchaseOrder: { createdAt: "desc" } },
        })
      : [],
    relevantSkus.length > 0
      ? prisma.orderItem.findMany({
          where: {
            order: {
              storeId,
              channelId: { not: null },
              status: { in: ["COMPLETED", "SHIPPED", "DELIVERED", "PENDING_SHIPMENT"] },
            },
            sku: { in: relevantSkus },
          },
          select: { sku: true, quantity: true, order: { select: { channelId: true } } },
        })
      : [],
    relevantSkus.length > 0 && channelIds.length > 0
      ? prisma.channelInventory.findMany({
          where: {
            channelId: { in: channelIds },
            variant: { product: { storeId }, sku: { in: relevantSkus } },
          },
          select: {
            channelId: true,
            allocated: true,
            variant: { select: { sku: true } },
          },
        })
      : [],
  ]);

  const poImageMap: Record<string, string[]> = {};
  poItemImages.forEach((item) => {
    if (item.sku && item.images.length > 0 && !poImageMap[item.sku]) {
      poImageMap[item.sku] = item.images;
    }
  });

  const purchaseMap: Record<string, number> = {};
  purchaseItems.forEach((item) => {
    if (item.sku) purchaseMap[item.sku] = (purchaseMap[item.sku] || 0) + item.quantity;
  });

  // Build sales map by both productId and SKU
  const salesByProductId: Record<string, number> = {};
  const salesBySku: Record<string, number> = {};
  const salesByProductIdChannel: Record<string, Record<string, number>> = {};
  const salesBySkuChannel: Record<string, Record<string, number>> = {};
  channelOrderItems.forEach((item) => {
    const chId = item.order.channelId;
    if (item.productId) salesByProductId[item.productId] = (salesByProductId[item.productId] || 0) + item.quantity;
    if (item.sku) salesBySku[item.sku] = (salesBySku[item.sku] || 0) + item.quantity;
    if (item.productId && chId) {
      if (!salesByProductIdChannel[item.productId]) salesByProductIdChannel[item.productId] = {};
      salesByProductIdChannel[item.productId][chId] = (salesByProductIdChannel[item.productId][chId] || 0) + item.quantity;
    }
    if (item.sku && chId) {
      if (!salesBySkuChannel[item.sku]) salesBySkuChannel[item.sku] = {};
      salesBySkuChannel[item.sku][chId] = (salesBySkuChannel[item.sku][chId] || 0) + item.quantity;
    }
  });

  const salesBySkuChannelForMovements: Record<string, Record<string, number>> = {};
  channelOrderItemsBySku.forEach((item) => {
    const chId = item.order.channelId;
    if (!item.sku || !chId) return;
    if (!salesBySkuChannelForMovements[item.sku]) salesBySkuChannelForMovements[item.sku] = {};
    salesBySkuChannelForMovements[item.sku][chId] =
      (salesBySkuChannelForMovements[item.sku][chId] || 0) + item.quantity;
  });

  const allocatedBySkuChannel: Record<string, Record<string, number>> = {};
  channelAllocationRows.forEach((row) => {
    const sku = row.variant.sku;
    if (!sku) return;
    if (!allocatedBySkuChannel[sku]) allocatedBySkuChannel[sku] = {};
    allocatedBySkuChannel[sku][row.channelId] = (allocatedBySkuChannel[sku][row.channelId] || 0) + row.allocated;
  });

  const stockItems = products.map((p) => {
    const purchaseQty = purchaseMap[p.sku] || 0;
    const channelAllocated = p.variants.reduce(
      (sum, v) => sum + v.channelInventory.reduce((s, ci) => s + ci.allocated, 0),
      0
    );
    const channelSales = salesByProductId[p.id] || salesBySku[p.sku] || 0;
    const stock = purchaseQty - channelAllocated;
    const channelStock = Math.max(0, channelAllocated - channelSales);
    const realStock = purchaseQty - channelSales;
    const salesChannelMap = salesByProductIdChannel[p.id] || salesBySkuChannel[p.sku] || {};
    const channelStockByChannel: Record<string, number> = {};
    for (const ch of channels) {
      const allocated = allocatedBySkuChannel[p.sku]?.[ch.id] || 0;
      const sold = salesChannelMap[ch.id] || 0;
      channelStockByChannel[ch.id] = Math.max(0, allocated - sold);
    }

    let status = "normal";
    if (realStock <= stockThresholds.out) status = "out";
    else if (realStock <= stockThresholds.critical) status = "critical";
    else if (realStock < stockThresholds.low) status = "low";

    return {
      id: p.id,
      sku: p.sku,
      name: p.nameEn || p.nameZh,
      nameZh: p.nameZh,
      image: (poImageMap[p.sku]?.[0]) || p.images[0]?.url || null,
      allImages: poImageMap[p.sku] || p.images.map((i: any) => i.url) || [],
      stock,
      purchaseQty,
      channelAllocated,
      channelSales,
      channelStock,
      channelStockByChannel,
      realStock,
      safetyStock: stockThresholds.low,
      status,
      warehouse: warehouses[0]?.name || "-",
    };
  });

  let finalProducts = stockItems;
  if (shouldFilterByStatus) {
    finalProducts = stockItems.filter((item) => item.status === normalizedStatusFilter);
  }

  const finalTotal = shouldFilterByStatus ? finalProducts.length : total;
  if (shouldFilterByStatus) {
    const start = (page - 1) * pageSize;
    finalProducts = finalProducts.slice(start, start + pageSize);
  }

  return NextResponse.json({
    products: finalProducts,
    total: finalTotal,
    page,
    pageSize,
    lowStockCount: lowStockRaw,
    actions: actions.map((a) => ({
      id: a.id,
      type: a.type,
      sku: a.variantSku,
      quantity: a.quantity,
      warehouse: a.warehouse.name,
      operator: a.operator || "System",
      note: a.note || "",
      date: a.createdAt,
      channelStockByChannel: channels.reduce<Record<string, number>>((acc, ch) => {
        const sku = a.variantSku || "";
        const allocated = (allocatedBySkuChannel[sku]?.[ch.id] || 0);
        const sold = (salesBySkuChannelForMovements[sku]?.[ch.id] || 0);
        acc[ch.id] = Math.max(0, allocated - sold);
        return acc;
      }, {}),
    })),
    channels,
    warehouses: warehouses.map((w) => ({
      id: w.id,
      name: w.name,
      address: w.address || "",
    })),
  });
});
