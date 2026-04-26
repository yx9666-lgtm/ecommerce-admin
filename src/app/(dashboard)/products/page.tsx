"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search, Download, Upload,
  Package, Loader2,
} from "lucide-react";
import { ImageGallery } from "@/components/ui/image-gallery";
import { formatCurrency } from "@/lib/utils";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

interface Product {
  id: string; sku: string; nameZh: string; nameEn: string;
  costPrice: number; sellingPrice: number; totalStock: number;
  status: string; brand: string | null; images: any[];
  realStock?: number;
  salesQty?: number;
  allImages?: string[];
  imageCount?: number;
}

export default function ProductsPage() {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.items || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => { loadData(); }, [loadData]);
  useAutoRefresh(loadData);

  const handleStatusChange = async (productId: string, status: string) => {
    setUpdatingStatusId(productId);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "状态更新失败");
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, status } : p)));
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "状态更新失败");
    }
    setUpdatingStatusId(null);
  };

  const filtered = products;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`${tc("search")} SKU, ${t("productName")}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc("all")}</SelectItem>
              <SelectItem value="ACTIVE">{t("statusActive")}</SelectItem>
              <SelectItem value="DRAFT">{t("statusDraft")}</SelectItem>
              <SelectItem value="INACTIVE">{t("statusInactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1"><Download className="h-4 w-4" />{t("bulkExport")}</Button>
          <Button variant="outline" size="sm" className="gap-1"><Upload className="h-4 w-4" />{t("bulkImport")}</Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gold-700" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{tc("noData")}</p>
              <p className="text-xs text-muted-foreground mt-2">{t("sourceFromPurchasing")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sku")}</TableHead>
                  <TableHead>{t("productName")}</TableHead>
                  <TableHead>商品图片</TableHead>
                  <TableHead>{t("costPrice")}</TableHead>
                  <TableHead className="text-center">采购数量</TableHead>
                  <TableHead className="text-center">销售数量</TableHead>
                  <TableHead className="text-center">真实库存</TableHead>
                  <TableHead className="text-center">{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
                <TableBody>
                {filtered.map((product) => {
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <span className="font-mono text-sm">{product.sku}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{product.nameZh || product.nameEn}</span>
                      </TableCell>
                      <TableCell>
                        <ImageGallery
                          images={product.allImages || (product.images?.[0]?.url ? [product.images[0].url] : [])}
                          alt={product.nameZh}
                        />
                      </TableCell>
                      <TableCell className="text-sm font-mono tabular-nums">{formatCurrency(product.costPrice)}</TableCell>
                      <TableCell className="text-sm font-mono tabular-nums text-center">
                        {product.totalStock}
                      </TableCell>
                      <TableCell className="text-sm font-mono tabular-nums text-center">
                        {product.salesQty ?? 0}
                      </TableCell>
                      <TableCell className="text-sm font-mono tabular-nums text-center">
                        {product.realStock ?? 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Select
                            value={product.status}
                            onValueChange={(value) => handleStatusChange(product.id, value)}
                            disabled={updatingStatusId === product.id}
                          >
                            <SelectTrigger className="h-8 w-[94px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ACTIVE">{t("statusActive")}</SelectItem>
                              <SelectItem value="DRAFT">{t("statusDraft")}</SelectItem>
                              <SelectItem value="INACTIVE">{t("statusInactive")}</SelectItem>
                              <SelectItem value="ARCHIVED">{t("statusArchived")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                共 {total} 条，第 {page}/{totalPages} 页
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  上一页
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
