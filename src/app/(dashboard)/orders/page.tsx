"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PasswordConfirmDialog } from "@/components/password-confirm";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ImageGallery } from "@/components/ui/image-gallery";
import {
  Search,
  Download,
  Eye,
  Edit,
  Package,
  CreditCard,
  MessageSquare,
  RotateCcw,
  Plus,
  Loader2,
  Trash2,
  ShoppingCart,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

interface Channel {
  id: string;
  name: string;
  code: string;
  color: string | null;
  icon: string | null;
  shopUsername: string | null;
  isActive: boolean;
}

interface OrderItem {
  id: string;
  name: string;
  sku: string | null;
  imageUrls?: string[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: string;
  platformOrderId: string;
  platform: string | null;
  channelId: string | null;
  channel: Channel | null;
  customer: { name: string; phone?: string; email?: string } | null;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  tax: number;
  totalAmount: number;
  status: string;
  buyerNote: string | null;
  sellerNote: string | null;
  shippingAddress: any;
  orderDate?: string | null;
  paidAt: string | null;
  createdAt: string;
}

const statusConfig: Record<
  string,
  {
    key: string;
    variant:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | "success"
      | "warning"
      | "info";
  }
> = {
  PENDING_PAYMENT: { key: "statusPendingPayment", variant: "warning" },
  PENDING_SHIPMENT: { key: "statusPendingShipment", variant: "info" },
  SHIPPED: { key: "statusShipped", variant: "default" },
  DELIVERED: { key: "statusDelivered", variant: "secondary" },
  COMPLETED: { key: "statusCompleted", variant: "success" },
  CANCELLED: { key: "statusCancelled", variant: "destructive" },
  REFUND_PENDING: { key: "statusRefundPending", variant: "warning" },
  REFUNDED: { key: "statusRefunded", variant: "secondary" },
};

interface ProductOption {
  id: string;
  sku: string;
  nameZh: string;
  nameEn: string;
  sellingPrice: number;
}

interface NewOrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: string;
  unitPrice: string;
}

function getTodayDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function OrdersPage() {
  const t = useTranslations("orders");
  const tc = useTranslations("common");

  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [newChannelId, setNewChannelId] = useState("");
  const [newOrderId, setNewOrderId] = useState("");
  const [newOrderDate, setNewOrderDate] = useState(getTodayDate());
  const [newShippingFee, setNewShippingFee] = useState("");
  const [newDiscount, setNewDiscount] = useState("");
  const [newBuyerNote, setNewBuyerNote] = useState("");
  const [newOrderStatus, setNewOrderStatus] = useState("PENDING_PAYMENT");
  const [newItems, setNewItems] = useState<NewOrderItem[]>([
    { productId: "", sku: "", name: "", quantity: "", unitPrice: "" },
  ]);

  // Edit form state
  const [editChannelId, setEditChannelId] = useState("");
  const [editOrderId, setEditOrderId] = useState("");
  const [editOrderDate, setEditOrderDate] = useState("");
  const [editShippingFee, setEditShippingFee] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editBuyerNote, setEditBuyerNote] = useState("");
  const [editSellerNote, setEditSellerNote] = useState("");
  const [editOrderStatus, setEditOrderStatus] = useState("PENDING_PAYMENT");
  const [editItems, setEditItems] = useState<NewOrderItem[]>([
    { productId: "", sku: "", name: "", quantity: "", unitPrice: "" },
  ]);

  const [pwAction, setPwAction] = useState<"edit" | "delete">("delete");
  const [pwOpen, setPwOpen] = useState(false);
  const [pwItemName, setPwItemName] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(
    null
  );

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (channelFilter !== "all") params.set("channelId", channelFilter);
      if (search) params.set("search", search);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.items || []);
        setTotal(data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, channelFilter, search, startDate, endDate]);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.items || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchProducts = useCallback(async (searchTerm?: string, channelId?: string) => {
    if (!channelId) {
      setProducts([]);
      return;
    }
    try {
      const pageSize = 200;
      let page = 1;
      let total = 0;
      const allItems: any[] = [];

      do {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          status: "ACTIVE",
          fields: "minimal",
        });
        if (searchTerm) params.set("search", searchTerm);
        params.set("channelId", channelId);

        const res = await fetch(`/api/products?${params}`);
        if (!res.ok) break;

        const data = await res.json();
        const items = data.items || [];
        total = typeof data.total === "number" ? data.total : items.length;
        allItems.push(...items);

        if (items.length < pageSize) break;
        page += 1;
      } while (allItems.length < total);

      setProducts(
        allItems.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          nameZh: p.nameZh,
          nameEn: p.nameEn,
          sellingPrice: p.sellingPrice,
        }))
      );
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    if (showCreateDialog) {
      fetchProducts(undefined, newChannelId || undefined);
    }
  }, [showCreateDialog, fetchProducts, newChannelId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  useAutoRefresh(fetchOrders);

  const statusCounts = orders.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activeChannels = channels.filter((ch) => ch.isActive);
  const editSelectableChannels = editChannelId
    ? channels.filter((ch) => ch.isActive || ch.id === editChannelId)
    : activeChannels;

  const resetNewItemProducts = useCallback(() => {
    setNewItems((prev) =>
      prev.map((it) => ({
        ...it,
        productId: "",
        sku: "",
        name: "",
        unitPrice: "",
      }))
    );
  }, []);

  const resetEditItemProducts = useCallback(() => {
    setEditItems((prev) =>
      prev.map((it) => ({
        ...it,
        productId: "",
        sku: "",
        name: "",
        unitPrice: "",
      }))
    );
  }, []);

  const getChannelBadge = (order: Order) => {
    if (order.channel) {
      return (
        <Badge
          variant="outline"
          className="border-0 text-xs font-bold text-white"
          style={{ backgroundColor: order.channel.color || "#6b7280" }}
        >
          {order.channel.name}
        </Badge>
      );
    }
    if (order.platform) {
      const colors: Record<string, string> = {
        SHOPEE: "#f97316",
        LAZADA: "#1e3a8a",
        TIKTOK: "#000000",
        PGMALL: "#dc2626",
      };
      return (
        <Badge
          variant="outline"
          className="border-0 text-xs font-bold text-white"
          style={{ backgroundColor: colors[order.platform] || "#6b7280" }}
        >
          {order.platform}
        </Badge>
      );
    }
    return <Badge variant="secondary">-</Badge>;
  };

  const resetCreateForm = () => {
    setNewChannelId("");
    setNewOrderId("");
    setNewOrderDate(getTodayDate());
    setNewShippingFee("");
    setNewDiscount("");
    setNewBuyerNote("");
    setNewOrderStatus("PENDING_PAYMENT");
    setNewItems([{ productId: "", sku: "", name: "", quantity: "", unitPrice: "" }]);
    setCreateError(null);
  };

  const handleCreateOrder = async () => {
    if (!newChannelId || !newOrderId) {
      setCreateError(t("channelAndOrderIdRequired"));
      return;
    }
    const validItems = newItems.filter((i) => i.sku && (parseInt(i.quantity) || 0) > 0);
    if (validItems.length === 0) {
      setCreateError(t("atLeastOneItem"));
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: newChannelId,
          platformOrderId: newOrderId,
          orderDate: newOrderDate || undefined,
          shippingFee: parseFloat(newShippingFee) || 0,
          discount: parseFloat(newDiscount) || 0,
          buyerNote: newBuyerNote || undefined,
          status: newOrderStatus,
          items: validItems.map((i) => ({
            name: i.name || i.sku,
            sku: i.sku || undefined,
            quantity: parseInt(i.quantity) || 0,
            unitPrice: parseFloat(i.unitPrice) || 0,
            productId: i.productId || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || tc("error"));
      }

      setShowCreateDialog(false);
      resetCreateForm();
      fetchOrders();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const addItem = () => {
    setNewItems([...newItems, { productId: "", sku: "", name: "", quantity: "", unitPrice: "" }]);
  };

  const removeItem = (index: number) => {
    if (newItems.length <= 1) return;
    setNewItems(newItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof NewOrderItem, value: any) => {
    setNewItems(
      newItems.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addEditItem = () => {
    setEditItems([...editItems, { productId: "", sku: "", name: "", quantity: "", unitPrice: "" }]);
  };

  const removeEditItem = (index: number) => {
    if (editItems.length <= 1) return;
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const updateEditItem = (index: number, field: keyof NewOrderItem, value: any) => {
    setEditItems(
      editItems.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const openEditDialog = (order: Order) => {
    setEditChannelId(order.channelId || "");
    setEditOrderId(order.platformOrderId);
    setEditOrderDate(
      order.orderDate
        ? order.orderDate.slice(0, 10)
        : order.createdAt.slice(0, 10)
    );
    setEditShippingFee(order.shippingFee ? String(order.shippingFee) : "");
    setEditDiscount(order.discount ? String(order.discount) : "");
    setEditBuyerNote(order.buyerNote || "");
    setEditSellerNote(order.sellerNote || "");
    setEditOrderStatus(order.status);
    setEditItems(
      order.items.length > 0
        ? order.items.map((item) => ({
            productId: "",
            sku: item.sku || "",
            name: item.name,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
          }))
        : [{ productId: "", sku: "", name: "", quantity: "", unitPrice: "" }]
    );
    setEditError(null);
    setEditingOrder(order);
    fetchProducts(undefined, order.channelId || undefined);
  };

  const requestEditOrder = (order: Order) => {
    setPwAction("edit");
    setPwItemName(order.platformOrderId);
    setPendingAction(() => async () => {
      openEditDialog(order);
    });
    setPwOpen(true);
  };

  const requestDeleteOrder = (order: Order) => {
    setPwAction("delete");
    setPwItemName(order.platformOrderId);
    setPendingAction(() => async () => {
      const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      if (!res.ok) {
        alert("删除失败");
        return;
      }
      fetchOrders();
    });
    setPwOpen(true);
  };

  const handleEditOrder = async () => {
    if (!editingOrder) return;
    const validItems = editItems.filter((i) => i.sku && (parseInt(i.quantity) || 0) > 0);
    if (validItems.length === 0) {
      setEditError(t("atLeastOneItem"));
      return;
    }

    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/orders/${editingOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: editChannelId || undefined,
          platformOrderId: editOrderId || undefined,
          orderDate: editOrderDate || undefined,
          status: editOrderStatus,
          shippingFee: parseFloat(editShippingFee) || 0,
          discount: parseFloat(editDiscount) || 0,
          buyerNote: editBuyerNote || undefined,
          sellerNote: editSellerNote || undefined,
          items: validItems.map((i) => ({
            name: i.name || i.sku,
            sku: i.sku || undefined,
            quantity: parseInt(i.quantity) || 0,
            unitPrice: parseFloat(i.unitPrice) || 0,
            productId: i.productId || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || tc("error"));
      }

      setEditingOrder(null);
      fetchOrders();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const newSubtotal = newItems.reduce(
    (sum, i) => sum + (parseFloat(i.unitPrice) || 0) * (parseInt(i.quantity) || 0),
    0
  );
  const newTotal = newSubtotal + (parseFloat(newShippingFee) || 0) - (parseFloat(newDiscount) || 0);

  const editSubtotal = editItems.reduce(
    (sum, i) => sum + (parseFloat(i.unitPrice) || 0) * (parseInt(i.quantity) || 0),
    0
  );
  const editTotal = editSubtotal + (parseFloat(editShippingFee) || 0) - (parseFloat(editDiscount) || 0);

  return (
    <div className="space-y-6">
      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {Object.entries(statusConfig).map(([key, config]) => (
          <Card
            key={key}
            className={`cursor-pointer transition-all hover:shadow-md ${
              statusFilter === key ? "ring-2 ring-primary" : ""
            }`}
            onClick={() =>
              setStatusFilter(statusFilter === key ? "all" : key)
            }
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{statusCounts[key] || 0}</p>
              <p className="text-xs text-muted-foreground truncate">
                {t(config.key as any)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="w-[150px]">
            <DateInput
              value={startDate}
              placeholder={t("startDate")}
              onChange={(v) => {
                setStartDate(v);
                setPage(1);
              }}
            />
          </div>
          <div className="w-[150px]">
            <DateInput
              value={endDate}
              placeholder={t("endDate")}
              onChange={(v) => {
                setEndDate(v);
                setPage(1);
              }}
            />
          </div>
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`${tc("search")} ${t("orderId")}...`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-10 pl-9"
            />
          </div>
          <Select
            value={channelFilter}
            onValueChange={(v) => {
              setChannelFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 w-[160px]">
              <SelectValue placeholder={t("channel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc("all")}</SelectItem>
              {channels.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>
                  {ch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gap-1"
            onClick={() => {
              resetCreateForm();
              setShowCreateDialog(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {t("createOrder")}
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" />
            {tc("export")}
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{tc("noData")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("orderId")}</TableHead>
                  <TableHead>{t("orderDate")}</TableHead>
                  <TableHead>{t("channel")}</TableHead>
                  <TableHead>渠道用户名</TableHead>
                  <TableHead className="text-center">{t("items")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("createdAt")}</TableHead>
                  <TableHead className="text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const status = statusConfig[order.status] || {
                    key: order.status,
                    variant: "secondary" as const,
                  };
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <TableCell>
                        <p className="font-medium text-sm">
                          {order.platformOrderId}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(order.orderDate || order.createdAt)}
                      </TableCell>
                      <TableCell>{getChannelBadge(order)}</TableCell>
                      <TableCell className="text-sm">
                        {order.channel?.shopUsername || "-"}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {order.items.length}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>
                          {t(status.key as any)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(order.createdAt)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gold-600 dark:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-400/10" onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gold-600 dark:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-400/10" onClick={() => requestEditOrder(order)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => requestDeleteOrder(order)}>
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
          {!loading && total > 0 && (
            <PaginationControls
              className="border-t px-4 py-3"
              page={page}
              totalPages={totalPages}
              totalItems={total}
              prevLabel={tc("previous")}
              nextLabel={tc("next")}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {t("orderDetail")} - {selectedOrder?.platformOrderId}
            </DialogTitle>
            <DialogDescription className="text-gold-200 mt-1">
              {selectedOrder?.channel?.name || selectedOrder?.platform || ""}
            </DialogDescription>
          </div>
          <div className="p-6">
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4" />
                <span>{t("items")}</span>
              </div>
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <ImageGallery
                          images={item.imageUrls || []}
                          alt={item.name}
                          thumbnailSize={48}
                        />
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          {item.sku && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {item.sku}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(item.totalPrice)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          x{item.quantity} @ {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("subtotal")}</span>
                    <span>{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t("shippingFee")}</span>
                    <span>{formatCurrency(selectedOrder.shippingFee)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>{t("discount")}</span>
                      <span>-{formatCurrency(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>{t("total")}</span>
                    <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CreditCard className="h-4 w-4" />
                    <span>{t("payment")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t("channel")}</span>
                    {getChannelBadge(selectedOrder)}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t("status")}</span>
                    <Badge
                      variant={
                        (statusConfig[selectedOrder.status]?.variant ||
                          "secondary") as any
                      }
                    >
                      {t(
                        (statusConfig[selectedOrder.status]?.key ||
                          selectedOrder.status) as any
                      )}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t("total")}</span>
                    <span className="font-semibold">
                      {formatCurrency(selectedOrder.totalAmount)}
                    </span>
                  </div>
                  {selectedOrder.paidAt && (
                    <div className="flex justify-between text-sm">
                      <span>{t("paidAt")}</span>
                      <span>{formatDateTime(selectedOrder.paidAt)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="h-4 w-4" />
                    <span>{t("notes")}</span>
                  </div>
                  {selectedOrder.buyerNote && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {t("buyerNote")}
                      </p>
                      <p className="text-sm">{selectedOrder.buyerNote}</p>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {t("sellerNote")}
                    </p>
                    <p className="text-sm">
                      {selectedOrder.sellerNote || "-"}
                    </p>
                  </div>
                </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {t("createOrder")}
            </DialogTitle>
            <DialogDescription className="text-gold-200 mt-1">
              {t("createOrderDesc")}
            </DialogDescription>
          </div>
          <div className="px-6 pb-6">

          {createError && (
            <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-2 text-sm">
              {createError}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("channelUserName")} *</Label>
                <Select
                  value={newChannelId}
                  onValueChange={(val) => {
                    setNewChannelId(val);
                    resetNewItemProducts();
                    fetchProducts(undefined, val || undefined);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectChannelUserName")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeChannels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: ch.color || "#6b7280",
                            }}
                          />
                          <span className="font-medium">{ch.name}</span>
                          <span className="text-xs text-muted-foreground">({ch.code})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("orderDate")}</Label>
                <DateInput
                  value={newOrderDate}
                  onChange={(val) => setNewOrderDate(val)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("channelOrderId")} *</Label>
                <Input
                  placeholder={t("channelOrderIdPlaceholder")}
                  value={newOrderId}
                  onChange={(e) => setNewOrderId(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center mb-3">
                <Label className="text-sm font-medium">{t("orderItems")}</Label>
              </div>
              <div className="space-y-3">
                {newItems.map((item, index) => (
                  <div key={index} className="flex items-end gap-2 bg-muted/30 rounded-lg p-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">SKU</Label>
                      <Select
                        value={item.productId}
                        onValueChange={(val) => {
                          const product = products.find((p) => p.id === val);
                          if (product) {
                            setNewItems(
                              newItems.map((it, i) =>
                                i === index
                                  ? {
                                      ...it,
                                      productId: product.id,
                                      sku: product.sku,
                                      name: product.nameZh || product.nameEn,
                                      unitPrice: product.sellingPrice ? String(product.sellingPrice) : "",
                                    }
                                  : it
                              )
                            );
                          }
                        }}
                        disabled={!newChannelId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={newChannelId ? t("selectProduct") : t("selectChannel")} />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.sku} - {p.nameZh || p.nameEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20 space-y-1">
                      <Label className="text-xs">{t("qty")}</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder=""
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", e.target.value)
                        }
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-xs">{t("unitPrice")} (RM)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder=""
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(index, "unitPrice", e.target.value)
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(index)}
                      disabled={newItems.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 text-gold-700 border-gold-200 hover:bg-gold-50"
                  onClick={addItem}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("addItem")}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("shippingFee")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  value={newShippingFee}
                  onChange={(e) =>
                    setNewShippingFee(e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("discount")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  value={newDiscount}
                  onChange={(e) =>
                    setNewDiscount(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("buyerNote")}</Label>
                <Input
                  placeholder={t("buyerNotePlaceholder")}
                  value={newBuyerNote}
                  onChange={(e) => setNewBuyerNote(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("status")}</Label>
                <Select value={newOrderStatus} onValueChange={setNewOrderStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING_PAYMENT">待付款</SelectItem>
                    <SelectItem value="PENDING_SHIPMENT">待发货</SelectItem>
                    <SelectItem value="SHIPPED">已发货</SelectItem>
                    <SelectItem value="COMPLETED">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>{t("subtotal")}</span>
                <span>{formatCurrency(newSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t("shippingFee")}</span>
                <span>{formatCurrency(parseFloat(newShippingFee) || 0)}</span>
              </div>
              {(parseFloat(newDiscount) || 0) > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>{t("discount")}</span>
                  <span>-{formatCurrency(parseFloat(newDiscount) || 0)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>{t("total")}</span>
                <span>{formatCurrency(newTotal)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={creating}
            >
              {tc("cancel")}
            </Button>
            <Button
              className="gap-1"
              onClick={handleCreateOrder}
              disabled={creating}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t("createOrder")}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Edit className="h-5 w-5" />
              编辑订单 - {editingOrder?.platformOrderId}
            </DialogTitle>
            <DialogDescription className="text-gold-200 mt-1">
              修改订单信息后点击保存
            </DialogDescription>
          </div>
          <div className="px-6 pb-6">

          {editError && (
            <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-2 text-sm">
              {editError}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t("channelUserName")} *</Label>
                <Select
                  value={editChannelId}
                  onValueChange={(val) => {
                    setEditChannelId(val);
                    resetEditItemProducts();
                    fetchProducts(undefined, val || undefined);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectChannelUserName")} />
                  </SelectTrigger>
                  <SelectContent>
                    {editSelectableChannels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: ch.color || "#6b7280",
                            }}
                          />
                          <span className="font-medium">{ch.name}</span>
                          <span className="text-xs text-muted-foreground">({ch.code})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("orderDate")}</Label>
                <DateInput
                  value={editOrderDate}
                  onChange={(v) => setEditOrderDate(v)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("channelOrderId")} *</Label>
                <Input
                  placeholder={t("channelOrderIdPlaceholder")}
                  value={editOrderId}
                  onChange={(e) => setEditOrderId(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center mb-3">
                <Label className="text-sm font-medium">{t("orderItems")}</Label>
              </div>
              <div className="space-y-3">
                {editItems.map((item, index) => (
                  <div key={index} className="flex items-end gap-2 bg-muted/30 rounded-lg p-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">SKU</Label>
                      <Select
                        value={item.productId}
                        onValueChange={(val) => {
                          const product = products.find((p) => p.id === val);
                          if (product) {
                            setEditItems(
                              editItems.map((it, i) =>
                                i === index
                                  ? {
                                      ...it,
                                      productId: product.id,
                                      sku: product.sku,
                                      name: product.nameZh || product.nameEn,
                                      unitPrice: product.sellingPrice ? String(product.sellingPrice) : "",
                                    }
                                  : it
                              )
                            );
                          }
                        }}
                        disabled={!editChannelId}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              item.sku
                                ? `${item.sku} - ${item.name}`
                                : (editChannelId ? t("selectProduct") : t("selectChannel"))
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.sku} - {p.nameZh || p.nameEn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20 space-y-1">
                      <Label className="text-xs">{t("qty")}</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder=""
                        value={item.quantity}
                        onChange={(e) =>
                          updateEditItem(index, "quantity", e.target.value)
                        }
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-xs">{t("unitPrice")} (RM)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder=""
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateEditItem(index, "unitPrice", e.target.value)
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeEditItem(index)}
                      disabled={editItems.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 text-gold-700 border-gold-200 hover:bg-gold-50"
                  onClick={addEditItem}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("addItem")}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("shippingFee")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  value={editShippingFee}
                  onChange={(e) => setEditShippingFee(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("discount")}</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  value={editDiscount}
                  onChange={(e) => setEditDiscount(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("buyerNote")}</Label>
                <Input
                  placeholder={t("buyerNotePlaceholder")}
                  value={editBuyerNote}
                  onChange={(e) => setEditBuyerNote(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>卖家备注</Label>
                <Input
                  placeholder="卖家备注..."
                  value={editSellerNote}
                  onChange={(e) => setEditSellerNote(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("status")}</Label>
              <Select value={editOrderStatus} onValueChange={setEditOrderStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING_PAYMENT">待付款</SelectItem>
                  <SelectItem value="PENDING_SHIPMENT">待发货</SelectItem>
                  <SelectItem value="SHIPPED">已发货</SelectItem>
                  <SelectItem value="COMPLETED">已完成</SelectItem>
                  <SelectItem value="CANCELLED">已取消</SelectItem>
                  <SelectItem value="REFUND_PENDING">退款中</SelectItem>
                  <SelectItem value="REFUNDED">已退款</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>{t("subtotal")}</span>
                <span>{formatCurrency(editSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t("shippingFee")}</span>
                <span>{formatCurrency(parseFloat(editShippingFee) || 0)}</span>
              </div>
              {(parseFloat(editDiscount) || 0) > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>{t("discount")}</span>
                  <span>-{formatCurrency(parseFloat(editDiscount) || 0)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>{t("total")}</span>
                <span>{formatCurrency(editTotal)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingOrder(null)}
              disabled={saving}
            >
              {tc("cancel")}
            </Button>
            <Button
              className="gap-1"
              onClick={handleEditOrder}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Edit className="h-4 w-4" />
              )}
              {tc("save")}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <PasswordConfirmDialog
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        onConfirm={async () => {
          if (pendingAction) await pendingAction();
        }}
        action={pwAction}
        itemName={pwItemName}
      />
    </div>
  );
}
