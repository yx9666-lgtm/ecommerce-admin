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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Download,
  Truck,
  Eye,
  Edit,
  Package,
  MapPin,
  CreditCard,
  MessageSquare,
  RotateCcw,
  Plus,
  Loader2,
  Trash2,
  ShoppingCart,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

interface Channel {
  id: string;
  name: string;
  code: string;
  color: string | null;
  icon: string | null;
  shopUsername: string | null;
}

interface OrderItem {
  id: string;
  name: string;
  sku: string | null;
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
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
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
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editShippingFee, setEditShippingFee] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editBuyerNote, setEditBuyerNote] = useState("");
  const [editSellerNote, setEditSellerNote] = useState("");
  const [editOrderStatus, setEditOrderStatus] = useState("PENDING_PAYMENT");
  const [editItems, setEditItems] = useState<NewOrderItem[]>([
    { productId: "", sku: "", name: "", quantity: "", unitPrice: "" },
  ]);

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
  }, [page, pageSize, statusFilter, channelFilter, search]);

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

  const fetchProducts = useCallback(async (searchTerm?: string) => {
    try {
      const params = new URLSearchParams({
        pageSize: "20",
        status: "ACTIVE",
        fields: "minimal",
      });
      if (searchTerm) params.set("search", searchTerm);
      const res = await fetch(`/api/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(
          (data.items || []).map((p: any) => ({
            id: p.id,
            sku: p.sku,
            nameZh: p.nameZh,
            nameEn: p.nameEn,
            sellingPrice: p.sellingPrice,
          }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    if (showCreateDialog) {
      fetchProducts();
    }
  }, [showCreateDialog, fetchProducts]);

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

  const totalPages = Math.ceil(total / pageSize);

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
    setNewCustomerName("");
    setNewCustomerPhone("");
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
          customerName: newCustomerName || undefined,
          customerPhone: newCustomerPhone || undefined,
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
    setEditCustomerName(order.customer?.name || "");
    setEditCustomerPhone(order.customer?.phone || "");
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
    fetchProducts();
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
          status: editOrderStatus,
          customerName: editCustomerName || undefined,
          customerPhone: editCustomerPhone || undefined,
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
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`${tc("search")} ${t("orderId")}, ${t("customer")}...`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={channelFilter}
            onValueChange={(v) => {
              setChannelFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
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
            <Truck className="h-4 w-4" />
            {t("batchShip")}
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
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      className="rounded border-muted-foreground/30"
                    />
                  </TableHead>
                  <TableHead>{t("orderId")}</TableHead>
                  <TableHead>{t("channel")}</TableHead>
                  <TableHead>渠道用户名</TableHead>
                  <TableHead>{t("customer")}</TableHead>
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-muted-foreground/30"
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">
                          {order.platformOrderId}
                        </p>
                      </TableCell>
                      <TableCell>{getChannelBadge(order)}</TableCell>
                      <TableCell className="text-sm">
                        {order.channel?.shopUsername || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.customer?.name || "-"}
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
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10" onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10" onClick={() => openEditDialog(order)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={async () => {
                            if (!confirm("确定要删除此订单吗？")) return;
                            await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
                            fetchOrders();
                          }}>
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
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tc("showing")} {orders.length} {tc("of")} {total} {tc("items")}
        </p>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            {tc("previous")}
          </Button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(
            (p) => (
              <Button
                key={p}
                variant="outline"
                size="sm"
                className={
                  p === page ? "bg-primary text-primary-foreground" : ""
                }
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            )
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            {tc("next")}
          </Button>
        </div>
      </div>

      {/* Order Detail Dialog */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {t("orderDetail")} - {selectedOrder?.platformOrderId}
            </DialogTitle>
            <DialogDescription className="text-amber-200 mt-1">
              {selectedOrder?.channel?.name || selectedOrder?.platform || ""}
            </DialogDescription>
          </div>
          <div className="p-6">
          {selectedOrder && (
            <Tabs defaultValue="items">
              <TabsList className="w-full">
                <TabsTrigger value="items" className="flex-1 gap-1">
                  <Package className="h-4 w-4" />
                  {t("items")}
                </TabsTrigger>
                <TabsTrigger value="shipping" className="flex-1 gap-1">
                  <MapPin className="h-4 w-4" />
                  {t("shipping")}
                </TabsTrigger>
                <TabsTrigger value="payment" className="flex-1 gap-1">
                  <CreditCard className="h-4 w-4" />
                  {t("payment")}
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex-1 gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {t("notes")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="items" className="space-y-4 mt-4">
                <div className="space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
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
              </TabsContent>
              <TabsContent value="shipping" className="mt-4">
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">
                      {selectedOrder.customer?.name || "-"}
                    </p>
                    {selectedOrder.customer?.phone && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedOrder.customer.phone}
                      </p>
                    )}
                    {selectedOrder.shippingAddress && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {typeof selectedOrder.shippingAddress === "string"
                          ? selectedOrder.shippingAddress
                          : JSON.stringify(selectedOrder.shippingAddress)}
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="payment" className="mt-4">
                <div className="space-y-3">
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
              </TabsContent>
              <TabsContent value="notes" className="mt-4">
                <div className="space-y-3">
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
              </TabsContent>
            </Tabs>
          )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {t("createOrder")}
            </DialogTitle>
            <DialogDescription className="text-amber-200 mt-1">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("channelUserName")} *</Label>
                <Select value={newChannelId} onValueChange={setNewChannelId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectChannelUserName")} />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: ch.color || "#6b7280",
                            }}
                          />
                          {ch.shopUsername || ch.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("channelUserNameHint")}
                </p>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("customer")}</Label>
                <Input
                  placeholder={t("customerName")}
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("phone")}</Label>
                <Input
                  placeholder="+60..."
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">{t("orderItems")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={addItem}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("addItem")}
                </Button>
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
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectChannel")} />
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
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Edit className="h-5 w-5" />
              编辑订单 - {editingOrder?.platformOrderId}
            </DialogTitle>
            <DialogDescription className="text-amber-200 mt-1">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("channelUserName")} *</Label>
                <Select value={editChannelId} onValueChange={setEditChannelId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectChannelUserName")} />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: ch.color || "#6b7280",
                            }}
                          />
                          {ch.shopUsername || ch.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("customer")}</Label>
                <Input
                  placeholder={t("customerName")}
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("phone")}</Label>
                <Input
                  placeholder="+60..."
                  value={editCustomerPhone}
                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">{t("orderItems")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={addEditItem}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("addItem")}
                </Button>
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
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={item.sku ? `${item.sku} - ${item.name}` : t("selectChannel")} />
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
    </div>
  );
}
