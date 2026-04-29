"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageGallery } from "@/components/ui/image-gallery";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Warehouse as WarehouseIcon,
  Search,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  ClipboardCheck,
  Download,
  Package,
  Loader2,
  Save,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,

  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { formatNumber, formatDate } from "@/lib/utils";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

interface StockItem {
  id: string;
  sku: string;
  name: string;
  nameZh: string;
  image: string | null;
  stock: number;
  purchaseQty: number;
  channelAllocated: number;
  channelSales: number;
  channelStock: number;
  channelStockByChannel?: Record<string, number>;
  realStock: number;
  safetyStock: number;
  status: string;
  warehouse: string;
}

interface MovementItem {
  id: string;
  type: string;
  sku: string;
  quantity: number;
  warehouse: string;
  operator: string;
  note: string;
  date: string;
  channelStockByChannel?: Record<string, number>;
}

interface WarehouseInfo {
  id: string;
  name: string;
  address: string;
  items: number;
}

interface ChannelVariant {
  id: string;
  sku: string;
  nameZh: string;
  nameEn: string;
  stock: number;
  image: string | null;
  purchaseQty: number;
  channelAllocated: number;
  channelSales: Record<string, number>;
  product: { nameZh: string; nameEn: string };
}

interface AllocationMap {
  [variantId: string]: {
    [channelId: string]: { allocated: number; reserved: number };
  };
}

interface ChannelInfo {
  id: string;
  name: string;
  code: string;
  color: string | null;
}

const statusColors: Record<string, string> = {
  normal: "text-emerald-600",
  low: "text-gold-600",
  critical: "text-red-600",
  out: "text-red-700",
};

const typeIcons: Record<string, { icon: any; color: string; label: string }> = {
  INBOUND: { icon: ArrowDown, color: "text-emerald-600 bg-emerald-50", label: "入库" },
  OUTBOUND: { icon: ArrowUp, color: "text-red-600 bg-red-50", label: "出库" },
  TRANSFER: { icon: ArrowLeftRight, color: "text-blue-600 bg-blue-50", label: "调拨" },
  ADJUSTMENT: { icon: ClipboardCheck, color: "text-gold-600 bg-gold-50", label: "调整" },
  STOCKTAKE: { icon: ClipboardCheck, color: "text-purple-600 bg-purple-50", label: "盘点" },
};

export default function InventoryPage() {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const tch = useTranslations("channels");

  const [search, setSearch] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("stock");
  const [loading, setLoading] = useState(true);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [movementPage, setMovementPage] = useState(1);
  const [warehouses, setWarehouses] = useState<WarehouseInfo[]>([]);
  const [stockChannels, setStockChannels] = useState<ChannelInfo[]>([]);
  const [stockPage, setStockPage] = useState(1);
  const [stockTotal, setStockTotal] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const stockPageSize = 20;

  // Channel inventory tab state
  const [inventoryChannels, setInventoryChannels] = useState<ChannelInfo[]>([]);
  const [variants, setVariants] = useState<ChannelVariant[]>([]);
  const [allocationMap, setAllocationMap] = useState<AllocationMap>({});
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [editingAllocations, setEditingAllocations] = useState<
    Record<string, Record<string, number>>
  >({});
  const [savingInventory, setSavingInventory] = useState(false);
  const [expandedChannelIds, setExpandedChannelIds] = useState<string[]>([]);
  const [channelSearch, setChannelSearch] = useState("");
  const [channelPages, setChannelPages] = useState<Record<string, number>>({});
  const channelPageSize = 20;
  const movementPageSize = 20;

  // Transfer dialog state
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferProduct, setTransferProduct] = useState<StockItem | null>(null);
  const [transferChannels, setTransferChannels] = useState<ChannelInfo[]>([]);
  const [transferVariantId, setTransferVariantId] = useState<string | null>(null);
  const [transferAllocations, setTransferAllocations] = useState<Record<string, number>>({});
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferSaving, setTransferSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: stockPage.toString(),
        pageSize: stockPageSize.toString(),
      });
      if (search) params.set("search", search);
      if (stockStatusFilter !== "all") params.set("status", stockStatusFilter);
      const res = await fetch(`/api/inventory?${params}`);
      const data = await res.json();
      setStockItems(data.products || []);
      setStockTotal(data.total || 0);
      setLowStockCount(data.lowStockCount || 0);
      setMovements(data.actions || []);
      setWarehouses(data.warehouses || []);
      setStockChannels(data.channels || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [stockPage, search, stockStatusFilter]);

  const fetchChannelInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const params = new URLSearchParams({ all: "1" });
      if (channelSearch) params.set("search", channelSearch);
      const res = await fetch(`/api/channels/inventory?${params}`);
      if (res.ok) {
        const data = await res.json();
        const chs = data.channels || [];
        setInventoryChannels(chs);
        setVariants(data.variants || []);
        setAllocationMap(data.allocationMap || {});
        setChannelPages((prev) => {
          const next: Record<string, number> = {};
          chs.forEach((ch: ChannelInfo) => {
            next[ch.id] = prev[ch.id] || 1;
          });
          return next;
        });
        setEditingAllocations({});
      }
    } catch {
      setError(tc("error"));
    } finally {
      setInventoryLoading(false);
    }
  }, [tc, channelSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useAutoRefresh(loadData);

  useEffect(() => {
    if (successMsg || error) {
      const timer = setTimeout(() => {
        setSuccessMsg(null);
        setError(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, error]);

  const handleTabChange = (v: string) => {
    setActiveTab(v);
    if (v === "channel") fetchChannelInventory();
  };

  // Refetch channel inventory when pagination/search changes
  useEffect(() => {
    if (activeTab === "channel") {
      fetchChannelInventory();
    }
  }, [channelSearch, activeTab, fetchChannelInventory]);

  // Channel inventory tab handlers
  const handleAllocationChange = (
    variantId: string,
    channelId: string,
    value: number
  ) => {
    setEditingAllocations((prev) => ({
      ...prev,
      [variantId]: { ...(prev[variantId] || {}), [channelId]: value },
    }));
  };

  const handleSaveInventory = async () => {
    setSavingInventory(true);
    setError(null);
    try {
      for (const [variantId] of Object.entries(editingAllocations)) {
        const variant = variants.find((v) => v.id === variantId);
        if (!variant) continue;
        const totalAllocated = inventoryChannels.reduce(
          (sum, ch) => sum + getAllocationValue(variantId, ch.id),
          0
        );
        if (totalAllocated > variant.purchaseQty) {
          throw new Error(
            `SKU ${variant.sku} 分配失败：渠道分配总数(${totalAllocated})不能超过采购数量(${variant.purchaseQty})`
          );
        }
      }

      for (const [variantId, channelAllocs] of Object.entries(editingAllocations)) {
        for (const [channelId, allocated] of Object.entries(channelAllocs)) {
          const res = await fetch("/api/channels/inventory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channelId, variantId, allocated }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data?.error || tc("error"));
          }
        }
      }
      setSuccessMsg(tch("inventorySaved"));
      fetchChannelInventory();
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingInventory(false);
    }
  };

  const getAllocationValue = (variantId: string, channelId: string): number => {
    if (editingAllocations[variantId]?.[channelId] !== undefined) {
      return editingAllocations[variantId][channelId];
    }
    return allocationMap[variantId]?.[channelId]?.allocated || 0;
  };

  // Transfer dialog handlers
  const openTransferDialog = async (item: StockItem) => {
    setTransferProduct(item);
    setShowTransferDialog(true);
    setTransferLoading(true);
    setTransferAllocations({});
    setTransferVariantId(null);

    try {
      const res = await fetch(`/api/channels/inventory?productId=${item.id}`);
      if (res.ok) {
        const data = await res.json();
        setTransferChannels(data.channels || []);
        setTransferVariantId(data.variantId || null);
        setTransferAllocations(data.channelAllocations || {});
      }
    } catch {
      setError(tc("error"));
    } finally {
      setTransferLoading(false);
    }
  };

  const handleTransferAllocationChange = (channelId: string, value: number) => {
    setTransferAllocations((prev) => ({ ...prev, [channelId]: value }));
  };

  const handleSaveTransfer = async () => {
    if (!transferProduct) return;
    setTransferSaving(true);
    setError(null);

    try {
      const requestedTotal = Object.values(transferAllocations).reduce(
        (sum, value) => sum + (value || 0),
        0
      );
      if (requestedTotal > transferProduct.purchaseQty) {
        throw new Error(
          `分配失败：渠道分配总数(${requestedTotal})不能超过采购数量(${transferProduct.purchaseQty})`
        );
      }

      for (const [channelId, allocated] of Object.entries(transferAllocations)) {
        const res = await fetch("/api/channels/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId,
            productId: transferProduct.id,
            variantId: transferVariantId,
            allocated,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || tc("error"));
        }
      }
      setSuccessMsg(t("transferSuccess"));
      setShowTransferDialog(false);
      setTransferProduct(null);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTransferSaving(false);
    }
  };

  const transferTotalAllocated = Object.values(transferAllocations).reduce(
    (sum, v) => sum + (v || 0),
    0
  );
  const transferUnallocated = (transferProduct?.purchaseQty || 0) - transferTotalAllocated;

  const totalStock = stockItems.reduce((s, i) => s + i.stock, 0);
  const filteredStockItems = stockItems;
  const stockTotalPages = Math.ceil(stockTotal / stockPageSize);
  const movementTotalPages = Math.max(1, Math.ceil(movements.length / movementPageSize));
  const currentMovementPage = Math.min(movementPage, movementTotalPages);
  const pagedMovements = movements.slice(
    (currentMovementPage - 1) * movementPageSize,
    currentMovementPage * movementPageSize
  );

  useEffect(() => {
    if (movementPage > movementTotalPages) setMovementPage(movementTotalPages);
  }, [movementPage, movementTotalPages]);

  useEffect(() => {
    if (inventoryChannels.length === 0) return;
    setChannelPages((prev) => {
      const next: Record<string, number> = {};
      let changed = false;
      for (const ch of inventoryChannels) {
        const channelItems = variants.filter((v) => {
          const edited = editingAllocations[v.id]?.[ch.id];
          const allocated = edited !== undefined
            ? edited
            : allocationMap[v.id]?.[ch.id]?.allocated || 0;
          return allocated > 0;
        });
        const channelTotalPages = Math.max(1, Math.ceil(channelItems.length / channelPageSize));
        const current = prev[ch.id] || 1;
        const clamped = Math.min(current, channelTotalPages);
        next[ch.id] = clamped;
        if (clamped !== current || !(ch.id in prev)) changed = true;
      }
      if (Object.keys(prev).length !== Object.keys(next).length) changed = true;
      return changed ? next : prev;
    });
  }, [inventoryChannels, variants, channelPageSize, editingAllocations, allocationMap]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="text-sm">{successMsg}</span>
        </div>
      )}

      {/* Warehouse Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {warehouses.map((wh) => (
          <Card key={wh.id}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gold-50 rounded-lg">
                    <WarehouseIcon className="h-5 w-5 text-gold-700" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{wh.name}</p>
                    <p className="text-xs text-muted-foreground">{wh.address}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">商品种类</span>
                  <span className="font-semibold">{stockTotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("currentStock")}</span>
                  <span className="font-semibold">{formatNumber(wh.items)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {warehouses.length === 0 && !loading && (
          <Card>
            <CardContent className="p-5 text-center text-muted-foreground text-sm">
              暂无仓库数据
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">总库存量</p>
              <p className="text-2xl font-bold mt-1">{formatNumber(totalStock)}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl">
              <Package className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">低库存</p>
              <p className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? "text-gold-600" : ""}`}>{lowStockCount}</p>
            </div>
            <div className="bg-gold-50 p-3 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-gold-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {lowStockCount > 0 && (
        <Card className="border-gold-200 dark:border-gold-500/30 bg-gold-50/50 dark:bg-gold-400/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-gold-600" />
            <span className="text-sm font-medium text-gold-600 dark:text-gold-400">
              {lowStockCount} {t("lowStockAlert")}
            </span>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="stock">{t("currentStock")}</TabsTrigger>
            <TabsTrigger value="movements">{t("stockMovement")}</TabsTrigger>
            <TabsTrigger value="channel">{tch("channelInventory")}</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" />
            {t("stockReport")}
          </Button>
        </div>

        {/* Current Stock Tab */}
        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <div className="flex gap-3">
                  <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索 SKU、商品名称..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setStockPage(1); }}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={stockStatusFilter}
                    onValueChange={(value) => { setStockStatusFilter(value); setStockPage(1); }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("statusAll")}</SelectItem>
                      <SelectItem value="normal">{t("statusNormal")}</SelectItem>
                      <SelectItem value="low">{t("statusLow")}</SelectItem>
                      <SelectItem value="critical">{t("statusCritical")}</SelectItem>
                      <SelectItem value="out">{t("statusOut")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-gold-700" />
                </div>
              ) : filteredStockItems.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{tc("noData")}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    创建采购单后商品会自动同步到这里
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[90px]">SKU</TableHead>
                        <TableHead className="min-w-[60px]">商品图片</TableHead>
                        <TableHead className="min-w-[80px]">采购数量</TableHead>
                        <TableHead className="min-w-[100px]">渠道分配数量</TableHead>
                        <TableHead className="min-w-[80px]">{t("currentStock")}</TableHead>
                        <TableHead className="min-w-[80px]">渠道销售</TableHead>
                        <TableHead className="min-w-[80px]">渠道库存</TableHead>
                        {stockChannels.map((ch) => (
                          <TableHead key={`stock-channel-${ch.id}`} className="min-w-[100px]">
                            {ch.name}库存
                          </TableHead>
                        ))}
                        <TableHead className="min-w-[80px]">真实库存</TableHead>
                        <TableHead className="min-w-[60px]">{tc("status")}</TableHead>
                        <TableHead className="text-center min-w-[80px]">渠道分配</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStockItems.map((item) => (
                        <TableRow key={item.sku}>
                          <TableCell className="font-mono text-sm">
                            {item.sku}
                          </TableCell>
                          <TableCell>
                            <ImageGallery
                              images={(item as any).allImages || (item.image ? [item.image] : [])}
                              alt={item.name}
                            />
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.purchaseQty}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.channelAllocated}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.stock}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.channelSales}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.channelStock}
                          </TableCell>
                          {stockChannels.map((ch) => (
                            <TableCell key={`stock-row-${item.sku}-${ch.id}`} className="text-sm">
                              {item.channelStockByChannel?.[ch.id] || 0}
                            </TableCell>
                          ))}
                          <TableCell className="text-sm">
                            {item.realStock}
                          </TableCell>
                          <TableCell>
                            {item.status === "out" && <Badge variant="destructive">缺货</Badge>}
                            {item.status === "critical" && <Badge variant="warning">紧急</Badge>}
                            {item.status === "low" && <Badge variant="warning">偏低</Badge>}
                            {item.status === "normal" && <Badge variant="success">正常</Badge>}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 h-7 text-xs"
                              onClick={() => openTransferDialog(item)}
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                              {t("allocate")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {stockTotalPages > 1 && (
                <PaginationControls
                  className="border-t px-4 py-3"
                  page={stockPage}
                  totalPages={stockTotalPages}
                  totalItems={stockTotal}
                  onPageChange={setStockPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Movements Tab */}
        <TabsContent value="movements" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-gold-700" />
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">暂无出入库记录</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>类型</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>{t("quantity")}</TableHead>
                        <TableHead>仓库</TableHead>
                        <TableHead>操作人</TableHead>
                        {stockChannels.map((ch) => (
                          <TableHead key={`mv-channel-${ch.id}`} className="min-w-[100px]">
                            {ch.name}库存
                          </TableHead>
                        ))}
                        <TableHead>日期</TableHead>
                        <TableHead>备注</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedMovements.map((mv) => {
                        const typeInfo = typeIcons[mv.type] || typeIcons.INBOUND;
                        const Icon = typeInfo.icon;
                        return (
                          <TableRow key={mv.id}>
                            <TableCell>
                              <div
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${typeInfo.color}`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">{typeInfo.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {mv.sku}
                            </TableCell>
                            <TableCell className="text-sm">
                              {mv.quantity > 0 ? `+${mv.quantity}` : mv.quantity}
                            </TableCell>
                            <TableCell className="text-sm">{mv.warehouse}</TableCell>
                            <TableCell className="text-sm">{mv.operator}</TableCell>
                            {stockChannels.map((ch) => (
                              <TableCell key={`mv-row-${mv.id}-${ch.id}`} className="text-sm">
                                {mv.channelStockByChannel?.[ch.id] || 0}
                              </TableCell>
                            ))}
                            <TableCell className="text-sm">
                              {formatDate(mv.date)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {mv.note}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              {movements.length > 0 && (
                <PaginationControls
                  className="border-t px-4 py-3"
                  page={currentMovementPage}
                  totalPages={movementTotalPages}
                  totalItems={movements.length}
                  itemLabel="条记录"
                  onPageChange={setMovementPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channel Inventory Tab */}
        <TabsContent value="channel" className="mt-4">
          <div className="space-y-3">
            {/* Header with search and save */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <h3 className="text-base font-semibold shrink-0">
                  {tch("inventoryAllocation")}
                </h3>
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索 SKU、商品名称..."
                    value={channelSearch}
                    onChange={(e) => {
                      setChannelSearch(e.target.value);
                      setChannelPages({});
                    }}
                    className="pl-9"
                  />
                </div>
              </div>
              {Object.keys(editingAllocations).length > 0 && (
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={handleSaveInventory}
                  disabled={savingInventory}
                >
                  {savingInventory ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {tc("save")}
                </Button>
              )}
            </div>

            {inventoryLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : inventoryChannels.length === 0 ? (
              <Card>
                <CardContent className="text-center text-muted-foreground py-12">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>{tch("noVariants")}</p>
                </CardContent>
              </Card>
            ) : (
              (() => {
                return inventoryChannels.map((ch) => {
                  const isExpanded = expandedChannelIds.includes(ch.id);
                  const channelVariants = variants.filter(
                    (v) => getAllocationValue(v.id, ch.id) > 0
                  );
                  const channelTotalPages = Math.max(1, Math.ceil(channelVariants.length / channelPageSize));
                  const currentChannelPage = Math.min(channelPages[ch.id] || 1, channelTotalPages);
                  const pagedChannelVariants = channelVariants.slice(
                    (currentChannelPage - 1) * channelPageSize,
                    currentChannelPage * channelPageSize
                  );
                  const channelTotalAllocated = variants.reduce(
                    (sum, v) => sum + getAllocationValue(v.id, ch.id),
                    0
                  );

                  return (
                    <Card key={ch.id} className="overflow-hidden">
                      {/* Collapsible header */}
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
                        onClick={() =>
                          setExpandedChannelIds((prev) =>
                            isExpanded
                              ? prev.filter((id) => id !== ch.id)
                              : [...prev, ch.id]
                          )
                        }
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: ch.color || "#6b7280" }}
                          />
                          <span className="font-semibold text-sm">{ch.name}</span>
                          <span className="text-xs font-mono text-muted-foreground">
                            ({ch.code})
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            已分配:
                            <span className="ml-1 font-semibold text-foreground">
                              {channelTotalAllocated}
                            </span>
                          </span>
                        </div>
                      </button>

                      {/* Expandable table */}
                      {isExpanded && (
                        <div className="border-t">
                          {channelVariants.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">
                                {channelSearch.trim() ? "没有匹配的已分配商品" : "暂无已分配商品"}
                              </p>
                            </div>
                          ) : (
                            <>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="min-w-[90px]">SKU</TableHead>
                                    <TableHead className="min-w-[60px]">商品图片</TableHead>
                                    <TableHead className="min-w-[80px]">采购数量</TableHead>
                                    <TableHead className="min-w-[100px]">
                                      分配数量
                                    </TableHead>
                                    <TableHead className="min-w-[80px]">
                                      渠道销售
                                    </TableHead>
                                    <TableHead className="min-w-[80px]">
                                      渠道库存
                                    </TableHead>
                                    <TableHead className="min-w-[80px]">
                                      {tch("unallocated")}
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {pagedChannelVariants.map((v) => {
                                    const allocated = getAllocationValue(v.id, ch.id);
                                    const totalAllocatedAllChannels = inventoryChannels.reduce(
                                      (sum, c) => sum + getAllocationValue(v.id, c.id),
                                      0
                                    );
                                    const unallocated = v.purchaseQty - totalAllocatedAllChannels;
                                    const channelStock = Math.max(0, allocated - (v.channelSales[ch.id] || 0));
                                    return (
                                      <TableRow key={v.id}>
                                        <TableCell className="font-mono text-sm">
                                          {v.sku}
                                        </TableCell>
                                        <TableCell>
                                          <ImageGallery
                                            images={(v as any).allImages || (v.image ? [v.image] : [])}
                                            alt={v.sku}
                                          />
                                        </TableCell>
                                        <TableCell className="text-sm">
                                          {v.purchaseQty}
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            min={0}
                                            className="w-20 mx-auto text-center h-8 text-sm"
                                            value={allocated || ""}
                                            onChange={(e) => {
                                              const raw = e.target.value;
                                              handleAllocationChange(
                                                v.id,
                                                ch.id,
                                                raw === "" ? 0 : parseInt(raw) || 0
                                              );
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell className="text-sm">
                                          {v.channelSales[ch.id] || 0}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                          {channelStock}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                          {allocated > 0 ? (
                                            unallocated
                                          ) : (
                                            ""
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                              <PaginationControls
                                className="border-t px-4 py-3"
                                page={currentChannelPage}
                                totalPages={channelTotalPages}
                                totalItems={channelVariants.length}
                                itemLabel="个变体"
                                onPageChange={(page) =>
                                  setChannelPages((prev) => ({ ...prev, [ch.id]: page }))
                                }
                              />
                            </>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                });
              })()
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Transfer to Channel Dialog */}
      <Dialog
        open={showTransferDialog}
        onOpenChange={(open) => {
          setShowTransferDialog(open);
          if (!open) setTransferProduct(null);
        }}
      >
        <DialogContent className="max-w-2xl p-0">
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              {t("allocateToChannel")}
            </DialogTitle>
            {transferProduct && (
              <DialogDescription className="text-gold-200 mt-1">
                {transferProduct.name} · <span className="font-mono">{transferProduct.sku}</span> · {t("totalWarehouseStock")}: <span className="font-semibold text-white">{transferProduct.stock}</span>
              </DialogDescription>
            )}
          </div>
          <div className="px-6 pb-6">

          {transferProduct && (
            <div className="space-y-3">
              {transferLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : transferChannels.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">
                  <p>{t("noChannelsAvailable")}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {transferChannels.map((ch) => {
                      const val = transferAllocations[ch.id];
                      return (
                        <div
                          key={ch.id}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg border"
                        >
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: ch.color || "#6b7280" }}
                          >
                            {ch.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium flex-1 truncate">{ch.name}</span>
                            <Input
                              type="number"
                              min={0}
                              max={transferProduct.purchaseQty}
                              placeholder=""
                              className="w-20 text-center h-8 text-sm"
                              value={val !== undefined && val !== 0 ? val : ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              handleTransferAllocationChange(
                                ch.id,
                                raw === "" ? 0 : parseInt(raw) || 0
                              );
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-4 py-2">
                    <span>{t("totalAllocated")}: <span className="font-semibold">{transferTotalAllocated}</span></span>
                    <span>
                      {tch("unallocated")}:{" "}
                      <span className={`font-bold ${transferUnallocated < 0 ? "text-destructive" : "text-emerald-600"}`}>
                        {transferUnallocated}
                      </span>
                    </span>
                    {transferUnallocated < 0 && (
                      <span className="inline-flex items-center rounded-full border border-destructive/25 bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
                        {t("overAllocatedWarning")}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTransferDialog(false);
                setTransferProduct(null);
              }}
              disabled={transferSaving}
            >
              {tc("cancel")}
            </Button>
            <Button
              className="gap-1"
              onClick={handleSaveTransfer}
              disabled={
                transferSaving ||
                transferLoading ||
                transferChannels.length === 0
              }
            >
              {transferSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("confirmAllocate")}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
