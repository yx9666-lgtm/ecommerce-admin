import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, parseBody, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

const orderItemSchema = z.object({
  name: z.string().min(1),
  sku: z.string().nullable().optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  productId: z.string().nullable().optional(),
  variantId: z.string().nullable().optional(),
});

const createOrderSchema = z.object({
  channelId: z.string().min(1),
  platformOrderId: z.string().min(1),
  orderDate: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  shippingAddress: z.string().optional(),
  subtotal: z.number().min(0).optional(),
  shippingFee: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  totalAmount: z.number().min(0).optional(),
  buyerNote: z.string().optional(),
  sellerNote: z.string().optional(),
  status: z.string().optional(),
});

const CODE_TO_PLATFORM: Record<string, string> = {
  SHOPEE: "SHOPEE",
  LAZADA: "LAZADA",
  TIKTOK: "TIKTOK",
  PGMALL: "PGMALL",
};

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.orders.tableView);
  if (denied) return denied;
  const { storeId } = ctx;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const channelId = searchParams.get("channelId");
  const search = searchParams.get("search");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const where: any = { storeId };
  if (status && status !== "all") where.status = status;
  if (platform && platform !== "all") where.platform = platform;
  if (channelId && channelId !== "all") where.channelId = channelId;
  if (search) {
    where.OR = [
      { platformOrderId: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (startDate || endDate) {
    const orderDateFilter: { gte?: Date; lt?: Date } = {};
    if (startDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      if (Number.isNaN(start.getTime())) {
        return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
      }
      orderDateFilter.gte = start;
    }
    if (endDate) {
      const endExclusive = new Date(`${endDate}T00:00:00.000Z`);
      if (Number.isNaN(endExclusive.getTime())) {
        return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });
      }
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
      orderDateFilter.lt = endExclusive;
    }
    where.orderDate = orderDateFilter;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          select: {
            id: true,
            name: true,
            sku: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            product: {
              select: {
                images: {
                  select: { url: true },
                  orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
                },
              },
            },
          },
        },
        customer: { select: { id: true, name: true } },
        channel: { select: { id: true, name: true, code: true, color: true, shopUsername: true } },
        shipment: { select: { id: true, carrier: true, trackingNumber: true, status: true } },
        refunds: { select: { id: true, amount: true, status: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.order.count({ where }),
  ]);

  const missingSkus = Array.from(
    new Set(
      orders.flatMap((o) =>
        o.items
          .filter((i) => !i.product?.images?.[0]?.url && i.sku)
          .map((i) => i.sku as string)
      )
    )
  );

  const skuImageMap = new Map<string, string[]>();
  if (missingSkus.length > 0) {
    const products = await prisma.product.findMany({
      where: { storeId, sku: { in: missingSkus } },
      select: {
        sku: true,
        images: {
          select: { url: true },
          orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        },
      },
    });
    products.forEach((p) => {
      const urls = p.images.map((img) => img.url).filter(Boolean);
      if (urls.length > 0) skuImageMap.set(p.sku, urls);
    });
  }

  const items = orders.map((order) => ({
    ...order,
    items: order.items.map((item) => {
      const direct = (item.product?.images || []).map((img) => img.url).filter(Boolean);
      const fallback = item.sku ? skuImageMap.get(item.sku) || [] : [];
      const imageUrls = direct.length > 0 ? direct : fallback;
      const { product, ...rest } = item;
      return { ...rest, imageUrls };
    }),
  }));

  return NextResponse.json({ items, total, page, pageSize });
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.orders.create);
  if (denied) return denied;
  const { storeId } = ctx;

  const body = await parseBody(req, createOrderSchema);
  if (body instanceof NextResponse) return body;

  const {
    channelId,
    platformOrderId,
    orderDate,
    items,
    customerName,
    customerPhone,
    customerEmail,
    shippingAddress,
    subtotal,
    shippingFee = 0,
    discount = 0,
    tax = 0,
    totalAmount,
    buyerNote,
    sellerNote,
    status = "PENDING_PAYMENT",
  } = body;

  if (!channelId || !platformOrderId || !items?.length) {
    return NextResponse.json(
      { error: "channelId, platformOrderId, and items are required" },
      { status: 400 }
    );
  }

  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel || channel.storeId !== storeId) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const platformEnum = CODE_TO_PLATFORM[channel.code] || null;
  const parsedOrderDate = orderDate ? new Date(`${orderDate}T00:00:00`) : undefined;
  if (parsedOrderDate && Number.isNaN(parsedOrderDate.getTime())) {
    return NextResponse.json({ error: "Invalid orderDate" }, { status: 400 });
  }

  const computedSubtotal =
    subtotal ??
    items.reduce(
      (sum: number, i: any) => sum + (i.unitPrice || 0) * (i.quantity || 0),
      0
    );
  const computedTotal =
    totalAmount ?? computedSubtotal + shippingFee - discount + tax;

  let customerId: string | undefined;
  if (customerName) {
    const customer = await prisma.customer.create({
      data: {
        storeId,
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      },
    });
    customerId = customer.id;
  }

  const order = await prisma.order.create({
    data: {
      storeId,
      channelId,
      platform: platformEnum as any,
      platformOrderId,
      orderDate: parsedOrderDate,
      status: status as any,
      customerId,
      subtotal: computedSubtotal,
      shippingFee,
      discount,
      tax,
      totalAmount: computedTotal,
      buyerNote,
      sellerNote,
      shippingAddress: shippingAddress || undefined,
      items: {
        create: items.map((item: any) => ({
          name: item.name,
          sku: item.sku || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: (item.unitPrice || 0) * (item.quantity || 0),
          productId: item.productId || null,
          variantId: item.variantId || null,
        })),
      },
    },
    include: { items: true, channel: true, customer: true },
  });

  return NextResponse.json(order, { status: 201 });
});
