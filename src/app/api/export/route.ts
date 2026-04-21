import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const denied = requirePermission(ctx, PERMISSIONS.settings.view);
  if (denied) return denied;
  const { storeId } = ctx;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "products";

  let csv = "";

  if (type === "products") {
    const products = await prisma.product.findMany({
      where: { storeId },
      include: { category: { select: { nameZh: true } } },
      orderBy: { createdAt: "desc" },
    });
    csv = "SKU,名称(中),名称(英),品牌,分类,成本价,售价,库存,状态,创建时间\n";
    for (const p of products) {
      csv += `"${p.sku}","${p.nameZh}","${p.nameEn}","${p.brand || ""}","${p.category?.nameZh || ""}",${p.costPrice},${p.sellingPrice},${p.totalStock},"${p.status}","${p.createdAt.toISOString()}"\n`;
    }
  } else if (type === "purchasing") {
    const orders = await prisma.purchaseOrder.findMany({
      where: { storeId },
      include: {
        supplier: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    csv = "采购单号,供应商,状态,采购币种,汇率,小计,运费,税费,总金额,本币金额,创建时间\n";
    for (const o of orders) {
      csv += `"${o.poNumber}","${o.supplier.name}","${o.status}","${o.purchaseCurrency}",${o.exchangeRate},${o.subtotal},${o.shippingCost},${o.tax},${o.totalAmount},${o.totalAmountLocal},"${o.createdAt.toISOString()}"\n`;
    }
  } else if (type === "orders") {
    const orders = await prisma.order.findMany({
      where: { storeId },
      include: {
        items: true,
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    csv = "订单号,平台,客户,状态,小计,运费,折扣,税费,总金额,币种,创建时间\n";
    for (const o of orders) {
      csv += `"${o.platformOrderId}","${o.platform || ""}","${o.customer?.name || ""}","${o.status}",${o.subtotal},${o.shippingFee},${o.discount},${o.tax},${o.totalAmount},"${o.currency}","${o.createdAt.toISOString()}"\n`;
    }
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  // Add BOM for Excel compatibility
  const bom = "\uFEFF";
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
