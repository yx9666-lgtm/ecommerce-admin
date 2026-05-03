import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAuthContext, assertStoreOwnership, withTryCatch, parseBody } from "@/lib/api-utils";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";

const allocateInventorySchema = z.object({
  channelId: z.string().min(1),
  variantId: z.string().optional(),
  productId: z.string().optional(),
  allocated: z.number().int().min(0),
});

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;

  const denied = requirePermission(ctx, PERMISSIONS.inventory.tableView);
  if (denied) return denied;

  const { storeId } = ctx;

  const channelId = req.nextUrl.searchParams.get("channelId");
  const productId = req.nextUrl.searchParams.get("productId");

  const channels = await prisma.channel.findMany({
    where: { storeId, isActive: true },
    select: { id: true, name: true, code: true, color: true, shopUsername: true },
    orderBy: { createdAt: "asc" },
  });

  // Single product mode (transfer dialog)
  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        sku: true,
        nameZh: true,
        nameEn: true,
        totalStock: true,
        storeId: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // IDOR check: verify product belongs to this store
    const productOwnership = assertStoreOwnership(product.storeId, storeId);
    if (productOwnership) return productOwnership;

    let variant = await prisma.productVariant.findFirst({
      where: { productId },
    });

    if (!variant) {
      variant = await prisma.productVariant.create({
        data: {
          productId,
          sku: product.sku,
          nameZh: product.nameZh,
          nameEn: product.nameEn,
          price: 0,
          stock: product.totalStock,
        },
      });
    }

    const allocations = await prisma.channelInventory.findMany({
      where: { variantId: variant.id },
    });

    const channelAllocations: Record<string, number> = {};
    for (const a of allocations) {
      channelAllocations[a.channelId] = a.allocated;
    }

    return NextResponse.json({
      channels,
      product,
      variantId: variant.id,
      totalStock: product.totalStock,
      channelAllocations,
    });
  }

  // Listing mode
  const all = req.nextUrl.searchParams.get("all") === "1";
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const pageSize = parseInt(req.nextUrl.searchParams.get("pageSize") || "20");
  const search = req.nextUrl.searchParams.get("search") || "";

  const variantWhere: any = { product: { storeId } };
  if (search) {
    variantWhere.OR = [
      { sku: { contains: search, mode: "insensitive" } },
      { nameZh: { contains: search, mode: "insensitive" } },
      { nameEn: { contains: search, mode: "insensitive" } },
      { product: { nameZh: { contains: search, mode: "insensitive" } } },
      { product: { nameEn: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [variants, variantTotal] = await Promise.all([
    prisma.productVariant.findMany({
      where: variantWhere,
      select: {
        id: true,
        sku: true,
        nameZh: true,
        nameEn: true,
        stock: true,
        product: {
          select: {
            id: true,
            nameZh: true,
            nameEn: true,
            totalStock: true,
            images: {
              orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }],
              take: 1,
              select: { url: true },
            },
          },
        },
        channelInventory: {
          select: { allocated: true },
        },
      },
      orderBy: { sku: "asc" },
      ...(all ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    }),
    prisma.productVariant.count({ where: variantWhere }),
  ]);

  // Aggregate sales/purchase metrics for the selected variant set
  const skus = variants.map((v) => v.sku).filter(Boolean);

  const [channelOrderItems, purchaseItems] = await Promise.all([
    skus.length > 0
      ? prisma.orderItem.findMany({
          where: {
            order: { storeId, channelId: { not: null } },
            sku: { in: skus },
          },
          select: { sku: true, quantity: true, order: { select: { channelId: true } } },
        })
      : [],
    skus.length > 0
      ? prisma.purchaseOrderItem.findMany({
          where: {
            purchaseOrder: { storeId, status: { not: "CANCELLED" } },
            sku: { in: skus },
          },
          select: { sku: true, quantity: true, images: true },
          orderBy: { purchaseOrder: { createdAt: "desc" } },
        })
      : [],
  ]);

  const channelSalesMap: Record<string, Record<string, number>> = {};
  channelOrderItems.forEach((item) => {
    const chId = item.order.channelId;
    if (chId && item.sku) {
      if (!channelSalesMap[item.sku]) channelSalesMap[item.sku] = {};
      channelSalesMap[item.sku][chId] = (channelSalesMap[item.sku][chId] || 0) + item.quantity;
    }
  });

  const purchaseMap: Record<string, number> = {};
  const poImageMap: Record<string, string[]> = {};
  purchaseItems.forEach((item) => {
    if (item.sku) {
      purchaseMap[item.sku] = (purchaseMap[item.sku] || 0) + item.quantity;
      if (item.images.length > 0 && !poImageMap[item.sku]) {
        poImageMap[item.sku] = item.images;
      }
    }
  });

  const enrichedVariants = variants.map((v) => {
    const channelAllocated = v.channelInventory.reduce((s, ci) => s + ci.allocated, 0);
    const allImages = poImageMap[v.sku] || (v.product.images[0]?.url ? [v.product.images[0].url] : []);
    return {
      id: v.id,
      sku: v.sku,
      nameZh: v.nameZh,
      nameEn: v.nameEn,
      stock: v.stock,
      image: allImages[0] || null,
      allImages,
      purchaseQty: purchaseMap[v.sku] || 0,
      channelAllocated,
      channelSales: channelSalesMap[v.sku] || {},
      product: { nameZh: v.product.nameZh, nameEn: v.product.nameEn },
    };
  });

  // Allocation map for the selected variant IDs
  const variantIds = variants.map((v) => v.id);
  const allocations = variantIds.length > 0
    ? await prisma.channelInventory.findMany({
        where: {
          variantId: { in: variantIds },
          ...(channelId ? { channelId } : {}),
        },
        select: {
          id: true,
          channelId: true,
          variantId: true,
          allocated: true,
          reserved: true,
        },
      })
    : [];

  const allocationMap: Record<
    string,
    Record<string, { allocated: number; reserved: number }>
  > = {};
  for (const a of allocations) {
    if (!allocationMap[a.variantId]) allocationMap[a.variantId] = {};
    allocationMap[a.variantId][a.channelId] = {
      allocated: a.allocated,
      reserved: a.reserved,
    };
  }

  return NextResponse.json({
    channels,
    variants: enrichedVariants,
    allocationMap,
    total: variantTotal,
    page: all ? 1 : page,
    pageSize: all ? variantTotal : pageSize,
  });
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;

  const denied = requirePermission(ctx, PERMISSIONS.inventory.edit);
  if (denied) return denied;

  const { storeId } = ctx;

  const body = await parseBody(req, allocateInventorySchema);
  if (body instanceof NextResponse) return body;
  const { channelId, variantId, productId, allocated } = body;

  if (!channelId || allocated === undefined) {
    return NextResponse.json(
      { error: "channelId and allocated are required" },
      { status: 400 }
    );
  }

  // IDOR check: verify channel belongs to this store
  const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { storeId: true } });
  const channelOwnership = assertStoreOwnership(channel?.storeId, storeId);
  if (channelOwnership) return channelOwnership;

  let targetVariantId = variantId;

  if (!targetVariantId && productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true, nameZh: true, nameEn: true, totalStock: true, storeId: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // IDOR check: verify product belongs to this store
    const productOwnership = assertStoreOwnership(product.storeId, storeId);
    if (productOwnership) return productOwnership;

    let variant = await prisma.productVariant.findFirst({
      where: { productId },
    });

    if (!variant) {
      variant = await prisma.productVariant.create({
        data: {
          productId,
          sku: product.sku,
          nameZh: product.nameZh,
          nameEn: product.nameEn,
          price: 0,
          stock: product.totalStock,
        },
      });
    }

    targetVariantId = variant.id;
  }

  if (!targetVariantId) {
    return NextResponse.json(
      { error: "variantId or productId is required" },
      { status: 400 }
    );
  }

  const targetVariant = await prisma.productVariant.findUnique({
    where: { id: targetVariantId },
    select: {
      id: true,
      sku: true,
      product: { select: { storeId: true } },
    },
  });
  if (!targetVariant) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  const variantOwnership = assertStoreOwnership(targetVariant.product.storeId, storeId);
  if (variantOwnership) return variantOwnership;

  const [existingAllocations, purchaseQtyAgg] = await Promise.all([
    prisma.channelInventory.findMany({
      where: { variantId: targetVariantId },
      select: { channelId: true, allocated: true },
    }),
    prisma.purchaseOrderItem.aggregate({
      where: {
        sku: targetVariant.sku,
        purchaseOrder: { storeId, status: { not: "CANCELLED" } },
      },
      _sum: { quantity: true },
    }),
  ]);

  const existingForChannel = existingAllocations.find((row) => row.channelId === channelId)?.allocated || 0;
  const currentTotalAllocated = existingAllocations.reduce((sum, row) => sum + row.allocated, 0);
  const nextTotalAllocated = currentTotalAllocated - existingForChannel + allocated;
  const maxAllocatable = purchaseQtyAgg._sum.quantity || 0;
  const isReducingAllocation = allocated <= existingForChannel;

  // Block any new over-allocation, but allow reducing existing over-allocation to recover.
  if (nextTotalAllocated > maxAllocatable && !isReducingAllocation) {
    return NextResponse.json(
      {
        error: `分配失败：SKU ${targetVariant.sku} 的渠道分配总数(${nextTotalAllocated})不能超过采购数量(${maxAllocatable})`,
        code: "OVER_ALLOCATED",
      },
      { status: 400 }
    );
  }

  const result = await prisma.channelInventory.upsert({
    where: {
      channelId_variantId: { channelId, variantId: targetVariantId },
    },
    update: { allocated },
    create: { channelId, variantId: targetVariantId, allocated },
  });

  return NextResponse.json(result);
});
