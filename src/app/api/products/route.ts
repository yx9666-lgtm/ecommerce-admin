import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, parseBody, withTryCatch } from "@/lib/api-utils";
import prisma from "@/lib/db";

const createProductSchema = z.object({
  nameZh: z.string().min(1),
  nameEn: z.string().optional(),
  descZh: z.string().optional(),
  descEn: z.string().optional(),
  costPrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  comparePrice: z.number().positive().nullable().optional(),
  weight: z.number().min(0).nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  totalStock: z.number().int().min(0).optional(),
});

export const GET = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const fields = searchParams.get("fields");

  const where: any = { storeId };
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
        orderBy: { updatedAt: "desc" },
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
      orderBy: { updatedAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  // Build PO image fallback map by SKU
  const skus = products.map((p) => p.sku);
  let poImageMap: Record<string, string[]> = {};
  if (skus.length > 0) {
    const poItems = await prisma.purchaseOrderItem.findMany({
      where: { sku: { in: skus }, images: { isEmpty: false } },
      select: { sku: true, images: true },
      orderBy: { id: "desc" },
    });
    for (const item of poItems) {
      if (item.sku && item.images.length > 0 && !poImageMap[item.sku]) {
        poImageMap[item.sku] = item.images;
      }
    }
  }

  // Compute realStock and merge images
  const items = products.map((p) => {
    const realStock = p.variants.reduce(
      (sum, v) => sum + v.inventory.reduce((s, inv) => s + inv.quantity, 0),
      0
    );
    const { variants, ...rest } = p;
    // Use ProductImage if available, otherwise fallback to PO images
    const allImages = p.images.length > 0
      ? p.images.map((img) => img.url)
      : (poImageMap[p.sku] || []);
    return { ...rest, realStock, allImages, imageCount: allImages.length };
  });

  return NextResponse.json({ items, total, page, pageSize });
});

async function generateNextSku(storeId: string): Promise<string> {
  const latest = await prisma.product.findFirst({
    where: { storeId, sku: { startsWith: "RJ-" } },
    orderBy: { sku: "desc" },
    select: { sku: true },
  });

  if (!latest) return "RJ-1001";

  const num = parseInt(latest.sku.replace("RJ-", ""), 10);
  if (isNaN(num)) return "RJ-1001";

  return `RJ-${num + 1}`;
}

export const POST = withTryCatch(async (req: NextRequest) => {
  const ctx = await getAuthContext();
  if (ctx instanceof NextResponse) return ctx;
  const { storeId } = ctx;

  const body = await parseBody(req, createProductSchema);
  if (body instanceof NextResponse) return body;

  const sku = await generateNextSku(storeId);

  const product = await prisma.product.create({
    data: {
      storeId,
      sku,
      nameZh: body.nameZh,
      nameEn: body.nameEn || "",
      descZh: body.descZh,
      descEn: body.descEn,
      costPrice: body.costPrice || 0,
      sellingPrice: body.sellingPrice || 0,
      comparePrice: body.comparePrice,
      weight: body.weight,
      status: body.status || "DRAFT",
      categoryId: body.categoryId,
      brand: body.brand,
      totalStock: body.totalStock || 0,
    },
    include: { variants: true, images: true },
  });

  return NextResponse.json(product, { status: 201 });
});
