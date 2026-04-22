import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getAuthContext, withTryCatch, assertStoreOwnership, parseBody } from "@/lib/api-utils";
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

const updatePurchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  supplierInvoiceNo: z.string().optional(),
  warehouseId: z.string().optional(),
  purchaseCurrency: z.string().optional(),
  localCurrency: z.string().optional(),
  exchangeRate: z.number().positive().optional(),
  shippingCost: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  notes: z.string().optional(),
  expectedDate: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).optional(),
});

const patchDefectsSchema = z.object({
  defects: z.array(z.object({
    itemId: z.string().min(1),
    defectQty: z.number().int().min(0),
    defectNote: z.string().optional(),
  })).optional(),
});

export const GET = withTryCatch(async (_req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.purchasing.view);
  if (denied) return denied;
  const { storeId } = ctx;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      warehouse: true,
      items: { orderBy: { id: "asc" } },
    },
  });

  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // IDOR check
  const ownershipError = assertStoreOwnership(po.storeId, storeId);
  if (ownershipError) return ownershipError;

  return NextResponse.json(po);
});

export const PUT = withTryCatch(async (req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.purchasing.edit);
  if (denied) return denied;
  const { storeId } = ctx;

  // IDOR check
  const existing = await prisma.purchaseOrder.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  const body = await parseBody(req, updatePurchaseOrderSchema);
  if (body instanceof NextResponse) return body;

  const exchangeRate = body.exchangeRate || 1;
  const subtotal = (body.items || []).reduce(
    (s: number, i: any) => s + (i.quantity || 0) * (i.unitCost || 0),
    0
  );
  const totalAmount = subtotal + (body.shippingCost || 0) + (body.tax || 0);
  const totalAmountLocal = exchangeRate ? totalAmount / exchangeRate : 0;

  await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

  const po = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      supplierId: body.supplierId,
      supplierInvoiceNo: body.supplierInvoiceNo || null,
      warehouseId: body.warehouseId || null,
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

  // Sync PO item images to ProductImage table
  const validItems = (body.items || []).filter((item: any) => item.sku && item.images?.length > 0);
  const skus = validItems.map((item: any) => item.sku);
  if (skus.length > 0) {
    const products = await prisma.product.findMany({
      where: { storeId, sku: { in: skus } },
      select: { id: true, sku: true, images: { select: { url: true } } },
    });
    const productMap = new Map(products.map((p) => [p.sku, p]));

    const imageOps: any[] = [];
    for (const item of validItems) {
      const imgs: string[] = item.images || [];
      const prod = productMap.get(item.sku);
      if (!prod) continue;
      const existingUrls = new Set(prod.images.map((i) => i.url));
      imgs.forEach((url: string, idx: number) => {
        if (!existingUrls.has(url)) {
          imageOps.push(
            prisma.productImage.create({
              data: {
                productId: prod.id,
                url,
                position: existingUrls.size + idx,
                isPrimary: existingUrls.size === 0 && idx === 0,
              },
            })
          );
        }
      });
    }
    if (imageOps.length > 0) {
      await prisma.$transaction(imageOps);
    }
  }

  return NextResponse.json(po);
});

export const PATCH = withTryCatch(async (req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.purchasing.edit);
  if (denied) return denied;
  const { storeId } = ctx;

  // IDOR check
  const existing = await prisma.purchaseOrder.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  const body = await parseBody(req, patchDefectsSchema);
  if (body instanceof NextResponse) return body;
  const defects: { itemId: string; defectQty: number; defectNote?: string }[] = body.defects || [];

  // Batch all defect updates in a single transaction
  const defectOps = defects.map((d) =>
    prisma.purchaseOrderItem.update({
      where: { id: d.itemId },
      data: {
        defectQty: d.defectQty || 0,
        defectNote: d.defectNote || null,
      },
    })
  );

  if (defectOps.length > 0) {
    await prisma.$transaction(defectOps);
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });

  if (po) {
    const refundAmount = po.items.reduce((s, i) => s + i.defectQty * i.unitCost, 0);
    const refundAmountLocal = po.exchangeRate ? refundAmount / po.exchangeRate : 0;
    await prisma.purchaseOrder.update({
      where: { id },
      data: { refundAmount, refundAmountLocal },
    });
  }

  const updated = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, items: true, warehouse: true },
  });

  return NextResponse.json(updated);
});

export const DELETE = withTryCatch(async (_req: NextRequest, context) => {
  const { id } = context!.params;
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.purchasing.delete);
  if (denied) return denied;
  const { storeId } = ctx;

  // IDOR check
  const existing = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: { storeId: true, poNumber: true, exchangeRate: true },

  });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  // Fetch items to rollback inventory
  const items = await prisma.purchaseOrderItem.findMany({
    where: { purchaseOrderId: id },
    select: { sku: true, quantity: true },
  });

  // Rollback product stock for each SKU
  const skus = items.map((i) => i.sku).filter((s): s is string => s !== null);
  if (skus.length > 0) {
    const products = await prisma.product.findMany({
      where: { storeId, sku: { in: skus } },
      select: {
        id: true,
        sku: true,
        _count: { select: { orderItems: true } },
        variants: {
          select: {
            channelInventory: {
              select: { id: true, allocated: true, reserved: true },
            },
          },
        },
      },
    });
    const productMap = new Map(products.map((p) => [p.sku, p]));

    const remainingItems = await prisma.purchaseOrderItem.groupBy({
      by: ["sku"],
      where: {
        sku: { in: skus },
        purchaseOrderId: { not: id },
        purchaseOrder: { storeId, status: { not: "CANCELLED" } },
      },
      _sum: { quantity: true },
    });
    const remainingPurchaseMap = new Map(
      remainingItems
        .filter((row): row is { sku: string; _sum: { quantity: number | null } } => !!row.sku)
        .map((row) => [row.sku, row._sum.quantity || 0])
    );

    const ops: Prisma.PrismaPromise<unknown>[] = [];
    for (const item of items) {
      const product = item.sku ? productMap.get(item.sku) : undefined;
      const remainingQty = item.sku ? (remainingPurchaseMap.get(item.sku) || 0) : 0;
      const willDeleteProduct = !!product && remainingQty <= 0 && product._count.orderItems === 0;

      if (product && item.quantity > 0 && !willDeleteProduct) {
        ops.push(
          prisma.product.update({
            where: { id: product.id },
            data: { totalStock: { decrement: item.quantity } },
          })
        );
      }
    }

    // Create outbound inventory actions for audit trail
    const warehouse = await prisma.warehouse.findFirst({ where: { storeId } });
    if (warehouse) {
      for (const item of items) {
        if (item.quantity > 0) {
          ops.push(
            prisma.inventoryAction.create({
              data: {
                warehouseId: warehouse.id,
                type: "OUTBOUND",
                variantSku: item.sku || "",
                quantity: -item.quantity,
                operator: "System",
                note: `采购单删除回滚 ${existing!.poNumber}`,
              },
            })
          );
        }
      }
    }

    for (const product of products) {
      const remainingQty = remainingPurchaseMap.get(product.sku) || 0;
      let allocatable = Math.max(remainingQty, 0);
      const allocations = product.variants
        .flatMap((variant) => variant.channelInventory)
        .sort((a, b) => b.allocated - a.allocated);

      for (const allocation of allocations) {
        const nextAllocated = Math.min(allocation.allocated, allocatable);
        const nextReserved = Math.min(allocation.reserved, nextAllocated);
        allocatable -= nextAllocated;

        if (
          nextAllocated !== allocation.allocated ||
          nextReserved !== allocation.reserved
        ) {
          ops.push(
            prisma.channelInventory.update({
              where: { id: allocation.id },
              data: { allocated: nextAllocated, reserved: nextReserved },
            })
          );
        }
      }

      if (remainingQty <= 0) {
        if (product._count.orderItems === 0) {
          ops.push(prisma.product.delete({ where: { id: product.id } }));
        } else {
          ops.push(
            prisma.product.update({
              where: { id: product.id },
              data: { totalStock: 0 },
            })
          );
          ops.push(
            prisma.productVariant.updateMany({
              where: { productId: product.id },
              data: { stock: 0 },
            })
          );
        }
      }
    }

    if (ops.length > 0) {
      await prisma.$transaction(ops);
    }
  }

  await prisma.purchaseOrder.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
