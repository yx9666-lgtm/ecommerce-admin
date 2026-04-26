import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;

  const denied = requirePermission(ctx, PERMISSIONS.logistics.tableView);
  if (denied) return denied;

  const { storeId } = ctx;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  // ── Build shipment query filter ─────────────────────────────────────────
  const where: any = {
    order: { storeId },
  };

  if (status && status !== "all") {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { trackingNumber: { contains: search, mode: "insensitive" } },
      { carrier: { contains: search, mode: "insensitive" } },
      { order: { platformOrderId: { contains: search, mode: "insensitive" } } },
      { order: { customer: { name: { contains: search, mode: "insensitive" } } } },
    ];
  }

  // ── Fetch shipments + total count ───────────────────────────────────────
  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            platformOrderId: true,
            shippingAddress: true,
            customer: { select: { id: true, name: true } },
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { shippedAt: { sort: "desc", nulls: "last" } },
    }),
    prisma.shipment.count({ where }),
  ]);

  // ── Carrier stats (aggregate across all store shipments) ────────────────
  const allStoreShipments = await prisma.shipment.findMany({
    where: { order: { storeId } },
    select: {
      carrier: true,
      status: true,
      shippedAt: true,
      deliveredAt: true,
    },
  });

  const carrierMap = new Map<
    string,
    { count: number; totalDeliveryMs: number; deliveredCount: number }
  >();

  for (const s of allStoreShipments) {
    const entry = carrierMap.get(s.carrier) || {
      count: 0,
      totalDeliveryMs: 0,
      deliveredCount: 0,
    };
    entry.count++;

    if (s.shippedAt && s.deliveredAt) {
      entry.totalDeliveryMs +=
        new Date(s.deliveredAt).getTime() - new Date(s.shippedAt).getTime();
      entry.deliveredCount++;
    }

    carrierMap.set(s.carrier, entry);
  }

  const carriers = Array.from(carrierMap.entries()).map(([name, stats]) => ({
    name,
    shipments: stats.count,
    avgDays:
      stats.deliveredCount > 0
        ? Math.round(
            (stats.totalDeliveryMs / stats.deliveredCount / 86_400_000) * 10
          ) / 10
        : null,
  }));

  // ── Format response ─────────────────────────────────────────────────────
  const data = shipments.map((s) => {
    const addr = s.order.shippingAddress;
    let destination = "-";
    if (addr) {
      if (typeof addr === "object" && addr !== null && !Array.isArray(addr)) {
        const a = addr as Record<string, any>;
        destination = a.city || a.state || a.address || JSON.stringify(addr);
      } else if (typeof addr === "string") {
        destination = addr;
      }
    }

    return {
      id: s.id,
      orderId: s.order.platformOrderId,
      carrier: s.carrier,
      trackingNo: s.trackingNumber,
      status: s.status,
      customer: s.order.customer?.name || "-",
      destination,
      shippedAt: s.shippedAt,
      deliveredAt: s.deliveredAt,
      metadata: s.metadata,
    };
  });

  return NextResponse.json({ data, total, carriers });
});
