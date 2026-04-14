import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, parseBody, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";

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
  const { storeId } = ctx;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const channelId = searchParams.get("channelId");
  const search = searchParams.get("search");

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

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: { select: { id: true, name: true, sku: true, quantity: true, unitPrice: true, totalPrice: true } },
        customer: { select: { id: true, name: true } },
        channel: { select: { id: true, name: true, code: true, color: true, shopUsername: true } },
        shipment: { select: { id: true, carrier: true, trackingNumber: true, status: true } },
        refunds: { select: { id: true, amount: true, status: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ items: orders, total, page, pageSize });
});

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const body = await parseBody(req, createOrderSchema);
  if (body instanceof NextResponse) return body;

  const {
    channelId,
    platformOrderId,
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
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const platformEnum = CODE_TO_PLATFORM[channel.code] || null;

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
