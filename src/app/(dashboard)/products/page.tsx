"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, Download, Upload, Edit, Trash2,
  Package, Loader2, Tag,
} from "lucide-react";
import { PasswordConfirmDialog } from "@/components/password-confirm";
import { ImageGallery } from "@/components/ui/image-gallery";
import { formatCurrency } from "@/lib/utils";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

interface Product {
  id: string; sku: string; nameZh: string; nameEn: string;
  costPrice: number; sellingPrice: number; totalStock: number;
  status: string; brand: string | null; images: any[];
  realStock?: number;
  allImages?: string[];
  imageCount?: number;
}

const statusMap: Record<string, { label: string; variant: "success" | "default" | "secondary" | "warning" }> = {
  ACTIVE: { label: "上架", variant: "success" },
  DRAFT: { label: "草稿", variant: "secondary" },
  INACTIVE: { label: "下架", variant: "warning" },
  ARCHIVED: { label: "归档", variant: "default" },
};

export default function ProductsPage() {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nextSku, setNextSku] = useState("RJ-1001");
  const [activeTab, setActiveTab] = useState("basic");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nameZh: "", nameEn: "", descZh: "", descEn: "",
    costPrice: 0, sellingPrice: 0, comparePrice: 0,
    weight: 0, brand: "", status: "DRAFT", totalStock: 0,
    sku: "",
  });

  const [pwAction, setPwAction] = useState<"edit" | "delete">("delete");
  const [pwOpen, setPwOpen] = useState(false);
  const [pwItemName, setPwItemName] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  const openEdit = (p: Product) => {
    setPwAction("edit");
    setPwItemName(p.nameEn || p.nameZh);
    setPendingAction(() => async () => {
      setEditingId(p.id);
      setForm({
        nameZh: p.nameZh, nameEn: p.nameEn, descZh: "", descEn: "",
        costPrice: p.costPrice, sellingPrice: p.sellingPrice, comparePrice: 0,
        weight: 0, brand: p.brand || "", status: p.status, totalStock: p.totalStock,
        sku: p.sku,
      });
      setShowAddDialog(true);
    });
    setPwOpen(true);
  };

  const openDelete = (p: Product) => {
    setPwAction("delete");
    setPwItemName(`${p.sku} - ${p.nameEn || p.nameZh}`);
    setPendingAction(() => async () => {
      await fetch(`/api/products/${p.id}`, { method: "DELETE" });
      loadData();
    });
    setPwOpen(true);
  };

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

  const loadNextSku = useCallback(async () => {
    try {
      const res = await fetch("/api/products/next-sku");
      const data = await res.json();
      setNextSku(data.sku || "RJ-1001");
    } catch { setNextSku("RJ-1001"); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useAutoRefresh(loadData);

  const openAddDialog = async () => {
    setEditingId(null);
    setForm({ nameZh: "", nameEn: "", descZh: "", descEn: "", costPrice: 0, sellingPrice: 0, comparePrice: 0, weight: 0, brand: "", status: "DRAFT", totalStock: 0, sku: nextSku });
    await loadNextSku();
    setShowAddDialog(true);
  };

  // Sync nextSku into form.sku when loaded for new product
  useEffect(() => {
    if (!editingId && nextSku) setForm(f => f.sku === "" || f.sku === nextSku ? { ...f, sku: nextSku } : f);
  }, [nextSku, editingId]);

  const handleSubmit = async () => {
    if (!form.nameZh && !form.nameEn) return alert("请输入商品名称");
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/products/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setShowAddDialog(false);
      setForm({ nameZh: "", nameEn: "", descZh: "", descEn: "", costPrice: 0, sellingPrice: 0, comparePrice: 0, weight: 0, brand: "", status: "DRAFT", totalStock: 0, sku: "" });
      setEditingId(null);
      setActiveTab("basic");
      loadData();
    } catch (e) { console.error(e); }
    setSaving(false);
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
          <Button size="sm" className="gap-1" onClick={openAddDialog}>
            <Plus className="h-4 w-4" />{t("addProduct")}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-amber-700" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{tc("noData")}</p>
              <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={openAddDialog}>
                <Plus className="h-4 w-4" />{t("addProduct")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("productName")}</TableHead>
                  <TableHead>商品图片</TableHead>
                  <TableHead>{t("sku")}</TableHead>
                  <TableHead>{t("costPrice")}</TableHead>
                  <TableHead>采购数量</TableHead>
                  <TableHead>真实库存</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-center w-24">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => {
                  const statusInfo = statusMap[product.status] || statusMap.DRAFT;
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <span className="text-sm">{product.nameZh || product.nameEn}</span>
                      </TableCell>
                      <TableCell>
                        <ImageGallery
                          images={product.allImages || (product.images?.[0]?.url ? [product.images[0].url] : [])}
                          alt={product.nameZh}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{product.sku}</span>
                      </TableCell>
                      <TableCell className="text-sm">{formatCurrency(product.costPrice)}</TableCell>
                      <TableCell className="text-sm">
                        {product.totalStock}
                      </TableCell>
                      <TableCell className="text-sm">
                        {product.realStock ?? 0}
                      </TableCell>
                      <TableCell><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10" onClick={() => openEdit(product)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => openDelete(product)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl p-0 max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editingId ? t("editProduct") : t("addProduct")}
            </DialogTitle>
            <DialogDescription className="text-amber-200 mt-1 flex items-center gap-2">
              {editingId ? "修改商品信息" : "SKU 已自动生成，可手动修改"}
            </DialogDescription>
          </div>

          <div className="px-6 py-5">
            {/* SKU - editable for new */}
            {!editingId && (
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 mb-5 flex items-center gap-3">
                <Tag className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">SKU</p>
                  <Input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="font-mono text-lg font-bold h-9 bg-white/50 dark:bg-white/5 border-amber-300 dark:border-amber-500/30"
                    placeholder={nextSku}
                  />
                </div>
                <div className="ml-auto text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">可自定义修改</div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="basic" className="flex-1">基本信息</TabsTrigger>
                <TabsTrigger value="pricing" className="flex-1">价格库存</TabsTrigger>
                <TabsTrigger value="description" className="flex-1">商品描述</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{t("productName")} (中文) <span className="text-red-500">*</span></Label>
                    <Input className="h-10" placeholder="输入商品中文名称" value={form.nameZh} onChange={(e) => setForm({ ...form, nameZh: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{t("productName")} (English)</Label>
                    <Input className="h-10" placeholder="Enter English name" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{t("brand")}</Label>
                    <Input className="h-10" placeholder="品牌名称" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{t("weight")} (g)</Label>
                    <Input type="number" className="h-10" placeholder="0" value={form.weight || ""} onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t("status")}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">{t("statusDraft")}</SelectItem>
                      <SelectItem value="ACTIVE">{t("statusActive")}</SelectItem>
                      <SelectItem value="INACTIVE">{t("statusInactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{t("costPrice")} (MYR)</Label>
                    <Input type="number" step="0.01" className="h-10" placeholder="0.00" value={form.costPrice || ""} onChange={(e) => setForm({ ...form, costPrice: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{t("sellingPrice")} (MYR) <span className="text-red-500">*</span></Label>
                    <Input type="number" step="0.01" className="h-10" placeholder="0.00" value={form.sellingPrice || ""} onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">划线价 (MYR)</Label>
                    <Input type="number" step="0.01" className="h-10" placeholder="0.00" value={form.comparePrice || ""} onChange={(e) => setForm({ ...form, comparePrice: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                {form.costPrice > 0 && form.sellingPrice > 0 && (
                  <div className="bg-emerald-50 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm text-emerald-700">毛利率</span>
                    <span className="font-bold text-emerald-700">
                      {(((form.sellingPrice - form.costPrice) / form.sellingPrice) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t("stock")}</Label>
                  <Input type="number" className="h-10" placeholder="0" value={form.totalStock || ""} onChange={(e) => setForm({ ...form, totalStock: parseInt(e.target.value) || 0 })} />
                </div>
              </TabsContent>

              <TabsContent value="description" className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t("description")} (中文)</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="输入商品描述..."
                    value={form.descZh}
                    onChange={(e) => setForm({ ...form, descZh: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t("description")} (English)</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter product description..."
                    value={form.descEn}
                    onChange={(e) => setForm({ ...form, descEn: e.target.value })}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="border-t bg-muted px-6 py-4 flex justify-end gap-3 rounded-b-lg">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>{tc("cancel")}</Button>
            <Button className="px-6 gap-1.5" onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{tc("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PasswordConfirmDialog
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        onConfirm={async () => { if (pendingAction) await pendingAction(); }}
        action={pwAction}
        itemName={pwItemName}
      />
    </div>
  );
}
