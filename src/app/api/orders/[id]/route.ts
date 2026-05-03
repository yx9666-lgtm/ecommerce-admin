import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, parseBody, withTryCatch, assertStoreOwnership } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const updateOrderItemSchema = z.object({
  name: z.string().optional(),
  sku: z.string().nullable().optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  productId: z.string().nullable().optional(),
  variantId: z.string().nullable().optional(),
});

const updateOrderSchema = z.object({
  channelId: z.string().optional(),
  platformOrderId: z.string().optional(),
  orderDate: z.string().optional(),
  status: z.enum(["PENDING_PAYMENT", "PENDING_SHIPMENT", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED", "REFUND_PENDING", "REFUNDED"]).optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  shippingFee: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  buyerNote: z.string().nullable().optional(),
  sellerNote: z.string().nullable().optional(),
  items: z.array(updateOrderItemSchema).optional(),
});

export const PUT = withTryCatch(async (req: NextRequest, context) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.orders.edit);
  if (denied) return denied;
  const { storeId } = ctx;

  const { id } = context!.params;

  // IDOR check: verify order belongs to session store
  const existing = await prisma.order.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  const body = await parseBody(req, updateOrderSchema);
  if (body instanceof NextResponse) return body;

  const {
    channelId,
    platformOrderId,
    orderDate,
    status,
    customerName,
    customerPhone,
    shippingFee,
    discount,
    buyerNote,
    sellerNote,
    items,
  } = body;

  const itemsData = (items || []).filter((i: any) => i.sku && (i.quantity || 0) > 0);
  const computedSubtotal = itemsData.reduce(
    (sum: number, i: any) => sum + (i.unitPrice || 0) * (i.quantity || 0),
    0
  );
  const computedTotal = computedSubtotal + (shippingFee || 0) - (discount || 0);

  const parsedOrderDate = orderDate ? new Date(`${orderDate}T00:00:00`) : undefined;
  if (parsedOrderDate && Number.isNaN(parsedOrderDate.getTime())) {
    return NextResponse.json({ error: "Invalid orderDate" }, { status: 400 });
  }

  const order = await prisma.$transaction(async (tx) => {
    // Delete old items and recreate
    await tx.orderItem.deleteMany({ where: { orderId: id } });

    const updated = await tx.order.update({
      where: { id },
      data: {
        channelId: channelId || undefined,
        platformOrderId: platformOrderId || undefined,
        orderDate: parsedOrderDate,
        status: status || undefined,
        shippingFee: shippingFee ?? 0,
        discount: discount ?? 0,
        subtotal: computedSubtotal,
        totalAmount: computedTotal,
        buyerNote: buyerNote || null,
        sellerNote: sellerNote || null,
        items: {
          create: itemsData.map((item: any) => ({
            name: item.name || item.sku,
            sku: item.sku || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: (item.unitPrice || 0) * (item.quantity || 0),
            productId: item.productId || null,
            variantId: item.variantId || null,
          })),
        },
      },
      include: {
        items: true,
        channel: { select: { id: true, name: true, code: true, color: true, shopUsername: true } },
        customer: { select: { id: true, name: true } },
      },
    });

    return updated;
  });

  return NextResponse.json(order);
});

export const DELETE = withTryCatch(async (_req: NextRequest, context) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.orders.delete);
  if (denied) return denied;
  const { storeId } = ctx;

  const { id } = context!.params;

  // IDOR check: verify order belongs to session store
  const existing = await prisma.order.findUnique({ where: { id }, select: { storeId: true } });
  const ownershipError = assertStoreOwnership(existing?.storeId, storeId);
  if (ownershipError) return ownershipError;

  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
