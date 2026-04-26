import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "fs";
import path from "path";
import { assertStoreOwnership, getAuthContext, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

function imageUrlHasFile(url: string) {
  if (!url) return false;
  let pathname = url;
  try {
    pathname = new URL(url).pathname;
  } catch {
    // keep original relative path
  }

  let filename = "";
  if (pathname.startsWith("/api/upload/")) {
    filename = pathname.slice("/api/upload/".length);
  } else if (pathname.startsWith("/uploads/")) {
    filename = pathname.slice("/uploads/".length);
  } else {
    return true;
  }
  if (!filename) return false;
  const safeName = path.basename(filename);
  return existsSync(path.join(process.cwd(), "public", "uploads", safeName));
}

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.products.tableView);
  if (denied) return denied;
  const { storeId } = ctx;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const fields = searchParams.get("fields");
  const channelId = searchParams.get("channelId");

  const where: any = { storeId };
  if (channelId) {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { storeId: true },
    });
    const ownershipError = assertStoreOwnership(channel?.storeId, storeId);
    if (ownershipError) return ownershipError;

    where.variants = {
      some: {
        channelInventory: {
          some: {
            channelId,
            allocated: { gt: 0 },
          },
        },
      },
    };
  }
  if (status && status !== "all") where.status = status;
  if (search) {
    where.OR = [
      { nameZh: { contains: search, mode: "insensitive" } },
      { nameEn: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }

  // Minimal mode: lightweight response for dropdowns/autocomplete
  if (fields === "minimal") {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: { id: true, sku: true, nameZh: true, nameEn: true, sellingPrice: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sku: "asc" },
      }),
      prisma.product.count({ where }),
    ]);
    return NextResponse.json({ items: products, total, page, pageSize });
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: {
          orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }],
          select: { id: true, url: true, isPrimary: true },
        },
        category: true,
        variants: {
          select: {
            id: true,
            inventory: {
              select: { quantity: true },
            },
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { sku: "asc" },
    }),
    prisma.product.count({ where }),
  ]);

  const skus = products.map((p) => p.sku);
  const productIds = products.map((p) => p.id);
  const orderItems =
    skus.length > 0
      ? await prisma.orderItem.findMany({
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
      : [];

  const salesByProductId: Record<string, number> = {};
  const salesBySku: Record<string, number> = {};
  orderItems.forEach((item) => {
    if (item.productId) salesByProductId[item.productId] = (salesByProductId[item.productId] || 0) + item.quantity;
    if (item.sku) salesBySku[item.sku] = (salesBySku[item.sku] || 0) + item.quantity;
  });

  // Build PO image fallback map by SKU
  let poImageMap: Record<string, string[]> = {};
  if (skus.length > 0) {
    const poItems = await prisma.purchaseOrderItem.findMany({
      where: { sku: { in: skus }, images: { isEmpty: false } },
      select: { sku: true, images: true },
      orderBy: { id: "desc" },
    });
    for (const item of poItems) {
      const validImages = (item.images || []).filter(imageUrlHasFile);
      if (item.sku && validImages.length > 0 && !poImageMap[item.sku]) {
        poImageMap[item.sku] = validImages;
      }
    }
  }

  // Compute realStock and merge images
  const items = products.map((p) => {
    const inventoryRealStock = p.variants.reduce(
      (sum, v) => sum + v.inventory.reduce((s, inv) => s + inv.quantity, 0),
      0
    );
    const hasInventoryRecords = p.variants.some((v) => v.inventory.length > 0);
    const salesQty = salesByProductId[p.id] || salesBySku[p.sku] || 0;
    const baseStock = hasInventoryRecords ? inventoryRealStock : p.totalStock;
    const realStock = baseStock - salesQty;
    const { variants, ...rest } = p;
    const validProductImages = p.images.map((img) => img.url).filter(imageUrlHasFile);
    // Use ProductImage if available, otherwise fallback to PO images
    const allImages = validProductImages.length > 0
      ? validProductImages
      : (poImageMap[p.sku] || []);
    return { ...rest, realStock, salesQty, allImages, imageCount: allImages.length };
  });

  return NextResponse.json({ items, total, page, pageSize });
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.products.create);
  if (denied) return denied;
  return NextResponse.json(
    {
      error: "Products are created from Purchasing. Please create purchase orders to sync products.",
      code: "PRODUCT_CREATE_FROM_PURCHASING_ONLY",
    },
    { status: 403 }
  );
});
