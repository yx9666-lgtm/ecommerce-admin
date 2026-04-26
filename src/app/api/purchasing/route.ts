import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, withTryCatch, parseBody } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const purchaseOrderItemSchema = z.object({
  productName: z.string().min(1),
  sku: z.string().min(1),
  categoryId: z.string().optional(),
  specs: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  images: z.array(z.string()).optional(),
  quantity: z.number().int().min(1),
  unitCost: z.number().positive(),
});

const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  supplierInvoiceNo: z.string().optional(),
  warehouseId: z.string().optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "CONFIRMED"]).optional(),
  purchaseCurrency: z.string().optional(),
  localCurrency: z.string().optional(),
  exchangeRate: z.number().positive().optional(),
  shippingCost: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  notes: z.string().optional(),
  expectedDate: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).optional(),
});

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.purchasing.tableView);
  if (denied) return denied;
  const { storeId } = ctx;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");
  const search = searchParams.get("search") || "";

  const where: any = { storeId };
  if (search) {
    where.OR = [
      { poNumber: { contains: search, mode: "insensitive" } },
      { supplier: { name: { contains: search, mode: "insensitive" } } },
      { supplierInvoiceNo: { contains: search, mode: "insensitive" } },
    ];
  }

  const [orders, total, pendingCount, spendAgg] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, supplierNo: true } },
        warehouse: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.count({
      where: { storeId, status: { in: ["DRAFT", "SUBMITTED", "CONFIRMED"] } },
    }),
    prisma.purchaseOrder.aggregate({
      where: { storeId },
      _sum: { totalAmountLocal: true },
    }),
  ]);

  return NextResponse.json({
    items: orders,
    total,
    page,
    pageSize,
    stats: {
      pendingCount,
      totalSpend: spendAgg._sum.totalAmountLocal || 0,
    },
  });
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.purchasing.create);
  if (denied) return denied;
  const { storeId } = ctx;

  const body = await parseBody(req, createPurchaseOrderSchema);
  if (body instanceof NextResponse) return body;

  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { poPrefix: true } });
  const poPrefix = store?.poPrefix || "RJ";

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const prefix = `${poPrefix}${dateStr}-`;
  const todayCount = await prisma.purchaseOrder.count({
    where: { storeId, poNumber: { startsWith: prefix } },
  });
  const poNumber = `${prefix}${String(todayCount + 1).padStart(3, "0")}`;

  const exchangeRate = body.exchangeRate || 1;
  const subtotal = (body.items || []).reduce(
    (s: number, i: any) => s + (i.quantity || 0) * (i.unitCost || 0),
    0
  );
  const totalAmount = subtotal + (body.shippingCost || 0) + (body.tax || 0);
  const totalAmountLocal = exchangeRate ? totalAmount / exchangeRate : 0;

  const po = await prisma.purchaseOrder.create({
    data: {
      storeId,
      poNumber,
      supplierInvoiceNo: body.supplierInvoiceNo || null,
      supplierId: body.supplierId,
      warehouseId: body.warehouseId || null,
      status: body.status || "DRAFT",
      purchaseCurrency: body.purchaseCurrency || "CNY",
      localCurrency: body.localCurrency || "MYR",
      exchangeRate,
      subtotal,
      shippingCost: body.shippingCost || 0,
      tax: body.tax || 0,
      totalAmount,
      totalAmountLocal,
      notes: body.notes,
      expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
      items: {
        create: (body.items || []).map((item: any) => ({
          productName: item.productName,
          sku: item.sku,
          categoryId: item.categoryId || null,
          specs: item.specs || [],
          images: item.images || [],
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: (item.quantity || 0) * (item.unitCost || 0),
        })),
      },
    },
    include: { supplier: true, items: true },
  });

  const warehouseId = body.warehouseId || (await prisma.warehouse.findFirst({ where: { storeId } }))?.id;

  // Batch: collect all SKUs and query existing products at once
  const validItems = (body.items || []).filter((item: any) => item.sku && item.productName);
  const skuSummary = new Map<string, {
    sku: string;
    productName: string;
    totalQty: number;
    costLocal: number;
    images: Set<string>;
  }>();
  for (const item of validItems) {
    const sku = item.sku;
    const qty = Number(item.quantity) || 0;
    const costLocal = exchangeRate ? (Number(item.unitCost) || 0) / exchangeRate : 0;
    const urls = (item.images || []).filter((url: string) => typeof url === "string" && url.trim() !== "");
    const existing = skuSummary.get(sku);
    if (existing) {
      existing.totalQty += qty;
      existing.costLocal = costLocal;
      urls.forEach((url: string) => existing.images.add(url));
    } else {
      skuSummary.set(sku, {
        sku,
        productName: item.productName,
        totalQty: qty,
        costLocal,
        images: new Set(urls),
      });
    }
  }
  const skus = Array.from(skuSummary.keys());

  const existingProducts = skus.length > 0
    ? await prisma.product.findMany({
        where: { storeId, sku: { in: skus } },
        select: { id: true, sku: true },
      })
    : [];
  const existingMap = new Map(existingProducts.map((p) => [p.sku, p.id]));

  // Build all operations and run in a single transaction
  const ops: any[] = [];
  for (const summary of Array.from(skuSummary.values())) {
    const existingId = existingMap.get(summary.sku);

    if (existingId) {
      ops.push(
        prisma.product.update({
          where: { id: existingId },
          data: {
            costPrice: summary.costLocal,
            totalStock: { increment: summary.totalQty },
          },
        })
      );
    } else {
      ops.push(
        prisma.product.create({
          data: {
            storeId,
            sku: summary.sku,
            nameZh: summary.productName,
            nameEn: summary.productName,
            costPrice: summary.costLocal,
            sellingPrice: 0,
            totalStock: summary.totalQty,
            status: "ACTIVE",
          },
        })
      );
    }

  }

  for (const item of validItems) {
    const qty = Number(item.quantity) || 0;
    if (!warehouseId || qty <= 0) continue;
    ops.push(
      prisma.inventoryAction.create({
        data: {
          warehouseId,
          type: "INBOUND",
          variantSku: item.sku,
          quantity: qty,
          operator: "System",
          note: `采购入库 ${poNumber}`,
        },
      })
    );
  }

  if (ops.length > 0) {
    await prisma.$transaction(ops);
  }

  // Sync PO item images to ProductImage table
  // Re-query products to get IDs (new products just created above)
  const allProducts = skus.length > 0
    ? await prisma.product.findMany({
        where: { storeId, sku: { in: skus } },
        select: { id: true, sku: true, images: { select: { url: true } } },
      })
    : [];
  const productMap = new Map(allProducts.map((p) => [p.sku, p]));

  const imageOps: any[] = [];
  for (const summary of Array.from(skuSummary.values())) {
    if (summary.images.size === 0) continue;
    const prod = productMap.get(summary.sku);
    if (!prod) continue;
    const existingUrls = new Set(prod.images.map((i) => i.url));
    let createdCount = 0;
    Array.from(summary.images).forEach((url: string) => {
      if (!existingUrls.has(url)) {
        imageOps.push(
          prisma.productImage.create({
            data: {
              productId: prod.id,
              url,
              position: existingUrls.size + createdCount,
              isPrimary: existingUrls.size === 0 && createdCount === 0,
            },
          })
        );
        createdCount += 1;
      }
    });
  }
  if (imageOps.length > 0) {
    await prisma.$transaction(imageOps);
  }

  return NextResponse.json(po, { status: 201 });
});
