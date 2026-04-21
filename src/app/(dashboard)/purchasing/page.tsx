"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  ClipboardList,
  Truck,
  DollarSign,
  Loader2,
  Trash2,
  ImagePlus,
  ArrowRightLeft,
  Package,
  Receipt,
  Eye,
  Edit,
  AlertTriangle,
  Save,
} from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { PasswordConfirmDialog } from "@/components/password-confirm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

interface Supplier {
  id: string;
  name: string;
  supplierNo: string;
}
interface Warehouse {
  id: string;
  name: string;
}
interface POItem {
  productName: string;
  sku: string;
  categoryId: string;
  specs: { name: string; value: string }[];
  images: string[];
  quantity: number | "";
  unitCost: number | "";
}
interface PO {
  id: string;
  poNumber: string;
  status: string;
  supplier: Supplier & { supplierNo?: string };
  supplierInvoiceNo: string | null;
  totalAmount: number;
  totalAmountLocal: number;
  purchaseCurrency: string;
  localCurrency: string;
  exchangeRate: number;
  createdAt: string;
  expectedDate: string | null;
  items: any[];
  refundAmount?: number;
  refundAmountLocal?: number;
}

const currencies = [
  { code: "CNY", name: "人民币 (CNY)", symbol: "¥" },
  { code: "USD", name: "美元 (USD)", symbol: "$" },
  { code: "MYR", name: "马币 (MYR)", symbol: "RM" },
  { code: "SGD", name: "新币 (SGD)", symbol: "S$" },
  { code: "THB", name: "泰铢 (THB)", symbol: "฿" },
  { code: "IDR", name: "印尼盾 (IDR)", symbol: "Rp" },
  { code: "VND", name: "越南盾 (VND)", symbol: "₫" },
  { code: "EUR", name: "欧元 (EUR)", symbol: "€" },
  { code: "GBP", name: "英镑 (GBP)", symbol: "£" },
];

const statusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "草稿", color: "bg-gray-500/15 text-gray-600 dark:text-gray-400" },
  SUBMITTED: { label: "已提交", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  CONFIRMED: { label: "已确认", color: "bg-gold-400/15 text-gold-600 dark:text-gold-400" },
  PARTIALLY_RECEIVED: { label: "部分收货", color: "bg-gold-400/15 text-gold-600 dark:text-gold-400" },
  RECEIVED: { label: "已收货", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  CANCELLED: { label: "已取消", color: "bg-red-500/15 text-red-600 dark:text-red-400" },
};

function getCurrencySymbol(code: string) {
  return currencies.find((c) => c.code === code)?.symbol || code;
}

export default function PurchasingPage() {
  const t = useTranslations("purchasing");
  const tc = useTranslations("common");
  const [pos, setPOs] = useState<PO[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<{ id: string; nameZh: string; nameEn: string }[]>([]);
  const [dbRates, setDbRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pwAction, setPwAction] = useState<"edit" | "delete">("delete");
  const [pwOpen, setPwOpen] = useState(false);
  const [pwItemName, setPwItemName] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  const [viewPO, setViewPO] = useState<PO | null>(null);
  const [defectEditing, setDefectEditing] = useState(false);
  const [defectData, setDefectData] = useState<Record<string, { qty: number | ""; note: string }>>({});
  const [savingDefect, setSavingDefect] = useState(false);

  const startDefectEdit = () => {
    if (!viewPO) return;
    const data: Record<string, { qty: number | ""; note: string }> = {};
    for (const item of viewPO.items || []) {
      data[item.id] = { qty: item.defectQty || 0, note: item.defectNote || "" };
    }
    setDefectData(data);
    setDefectEditing(true);
  };

  const saveDefects = async () => {
    if (!viewPO) return;
    setSavingDefect(true);
    try {
      const defects = Object.entries(defectData).map(([itemId, d]) => ({
        itemId,
        defectQty: Number(d.qty) || 0,
        defectNote: d.note,
      }));
      const res = await fetch(`/api/purchasing/${viewPO.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defects }),
      });
      const updated = await res.json();
      setViewPO(updated);
      setDefectEditing(false);
      loadData();
    } catch (e) { console.error(e); }
    setSavingDefect(false);
  };

  const [editingPoId, setEditingPoId] = useState<string | null>(null);

  const openEditPO = (po: PO) => {
    setPwAction("edit");
    setPwItemName(po.poNumber);
    setPendingAction(() => async () => {
      // Fetch full PO with items
      let fullPO = po;
      try {
        const res = await fetch(`/api/purchasing/${po.id}`);
        if (res.ok) fullPO = await res.json();
      } catch { /* use list data as fallback */ }
      setEditingPoId(fullPO.id);
      setForm({
        supplierId: fullPO.supplier?.id || "",
        supplierInvoiceNo: (fullPO as any).supplierInvoiceNo || "",
        warehouseId: (fullPO as any).warehouseId || "",
        expectedDate: fullPO.expectedDate ? fullPO.expectedDate.slice(0, 10) : "",
        notes: (fullPO as any).notes || "",
        purchaseCurrency: fullPO.purchaseCurrency || "CNY",
        localCurrency: fullPO.localCurrency || "MYR",
        exchangeRate: fullPO.exchangeRate || dbRates["CNY"] || 1,
        shippingCost: (fullPO as any).shippingCost || 0,
        tax: (fullPO as any).tax || 0,
      });
      setItems(
        (fullPO.items || []).map((item: any) => ({
          productName: item.productName || "",
          sku: item.sku || "",
          categoryId: item.categoryId || "",
          specs: item.specs || [],
          images: item.images || [],
          quantity: item.quantity ?? "",
          unitCost: item.unitCost ?? "",
        }))
      );
      setShowDialog(true);
    });
    setPwOpen(true);
  };

  const openDeletePO = (po: PO) => {
    setPwAction("delete");
    setPwItemName(po.poNumber);
    setPendingAction(() => async () => {
      await fetch(`/api/purchasing/${po.id}`, { method: "DELETE" });
      loadData();
    });
    setPwOpen(true);
  };

  const [nextPoNumber, setNextPoNumber] = useState("PO-00001");
  const [form, setForm] = useState({
    supplierId: "",
    supplierInvoiceNo: "",
    warehouseId: "",
    expectedDate: "",
    notes: "",
    purchaseCurrency: "CNY",
    localCurrency: "MYR",
    exchangeRate: dbRates["CNY"] || 1,
    shippingCost: 0,
    tax: 0,
  });

  const [items, setItems] = useState<POItem[]>([
    { productName: "", sku: "RJ-1001", categoryId: "", specs: [], images: [], quantity: "", unitCost: "" },
  ]);
  const [poStats, setPoStats] = useState({ totalSpend: 0, pendingCount: 0, totalPOs: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [poRes, supRes, whRes, catRes, rateRes] = await Promise.all([
        fetch("/api/purchasing"),
        fetch("/api/suppliers"),
        fetch("/api/warehouses"),
        fetch("/api/categories"),
        fetch("/api/exchange-rates"),
      ]);
      const [poData, supData, whData, catData, rateData] = await Promise.all([
        poRes.json(),
        supRes.json(),
        whRes.json(),
        catRes.json(),
        rateRes.json(),
      ]);
      const poItems = poData.items || [];
      setPOs(poItems);
      setSuppliers(supData.items || []);
      setCategories(Array.isArray(catData) ? catData : []);
      // Build exchange rates lookup from DB
      const ratesMap: Record<string, number> = {};
      if (Array.isArray(rateData)) {
        for (const r of rateData) ratesMap[r.fromCurrency] = r.rate;
      }
      setDbRates(ratesMap);
      setWarehouses(whData.items || []);
      setPoStats({
        totalSpend: poData.stats?.totalSpend || 0,
        pendingCount: poData.stats?.pendingCount || 0,
        totalPOs: poData.total || 0,
      });
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const todayPrefix = `RJ${dateStr}-`;
      const todayCount = poItems.filter((p: PO) => p.poNumber.startsWith(todayPrefix)).length;
      setNextPoNumber(`${todayPrefix}${String(todayCount + 1).padStart(3, "0")}`);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useAutoRefresh(loadData);

  const [nextSkuNum, setNextSkuNum] = useState(1001);

  const fetchNextSku = useCallback(async () => {
    try {
      const res = await fetch("/api/products/next-sku");
      const data = await res.json();
      const num = parseInt((data.sku || "RJ-1001").replace("RJ-", ""), 10);
      setNextSkuNum(isNaN(num) ? 1001 : num);
    } catch { setNextSkuNum(1001); }
  }, []);

  useEffect(() => { fetchNextSku(); }, [fetchNextSku]);

  const getAutoSku = (index: number) => `RJ-${nextSkuNum + index}`;

  const handleCurrencyChange = (currency: string) => {
    const rate = dbRates[currency] || 1;
    setForm({ ...form, purchaseCurrency: currency, exchangeRate: rate });
  };

  const handleAddItem = () =>
    setItems([...items, { productName: "", sku: getAutoSku(items.length), categoryId: "", specs: [], images: [], quantity: "", unitCost: "" }]);

  const handleRemoveItem = (i: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== i));
  };

  const updateItem = (i: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[i] as any)[field] = value;
    setItems(newItems);
  };

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0);
  const totalAmount = subtotal + form.shippingCost + form.tax;
  const totalLocal = form.exchangeRate ? totalAmount / form.exchangeRate : 0;

  const handleSubmit = async () => {
    if (!form.supplierId) return alert("请选择供应商");
    const validItems = items.filter((i) => i.productName && Number(i.quantity) > 0);
    if (validItems.length === 0) return alert("请添加至少一个商品");

    setSaving(true);
    try {
      const url = editingPoId ? `/api/purchasing/${editingPoId}` : "/api/purchasing";
      const method = editingPoId ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: validItems.map((item, idx) => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            unitCost: Number(item.unitCost) || 0,
            sku: editingPoId ? item.sku : getAutoSku(idx),
          })),
        }),
      });
      setShowDialog(false);
      resetForm();
      loadData();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const handleImageUpload = async (index: number, files: FileList) => {
    setUploadingIdx(index);
    const newImages = [...items[index].images];
    for (let f = 0; f < files.length; f++) {
      const formData = new FormData();
      formData.append("file", files[f]);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.url) newImages.push(data.url);
      } catch (e) {
        console.error("Upload failed:", e);
      }
    }
    updateItem(index, "images", newImages);
    setUploadingIdx(null);
  };

  const removeImage = (itemIndex: number, imgIndex: number) => {
    const newImages = items[itemIndex].images.filter((_, i) => i !== imgIndex);
    updateItem(itemIndex, "images", newImages);
  };

  const resetForm = () => {
    setEditingPoId(null);
    setForm({
      supplierId: "",
      supplierInvoiceNo: "",
      warehouseId: "",
      expectedDate: "",
      notes: "",
      purchaseCurrency: "CNY",
      localCurrency: "MYR",
      exchangeRate: dbRates["CNY"] || 1,
      shippingCost: 0,
      tax: 0,
    });
    fetchNextSku();
    setItems([{ productName: "", sku: getAutoSku(0), categoryId: "", specs: [], images: [], quantity: "", unitCost: "" }]);
  };

  const totalSpend = poStats.totalSpend;
  const pendingCount = poStats.pendingCount;

  const pSymbol = getCurrencySymbol(form.purchaseCurrency);
  const lSymbol = getCurrencySymbol(form.localCurrency);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("totalPOs")}</p>
              <p className="text-2xl font-bold mt-1">{poStats.totalPOs}</p>
            </div>
            <div className="bg-gold-50 dark:bg-gold-400/15 p-3 rounded-xl">
              <ClipboardList className="h-6 w-6 text-gold-700" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("pendingDelivery")}</p>
              <p className="text-2xl font-bold mt-1">{pendingCount}</p>
            </div>
            <div className="bg-gold-50 dark:bg-gold-400/15 p-3 rounded-xl">
              <Truck className="h-6 w-6 text-gold-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("thisMonthSpend")}</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalSpend)}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-500/15 p-3 rounded-xl">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">{t("title")}</h3>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setShowDialog(true)}
        >
          <Plus className="h-4 w-4" />
          {t("addPO")}
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gold-700" />
            </div>
          ) : pos.length === 0 ? (
            <div className="text-center py-16">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{tc("noData")}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1"
                onClick={() => setShowDialog(true)}
              >
                <Plus className="h-4 w-4" />
                {t("addPO")}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("poNumber")}</TableHead>
                  <TableHead>采购日期</TableHead>
                  <TableHead>供应商编码</TableHead>
                  <TableHead>供应商单据号</TableHead>
                  <TableHead className="text-center">{t("items")}</TableHead>
                  <TableHead>采购金额</TableHead>
                  <TableHead>本地金额 (MYR)</TableHead>
                  <TableHead className="text-center w-28">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="text-sm font-mono">
                        {po.poNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(po.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {po.supplier?.supplierNo ? po.supplier.supplierNo.replace("SUP-", "") : po.supplier?.name || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {po.supplierInvoiceNo || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {po.items?.length || 0}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getCurrencySymbol(po.purchaseCurrency)}{" "}
                        {po.totalAmount.toLocaleString("en", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatCurrency(po.totalAmountLocal || po.totalAmount)}
                        {(po.refundAmount || 0) > 0 && (
                          <div className="text-xs text-red-500 dark:text-red-400 mt-0.5">退货 -RM {(po.refundAmountLocal || 0).toLocaleString("en", { minimumFractionDigits: 2 })}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gold-600 dark:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-400/10" onClick={async () => {
                            try {
                              const res = await fetch(`/api/purchasing/${po.id}`);
                              if (res.ok) setViewPO(await res.json());
                              else setViewPO(po);
                            } catch { setViewPO(po); }
                          }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gold-600 hover:bg-gold-50" onClick={() => openEditPO(po)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => openDeletePO(po)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ==================== New PO Dialog ==================== */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {editingPoId ? "编辑采购单" : t("addPO")}
            </DialogTitle>
            <DialogDescription className="text-gold-200 mt-1">
              {editingPoId ? "修改采购单信息" : "填写采购单信息，系统将自动计算汇率换算"}
            </DialogDescription>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Section 1: Basic Info */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="w-5 h-5 bg-gold-400/15 rounded flex items-center justify-center text-xs font-bold text-gold-700">
                  1
                </div>
                基本信息
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">采购单号</Label>
                  <div className="h-10 flex items-center bg-gold-50 rounded-md px-3 border border-gold-100">
                    <span className="font-mono text-sm font-bold text-gold-700">{nextPoNumber}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    供应商编号 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.supplierId}
                    onValueChange={(v) => setForm({ ...form, supplierId: v })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="选择供应商编号" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="font-mono font-semibold">{s.supplierNo ? s.supplierNo.replace("SUP-", "") : "-"}</span>
                          <span className="text-muted-foreground ml-2">{s.name}</span>
                        </SelectItem>
                      ))}
                      {suppliers.length === 0 && (
                        <SelectItem value="_none" disabled>
                          暂无供应商，请先添加
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">供应商单据号</Label>
                  <Input
                    className="h-10"
                    placeholder="供应商的发票/单据编号"
                    value={form.supplierInvoiceNo}
                    onChange={(e) => setForm({ ...form, supplierInvoiceNo: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t("warehouse")}</Label>
                  <Select
                    value={form.warehouseId}
                    onValueChange={(v) => setForm({ ...form, warehouseId: v })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="选择入库仓库" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t("expectedDate")}</Label>
                  <DateInput
                    value={form.expectedDate}
                    onChange={(v) => setForm({ ...form, expectedDate: v })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t("notes")}</Label>
                  <Input
                    className="h-10"
                    placeholder="可选备注"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 2: Currency & Exchange Rate */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="w-5 h-5 bg-gold-400/15 rounded flex items-center justify-center text-xs font-bold text-gold-700">
                  2
                </div>
                <ArrowRightLeft className="h-4 w-4" />
                货币与汇率
              </h4>
              <div className="bg-gradient-to-r from-gold-50/50 to-gold-50/50 rounded-xl p-4">
                <div className="grid grid-cols-3 gap-4 items-end">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">采购货币</Label>
                    <Select
                      value={form.purchaseCurrency}
                      onValueChange={handleCurrencyChange}
                    >
                      <SelectTrigger className="h-10 bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            <span className="flex items-center gap-2">
                              <span className="font-mono font-bold">{c.symbol}</span>
                              {c.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      汇率（? {form.purchaseCurrency} = 1 MYR）
                    </Label>
                    <Input
                      type="number"
                      step="0.0001"
                      className="h-10 bg-card font-mono text-center text-lg font-bold"
                      value={form.exchangeRate}
                      onChange={(e) =>
                        setForm({ ...form, exchangeRate: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">本地货币</Label>
                    <div className="h-10 bg-card rounded-md border px-3 flex items-center font-medium text-foreground">
                      RM MYR (马来西亚令吉)
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                  <span className="bg-card px-3 py-1 rounded-full font-mono font-semibold text-blue-700 shadow-sm">
                    {pSymbol} {form.exchangeRate.toFixed(2)}
                  </span>
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <span className="bg-card px-3 py-1 rounded-full font-mono font-semibold text-emerald-700 shadow-sm">
                    RM 1.00
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 3: Items */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <div className="w-5 h-5 bg-gold-400/15 rounded flex items-center justify-center text-xs font-bold text-gold-700">
                    3
                  </div>
                  <Package className="h-4 w-4" />
                  {t("items")}
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 text-gold-700 border-gold-200 hover:bg-gold-50"
                  onClick={handleAddItem}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("addItem")}
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="bg-muted rounded-xl p-4 border border-border relative group"
                  >
                    <div className="space-y-3">
                      {/* Row 1: SKU / 商品名称 / 分类 / 规格 */}
                      <div className="grid grid-cols-12 gap-3 items-start">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[10px] text-muted-foreground">SKU (自动)</Label>
                          <div className="h-10 flex items-center bg-gold-50 rounded-md px-3 border border-gold-100">
                            <span className="font-mono text-sm font-bold text-gold-700">{getAutoSku(i)}</span>
                          </div>
                        </div>
                        <div className="col-span-4 space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{t("productName")}</Label>
                          <Input className="h-10" placeholder="商品名称" value={item.productName} onChange={(e) => updateItem(i, "productName", e.target.value)} />
                        </div>
                        <div className="col-span-3 space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{t("category")}</Label>
                          <Select value={item.categoryId || ""} onValueChange={(val) => updateItem(i, "categoryId", val)}>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder={t("selectCategory")} />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.nameZh}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3 space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{t("specs")}</Label>
                          <Input className="h-10 text-xs" placeholder={t("specValue")} value={(item.specs && item.specs[0]?.value) || ""}
                            onChange={(e) => {
                              updateItem(i, "specs", [{ name: "", value: e.target.value }]);
                            }} />
                        </div>
                      </div>

                      {/* Row 2: 数量 / 单价 / 小计 / 商品图片 / 删除 */}
                      <div className="grid grid-cols-12 gap-3 items-start">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{t("quantity")}</Label>
                          <Input type="number" className="h-10 text-center text-base" placeholder="数量" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value === "" ? "" : parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{t("unitCost")} ({pSymbol})</Label>
                          <Input type="number" step="0.01" className="h-10 text-center text-base" placeholder="单价" value={item.unitCost} onChange={(e) => updateItem(i, "unitCost", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-[10px] text-muted-foreground">小计</Label>
                          <div className="h-10 flex flex-col justify-center">
                            <span className="font-semibold text-sm text-foreground">{pSymbol} {((Number(item.quantity) || 0) * (Number(item.unitCost) || 0)).toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                            <span className="font-semibold text-xs text-emerald-600">≈ RM {(form.exchangeRate ? ((Number(item.quantity) || 0) * (Number(item.unitCost) || 0) / form.exchangeRate) : 0).toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        <div className="col-span-5 space-y-1">
                          <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <ImagePlus className="h-3 w-3" />
                            商品图片
                            {item.images.length > 0 && (
                              <span className="ml-0.5 bg-gold-400/15 text-gold-600 dark:text-gold-400 px-1.5 py-0.5 rounded-full text-[9px] font-bold">{item.images.length}</span>
                            )}
                          </Label>
                          <div className="flex gap-2 flex-wrap items-center">
                            {item.images.map((img, imgIdx) => (
                              <div key={imgIdx} className="relative group/img">
                                <img src={img} alt="" className="w-14 h-14 object-cover rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow" />
                                <button type="button" onClick={() => removeImage(i, imgIdx)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] shadow-md hover:bg-red-600 opacity-0 group-hover/img:opacity-100 transition-opacity">×</button>
                              </div>
                            ))}
                            <label className="w-14 h-14 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-gold-400 hover:bg-gold-50/50 transition-all group/add flex-shrink-0">
                              {uploadingIdx === i ? (
                                <Loader2 className="h-4 w-4 text-gold-400 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 text-muted-foreground group-hover/add:text-gold-400 transition-colors" />
                                  <span className="text-[8px] text-muted-foreground group-hover/add:text-gold-600">上传</span>
                                </>
                              )}
                              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple className="hidden"
                                onChange={(e) => { if (e.target.files && e.target.files.length > 0) handleImageUpload(i, e.target.files); e.target.value = ""; }} />
                            </label>
                            {item.images.length === 0 && (
                              <span className="text-[10px] text-muted-foreground ml-1">JPG/PNG/WebP</span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-1 flex items-center pt-4">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={() => handleRemoveItem(i)} disabled={items.length <= 1}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Section 4: Summary */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="w-5 h-5 bg-gold-400/15 rounded flex items-center justify-center text-xs font-bold text-gold-700">
                  4
                </div>
                费用汇总
              </h4>
              <div className="bg-muted rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">运费 ({pSymbol})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-9"
                      value={form.shippingCost}
                      onChange={(e) =>
                        setForm({ ...form, shippingCost: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">税费 ({pSymbol})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-9"
                      value={form.tax}
                      onChange={(e) =>
                        setForm({ ...form, tax: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">商品小计</span>
                    <span>
                      {pSymbol}{" "}
                      {subtotal.toLocaleString("en", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">运费</span>
                    <span>
                      {pSymbol}{" "}
                      {form.shippingCost.toLocaleString("en", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">税费</span>
                    <span>
                      {pSymbol}{" "}
                      {form.tax.toLocaleString("en", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>采购总额 ({form.purchaseCurrency})</span>
                    <span className="text-blue-700">
                      {pSymbol}{" "}
                      {totalAmount.toLocaleString("en", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span className="flex items-center gap-2">
                      折合本地货币
                      <span className="text-xs font-normal text-muted-foreground">
                        (÷{form.exchangeRate})
                      </span>
                    </span>
                    <span className="text-emerald-600">
                      RM {totalLocal.toLocaleString("en", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t bg-muted px-6 py-4 flex justify-end gap-3 rounded-b-lg">
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                resetForm();
              }}
            >
              {tc("cancel")}
            </Button>
            <Button
              className="gap-1.5 px-6"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {tc("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View PO Detail Dialog */}
      <Dialog open={!!viewPO} onOpenChange={(open) => { if (!open) { setViewPO(null); setDefectEditing(false); } }}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-0">
          {viewPO && (() => {
            const st = statusMap[viewPO.status] || statusMap.DRAFT;
            const vSymbol = getCurrencySymbol(viewPO.purchaseCurrency);
            const totalDefectQty = (viewPO.items || []).reduce((s: number, i: any) => s + (i.defectQty || 0), 0);
            const refundAmt = (viewPO as any).refundAmount || 0;
            const refundAmtLocal = (viewPO as any).refundAmountLocal || 0;
            return (
              <>
                <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg">
                  <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    采购单详情
                  </DialogTitle>
                  <DialogDescription className="text-gold-200 mt-1 flex items-center gap-3">
                    <span className="font-mono font-bold text-white">{viewPO.poNumber}</span>
                    <Badge variant="outline" className={`${st.color} border-0 text-xs`}>{st.label}</Badge>
                    {totalDefectQty > 0 && <Badge variant="outline" className="bg-red-500/15 text-red-600 dark:text-red-400 border-0 text-xs">有坏品退货</Badge>}
                  </DialogDescription>
                </div>

                <div className="px-6 py-5 space-y-5">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">采购单号</p>
                      <p className="font-mono font-bold text-gold-700">{viewPO.poNumber}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">供应商</p>
                      <p className="font-semibold">{viewPO.supplier?.supplierNo ? viewPO.supplier.supplierNo.replace("SUP-", "") : "-"} <span className="text-muted-foreground font-normal">{viewPO.supplier?.name}</span></p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">预计到货</p>
                      <p className="text-sm">{viewPO.expectedDate ? formatDate(viewPO.expectedDate) : "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">创建时间</p>
                      <p className="text-sm">{formatDate(viewPO.createdAt)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">采购货币</p>
                      <p className="text-sm font-medium">{viewPO.purchaseCurrency}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">汇率</p>
                      <p className="text-sm font-mono">{viewPO.exchangeRate}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">采购总额</p>
                      <p className="text-sm font-semibold text-blue-700">{vSymbol} {viewPO.totalAmount.toLocaleString("en", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">本地金额</p>
                      <p className="text-sm font-bold text-emerald-600">{formatCurrency(viewPO.totalAmountLocal || viewPO.totalAmount)}</p>
                    </div>
                  </div>

                  {refundAmt > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">坏品退货金额</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-red-700">{vSymbol} {refundAmt.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                        <span className="text-sm text-red-500 ml-3">≈ RM {refundAmtLocal.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Items */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        采购明细 ({viewPO.items?.length || 0} 项)
                      </h4>
                      {!defectEditing ? (
                        <Button variant="outline" size="sm" className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={startDefectEdit}>
                          <AlertTriangle className="h-3.5 w-3.5" />
                          标记坏品
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setDefectEditing(false)}>取消</Button>
                          <Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700" onClick={saveDefects} disabled={savingDefect}>
                            {savingDefect ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            保存坏品
                          </Button>
                        </div>
                      )}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">商品名称</TableHead>
                          <TableHead className="whitespace-nowrap">SKU</TableHead>
                          <TableHead className="whitespace-nowrap">图片</TableHead>
                          <TableHead className="whitespace-nowrap">分类</TableHead>
                          <TableHead className="whitespace-nowrap">规格</TableHead>
                          <TableHead className="whitespace-nowrap">数量</TableHead>
                          <TableHead className="whitespace-nowrap">单价 ({vSymbol})</TableHead>
                          <TableHead className="whitespace-nowrap">小计 ({vSymbol})</TableHead>
                          <TableHead className="whitespace-nowrap">单价 (RM)</TableHead>
                          <TableHead className="whitespace-nowrap">≈ MYR</TableHead>
                          <TableHead className="whitespace-nowrap text-center text-red-600">坏品</TableHead>
                          {!defectEditing && <TableHead className="whitespace-nowrap">坏品备注</TableHead>}
                          {defectEditing && <TableHead className="whitespace-nowrap">坏品备注</TableHead>}
                          <TableHead className="whitespace-nowrap text-red-600">退货金额</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(viewPO.items || []).map((item: any) => {
                          const dq = defectEditing ? (Number(defectData[item.id]?.qty) || 0) : (item.defectQty || 0);
                          const refundItem = dq * (item.unitCost || 0);
                          return (
                            <TableRow key={item.id} className={dq > 0 ? "bg-red-50/50" : ""}>
                              <TableCell className="text-sm">{item.productName}</TableCell>
                              <TableCell className="font-mono text-sm whitespace-nowrap">{item.sku || "-"}</TableCell>
                              <TableCell>
                                <div className="flex gap-1 justify-center">
                                  {(item.images || []).slice(0, 3).map((img: string, i: number) => (
                                    <img key={i} src={img} alt="" className="w-10 h-10 object-cover rounded border" />
                                  ))}
                                  {(item.images || []).length > 3 && <span className="text-xs text-muted-foreground self-center">+{item.images.length - 3}</span>}
                                  {(!item.images || item.images.length === 0) && <span className="text-xs text-muted-foreground">-</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">{item.categoryId ? (categories.find(c => c.id === item.categoryId)?.nameZh || "-") : "-"}</TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {(item.specs && Array.isArray(item.specs) && item.specs.length > 0)
                                  ? item.specs.map((s: any) => `${s.name}/${s.value}`).join(", ")
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-sm">{item.quantity}</TableCell>
                              <TableCell className="text-sm">{vSymbol} {item.unitCost?.toLocaleString("en", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-sm">{vSymbol} {item.totalCost?.toLocaleString("en", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-sm">RM {(viewPO.exchangeRate ? (item.unitCost / viewPO.exchangeRate) : 0).toLocaleString("en", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-sm">RM {(viewPO.exchangeRate ? (item.totalCost / viewPO.exchangeRate) : 0).toLocaleString("en", { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-center">
                                {defectEditing ? (
                                  <Input
                                    type="number"
                                    className="h-8 w-16 text-center text-sm mx-auto"
                                    placeholder="0"
                                    value={defectData[item.id]?.qty ?? ""}
                                    onChange={(e) => setDefectData({ ...defectData, [item.id]: { ...defectData[item.id], qty: e.target.value === "" ? "" : Math.min(parseInt(e.target.value) || 0, item.quantity) } })}
                                  />
                                ) : (
                                  <span className={`text-sm font-semibold ${dq > 0 ? "text-red-600" : "text-muted-foreground"}`}>{dq}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {defectEditing ? (
                                  <Input
                                    className="h-8 text-sm w-24"
                                    placeholder="原因"
                                    value={defectData[item.id]?.note || ""}
                                    onChange={(e) => setDefectData({ ...defectData, [item.id]: { ...defectData[item.id], note: e.target.value } })}
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">{item.defectNote || "-"}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {dq > 0 ? (
                                  <span className="text-sm font-semibold text-red-600">-{vSymbol} {refundItem.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {/* Defect Summary */}
                    {totalDefectQty > 0 && !defectEditing && (
                      <div className="mt-4 bg-red-50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-red-700 font-medium">总坏品数量</span>
                          <span className="font-semibold text-red-700">{totalDefectQty} 件</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-700 font-medium">退货金额 ({viewPO.purchaseCurrency})</span>
                          <span className="font-semibold text-red-700">-{vSymbol} {refundAmt.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-700 font-medium">退货金额 (MYR)</span>
                          <span className="font-semibold text-red-700">-RM {refundAmtLocal.toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span className="text-foreground">实际有效金额 (MYR)</span>
                          <span className="text-emerald-600">RM {((viewPO.totalAmountLocal || viewPO.totalAmount) - refundAmtLocal).toLocaleString("en", { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t bg-muted px-6 py-3 flex justify-end rounded-b-lg">
                  <Button variant="outline" onClick={() => { setViewPO(null); setDefectEditing(false); }}>关闭</Button>
                </div>
              </>
            );
          })()}
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
