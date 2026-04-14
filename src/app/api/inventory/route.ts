import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const search = searchParams.get("search") || "";

  const productWhere: any = { storeId };
  if (search) {
    productWhere.OR = [
      { sku: { contains: search, mode: "insensitive" } },
      { nameZh: { contains: search, mode: "insensitive" } },
      { nameEn: { contains: search, mode: "insensitive" } },
    ];
  }

  // Paginated products + stats + movements + warehouses in parallel
  const [products, total, actions, warehouses, lowStockRaw] = await Promise.all([
    prisma.product.findMany({
      where: productWhere,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        images: {
          orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          take: 1,
          select: { url: true },
        },
        variants: {
          select: {
            id: true,
            channelInventory: {
              select: { allocated: true },
            },
          },
        },
      },
    }),
    prisma.product.count({ where: productWhere }),
    prisma.inventoryAction.findMany({
      where: { warehouse: { storeId } },
      include: { warehouse: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.warehouse.findMany({ where: { storeId } }),
    // Count products with low stock (totalStock < 50)
    prisma.product.count({
      where: { storeId, totalStock: { lt: 50 } },
    }),
  ]);

  // Only aggregate for current page's SKUs and product IDs
  const skus = products.map((p) => p.sku);
  const productIds = products.map((p) => p.id);

  const [purchaseItems, channelOrderItems, poItemImages] = await Promise.all([
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
          select: { productId: true, sku: true, quantity: true },
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
  channelOrderItems.forEach((item) => {
    if (item.productId) salesByProductId[item.productId] = (salesByProductId[item.productId] || 0) + item.quantity;
    if (item.sku) salesBySku[item.sku] = (salesBySku[item.sku] || 0) + item.quantity;
  });

  const safetyStock = 50;
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

    let status = "normal";
    if (realStock <= 0) status = "out";
    else if (realStock < safetyStock * 0.3) status = "critical";
    else if (realStock < safetyStock) status = "low";

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
      realStock,
      safetyStock,
      status,
      warehouse: warehouses[0]?.name || "-",
    };
  });

  return NextResponse.json({
    products: stockItems,
    total,
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
    })),
    warehouses: warehouses.map((w) => ({
      id: w.id,
      name: w.name,
      address: w.address || "",
    })),
  });
});
