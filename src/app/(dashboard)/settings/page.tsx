"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSION_GROUPS, ALL_PERMISSION_KEYS, expandPermissionMap } from "@/lib/permissions";
import { buildSkuFromSerial, normalizeSkuConfig, type SkuConfig } from "@/lib/sku-config";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Settings,
  Users,
  Shield,
  Store,
  Globe,
  ScrollText,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2,
  Tag,
  Download,
  AlertTriangle,
} from "lucide-react";

// ─── Static config ──────────────────────────────────────────────────────────

const roleColors: Record<string, string> = {
  SUPER_ADMIN: "bg-red-500/15 text-red-600 dark:text-red-400",
  STORE_ADMIN: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  OPERATOR: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  CUSTOMER_SERVICE: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  FINANCE: "bg-gold-400/15 text-gold-600 dark:text-gold-400",
};

const roleLabelKeys: Record<string, string> = {
  SUPER_ADMIN: "roleSuperAdmin",
  STORE_ADMIN: "roleStoreAdmin",
  OPERATOR: "roleOperator",
  CUSTOMER_SERVICE: "roleCustomerService",
  FINANCE: "roleFinance",
};

// ─── Types ──────────────────────────────────────────────────────────────────

type UserItem = {
  id: string;
  displayName: string | null;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
};

type StoreInfo = {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  description: string | null;
  skuPrefix: string;
  skuStartNo: string;
  supplierPrefix: string;
  supplierStartNo: string;
  poPrefix: string;
  lowStockThreshold: number;
  stockStatusThresholds?: {
    low: number;
    critical: number;
    out: number;
  };
  skuConfig?: SkuConfig;
};

type LogItem = {
  id: string;
  time: string;
  username: string;
  success: boolean;
  ip: string | null;
};

type CategoryItem = {
  id: string;
  nameZh: string;
  nameEn: string;
  position: number;
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { locale, setLocale } = useAuthStore();

  // ── Users state ──
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersPage, setUsersPage] = useState(1);
  const usersPageSize = 20;

  // ── Store state ──
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [storeName, setStoreName] = useState("");
  const [storeCurrency, setStoreCurrency] = useState("MYR");
  const [storeTimezone, setStoreTimezone] = useState("Asia/Kuala_Lumpur");
  const [storeDescription, setStoreDescription] = useState("");
  const [skuPartCount, setSkuPartCount] = useState("2");
  const [skuSerialPart, setSkuSerialPart] = useState("2");
  const [skuSeparator, setSkuSeparator] = useState("-");
  const [skuSerialStartNo, setSkuSerialStartNo] = useState("1001");
  const [skuParts, setSkuParts] = useState<string[]>(["RJ", "", "", "", ""]);
  const [supplierPrefix, setSupplierPrefix] = useState("SUP");
  const [supplierStartNo, setSupplierStartNo] = useState("001");
  const [poPrefix, setPoPrefix] = useState("RJ");
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeMsg, setStoreMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Logs state ──
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const logsPageSize = 20;

  // ── Categories state ──
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesPage, setCategoriesPage] = useState(1);
  const categoriesPageSize = 20;
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryForm, setCategoryForm] = useState({ nameZh: "", nameEn: "", position: 0 });
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryMsg, setCategoryMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Export state ──
  const [exporting, setExporting] = useState<string | null>(null);

  // ── Stock status thresholds ──
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [criticalStockThreshold, setCriticalStockThreshold] = useState(3);
  const [outStockThreshold, setOutStockThreshold] = useState(0);

  // ── Add/Edit-user dialog state ──
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [newUser, setNewUser] = useState({ displayName: "", username: "", password: "", role: "" });
  const [userSaving, setUserSaving] = useState(false);
  const [userMsg, setUserMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Permissions dialog state ──
  const [showPermDialog, setShowPermDialog] = useState(false);
  const [permUser, setPermUser] = useState<UserItem | null>(null);
  const [permMap, setPermMap] = useState<Record<string, boolean>>({});
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  // ── Fetch helpers ──

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/settings/users");
      if (res.ok) setUsers(await res.json());
    } catch {
      // silent
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchStore = useCallback(async () => {
    setStoreLoading(true);
    try {
      const res = await fetch("/api/settings/store");
      if (res.ok) {
        const data: StoreInfo = await res.json();
        setStoreInfo(data);
        setStoreName(data.name);
        setStoreCurrency(data.currency);
        setStoreTimezone(data.timezone);
        setStoreDescription(data.description ?? "");
        const config = normalizeSkuConfig(data.skuConfig, data.skuPrefix, data.skuStartNo);
        setSkuPartCount(String(config.partCount));
        setSkuSerialPart(String(config.serialPart));
        setSkuSeparator(config.separator);
        setSkuSerialStartNo(config.serialStartNo);
        setSkuParts([
          config.parts[0] || "",
          config.parts[1] || "",
          config.parts[2] || "",
          config.parts[3] || "",
          config.parts[4] || "",
        ]);
        setSupplierPrefix(data.supplierPrefix || "SUP");
        setSupplierStartNo(data.supplierStartNo || "001");
        setPoPrefix(data.poPrefix || "RJ");
        const stockThresholds = data.stockStatusThresholds ?? {
          low: data.lowStockThreshold ?? 10,
          critical: Math.max(0, Math.floor((data.lowStockThreshold ?? 10) * 0.3)),
          out: 0,
        };
        setLowStockThreshold(stockThresholds.low);
        setCriticalStockThreshold(stockThresholds.critical);
        setOutStockThreshold(stockThresholds.out);
      }
    } catch {
      // silent
    } finally {
      setStoreLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(logsPage),
        pageSize: String(logsPageSize),
      });
      const res = await fetch(`/api/settings/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items || []);
        setLogsTotal(data.total || 0);
      }
    } catch {
      // silent
    } finally {
      setLogsLoading(false);
    }
  }, [logsPage, logsPageSize]);

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories(await res.json());
    } catch {
      // silent
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchStore();
    fetchCategories();
  }, [fetchUsers, fetchStore, fetchCategories]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const count = Math.max(1, Math.min(5, parseInt(skuPartCount, 10) || 2));
    const currentSerial = parseInt(skuSerialPart, 10) || 2;
    if (currentSerial > count) {
      setSkuSerialPart(String(count));
    }
  }, [skuPartCount, skuSerialPart]);

  // ── Handlers ──

  const handleSaveStore = async () => {
    setStoreSaving(true);
    setStoreMsg(null);
    try {
      const partCount = Math.max(1, Math.min(5, parseInt(skuPartCount, 10) || 2));
      const serialPart = Math.max(1, Math.min(partCount, parseInt(skuSerialPart, 10) || 2));
      const activeParts = skuParts.slice(0, partCount).map((part) => part.trim().toUpperCase());

      for (let index = 0; index < partCount; index++) {
        if (index + 1 === serialPart) continue;
        if (!activeParts[index]) {
          setStoreMsg({
            type: "error",
            text: t("skuPartRequired", { part: String(index + 1) }),
          });
          setStoreSaving(false);
          return;
        }
      }
      if (!/^\d+$/.test(skuSerialStartNo.trim())) {
        setStoreMsg({ type: "error", text: t("skuSerialStartInvalid") });
        setStoreSaving(false);
        return;
      }
      if (outStockThreshold > criticalStockThreshold || criticalStockThreshold > lowStockThreshold) {
        setStoreMsg({ type: "error", text: t("stockStatusThresholdInvalid") });
        setStoreSaving(false);
        return;
      }

      const skuConfig = {
        partCount,
        serialPart,
        separator: (skuSeparator || "-").trim() || "-",
        serialStartNo: skuSerialStartNo.trim(),
        parts: activeParts,
      };
      const legacySkuPrefix = activeParts.find((_, idx) => idx + 1 !== serialPart) || "RJ";

      const res = await fetch("/api/settings/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: storeName,
          currency: storeCurrency,
          timezone: storeTimezone,
          description: storeDescription || null,
          skuPrefix: legacySkuPrefix,
          skuStartNo: skuConfig.serialStartNo,
          skuConfig,
          supplierPrefix,
          supplierStartNo,
          poPrefix,
          lowStockThreshold,
          stockStatusThresholds: {
            low: lowStockThreshold,
            critical: criticalStockThreshold,
            out: outStockThreshold,
          },
        }),
      });
      if (res.ok) {
        const data: StoreInfo = await res.json();
        setStoreInfo(data);
        const stockThresholds = data.stockStatusThresholds ?? {
          low: data.lowStockThreshold ?? 10,
          critical: Math.max(0, Math.floor((data.lowStockThreshold ?? 10) * 0.3)),
          out: 0,
        };
        setLowStockThreshold(stockThresholds.low);
        setCriticalStockThreshold(stockThresholds.critical);
        setOutStockThreshold(stockThresholds.out);
        setStoreMsg({ type: "success", text: t("storeSaved") });
      } else {
        const err = await res.json().catch(() => ({}));
        setStoreMsg({ type: "error", text: err.error || t("saveFailed") });
      }
    } catch {
      setStoreMsg({ type: "error", text: t("networkError") });
    } finally {
      setStoreSaving(false);
    }
  };

  const handleCreateUser = async () => {
    setUserSaving(true);
    setUserMsg(null);
    try {
      const isEditing = !!editingUser;
      const url = isEditing ? `/api/settings/users/${editingUser!.id}` : "/api/settings/users";
      const method = isEditing ? "PUT" : "POST";
      const payload: any = { ...newUser };
      if (isEditing && !payload.password) delete payload.password;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setUserMsg({ type: "success", text: isEditing ? t("userSaved") : t("userCreated") });
        setNewUser({ displayName: "", username: "", password: "", role: "" });
        setEditingUser(null);
        fetchUsers();
        setTimeout(() => setShowUserDialog(false), 1200);
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.details
          ? err.details.map((d: { message: string }) => d.message).join(", ")
          : err.error || t("createUserFailed");
        setUserMsg({ type: "error", text: msg });
      }
    } catch {
      setUserMsg({ type: "error", text: t("networkError") });
    } finally {
      setUserSaving(false);
    }
  };

  const openEditUser = (user: UserItem) => {
    setEditingUser(user);
    setNewUser({
      displayName: user.displayName || "",
      username: user.username,
      password: "",
      role: user.role,
    });
    setUserMsg(null);
    setShowUserDialog(true);
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (!confirm(t("confirmDeleteUser"))) return;
    try {
      const res = await fetch(`/api/settings/users/${user.id}`, { method: "DELETE" });
      if (res.ok) fetchUsers();
    } catch {
      // silent
    }
  };

  const openPermissions = async (user: UserItem) => {
    setPermUser(user);
    setPermMap({});
    setShowPermDialog(true);
    setPermLoading(true);
    try {
      const res = await fetch(`/api/settings/users/${user.id}/permissions`);
      if (res.ok) {
        const data = await res.json();
        setPermMap(expandPermissionMap(data.permissions || {}));
      }
    } catch {
      // silent
    } finally {
      setPermLoading(false);
    }
  };

  const togglePerm = (key: string) => {
    setPermMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllRow = (module: string, actions: string[]) => {
    const keys = actions.map((a) => `${module}.${a}`);
    const allChecked = keys.every((k) => permMap[k]);
    const updated = { ...permMap };
    keys.forEach((k) => { updated[k] = !allChecked; });
    setPermMap(updated);
  };

  const toggleAllColumn = (action: string) => {
    const keys = PERMISSION_GROUPS.filter((g) => g.actions.includes(action as any)).map((g) => `${g.module}.${action}`);
    const allChecked = keys.every((k) => permMap[k]);
    const updated = { ...permMap };
    keys.forEach((k) => { updated[k] = !allChecked; });
    setPermMap(updated);
  };

  const toggleSelectAll = () => {
    const allChecked = ALL_PERMISSION_KEYS.every((k) => permMap[k]);
    const updated: Record<string, boolean> = {};
    ALL_PERMISSION_KEYS.forEach((k) => { updated[k] = !allChecked; });
    setPermMap(updated);
  };

  const handleSavePermissions = async () => {
    if (!permUser) return;
    setPermSaving(true);
    try {
      const res = await fetch(`/api/settings/users/${permUser.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: permMap }),
      });
      if (res.ok) {
        setShowPermDialog(false);
      }
    } catch {
      // silent
    } finally {
      setPermSaving(false);
    }
  };

  const handleLanguageChange = (newLocale: string) => {
    setLocale(newLocale);
    window.location.reload();
  };

  const openCategoryDialog = (cat?: CategoryItem) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({ nameZh: cat.nameZh, nameEn: cat.nameEn, position: cat.position });
    } else {
      setEditingCategory(null);
      setCategoryForm({ nameZh: "", nameEn: "", position: 0 });
    }
    setCategoryMsg(null);
    setShowCategoryDialog(true);
  };

  const handleSaveCategory = async () => {
    setCategorySaving(true);
    setCategoryMsg(null);
    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm),
      });
      if (res.ok) {
        setCategoryMsg({ type: "success", text: editingCategory ? t("categorySaved") : t("categoryCreated") });
        fetchCategories();
        setTimeout(() => setShowCategoryDialog(false), 800);
      } else {
        const err = await res.json().catch(() => ({}));
        setCategoryMsg({ type: "error", text: err.error || t("saveFailed") });
      }
    } catch {
      setCategoryMsg({ type: "error", text: t("networkError") });
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(t("confirmDeleteCategory"))) return;
    try {
      await fetch(`/api/categories/${id}`, { method: "DELETE" });
      fetchCategories();
    } catch {
      // silent
    }
  };

  // ── Export handler ──

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      const res = await fetch(`/api/export?type=${type}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // silent
    } finally {
      setExporting(null);
    }
  };

  const usersTotalPages = Math.max(1, Math.ceil(users.length / usersPageSize));
  const currentUsersPage = Math.min(usersPage, usersTotalPages);
  const pagedUsers = users.slice((currentUsersPage - 1) * usersPageSize, currentUsersPage * usersPageSize);

  const categoriesTotalPages = Math.max(1, Math.ceil(categories.length / categoriesPageSize));
  const currentCategoriesPage = Math.min(categoriesPage, categoriesTotalPages);
  const pagedCategories = categories.slice(
    (currentCategoriesPage - 1) * categoriesPageSize,
    currentCategoriesPage * categoriesPageSize
  );

  const logsTotalPages = Math.max(1, Math.ceil(logsTotal / logsPageSize));
  const currentLogsPage = Math.min(logsPage, logsTotalPages);

  useEffect(() => {
    if (usersPage > usersTotalPages) setUsersPage(usersTotalPages);
  }, [usersPage, usersTotalPages]);

  useEffect(() => {
    if (categoriesPage > categoriesTotalPages) setCategoriesPage(categoriesTotalPages);
  }, [categoriesPage, categoriesTotalPages]);

  useEffect(() => {
    if (logsPage > logsTotalPages) setLogsPage(logsTotalPages);
  }, [logsPage, logsTotalPages]);

  // ── Helpers ──

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" });
  };

  const skuPartCountNum = Math.max(1, Math.min(5, parseInt(skuPartCount, 10) || 2));
  const skuSerialPartNum = Math.max(1, Math.min(skuPartCountNum, parseInt(skuSerialPart, 10) || 2));
  const skuPreviewConfig = normalizeSkuConfig(
    {
      partCount: skuPartCountNum,
      serialPart: skuSerialPartNum,
      separator: (skuSeparator || "-").trim() || "-",
      serialStartNo: skuSerialStartNo || "1001",
      parts: skuParts.slice(0, skuPartCountNum),
    },
    "RJ",
    skuSerialStartNo || "1001"
  );
  const skuPreview = buildSkuFromSerial(
    skuPreviewConfig,
    parseInt(skuPreviewConfig.serialStartNo, 10) || 1001
  );
  const updateSkuPart = (index: number, value: string) => {
    const next = [...skuParts];
    next[index] = value.toUpperCase();
    setSkuParts(next);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general" className="gap-1"><Settings className="h-4 w-4" />{t("general")}</TabsTrigger>
          <TabsTrigger value="users" className="gap-1"><Users className="h-4 w-4" />{t("users")}</TabsTrigger>
          <TabsTrigger value="categories" className="gap-1"><Tag className="h-4 w-4" />{t("categoryManagement")}</TabsTrigger>
          <TabsTrigger value="export" className="gap-1"><Download className="h-4 w-4" />{t("dataExport")}</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1"><ScrollText className="h-4 w-4" />{t("systemLog")}</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" />{t("store")}</CardTitle>
              <CardDescription>{t("storeDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {storeLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("storeName")}</Label>
                      <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("currency")}</Label>
                      <Select value={storeCurrency} onValueChange={setStoreCurrency}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                          <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                          <SelectItem value="KRW">KRW - Korean Won</SelectItem>
                          <SelectItem value="TWD">TWD - Taiwan Dollar</SelectItem>
                          <SelectItem value="HKD">HKD - Hong Kong Dollar</SelectItem>
                          <SelectItem value="THB">THB - Thai Baht</SelectItem>
                          <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                          <SelectItem value="PHP">PHP - Philippine Peso</SelectItem>
                          <SelectItem value="VND">VND - Vietnamese Dong</SelectItem>
                          <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                          <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("timezone")}</Label>
                      <Select value={storeTimezone} onValueChange={setStoreTimezone}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur (UTC+8)</SelectItem>
                          <SelectItem value="Asia/Singapore">Asia/Singapore (UTC+8)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div>
                    <h3 className="text-sm font-semibold mb-1">{t("prefixTitle")}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{t("prefixDesc")}</p>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label>{t("skuUniversalTitle")}</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Select value={skuPartCount} onValueChange={setSkuPartCount}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={skuSerialPart} onValueChange={setSkuSerialPart}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: skuPartCountNum }, (_, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)}>
                                  {t("skuSerialPartLabel", { part: String(i + 1) })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={skuSeparator}
                            onChange={(e) => setSkuSeparator(e.target.value)}
                            placeholder="-"
                            maxLength={3}
                          />
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {Array.from({ length: skuPartCountNum }, (_, i) => {
                            const isSerial = i + 1 === skuSerialPartNum;
                            return (
                              <Input
                                key={i}
                                value={isSerial ? "" : (skuParts[i] || "")}
                                onChange={(e) => updateSkuPart(i, e.target.value)}
                                placeholder={
                                  isSerial
                                    ? t("skuSerialPlaceholder")
                                    : t("skuPartPlaceholder", { part: String(i + 1) })
                                }
                                disabled={isSerial}
                              />
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={skuSerialStartNo}
                            onChange={(e) => setSkuSerialStartNo(e.target.value)}
                            placeholder="1001"
                            className="w-32"
                          />
                          <Input value={skuPreview} disabled />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{t("skuUniversalDesc")}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("supplierStartNo")}</Label>
                        <Input value={supplierStartNo} onChange={(e) => setSupplierStartNo(e.target.value)} placeholder="001" />
                        <p className="text-[11px] text-muted-foreground">{t("supplierStartNoDesc")}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("poPrefix")}</Label>
                        <Input value={poPrefix} onChange={(e) => setPoPrefix(e.target.value.toUpperCase())} maxLength={10} placeholder="RJ" />
                        <p className="text-[11px] text-muted-foreground">{t("poPrefixDesc")}</p>
                      </div>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div>
                    <h3 className="text-sm font-semibold mb-1">{t("stockStatusThresholds")}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{t("stockStatusThresholdsDesc")}</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{t("lowStockThreshold")}</Label>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-gold-500" />
                          <Input
                            type="number"
                            min={0}
                            value={lowStockThreshold}
                            onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("criticalStockThreshold")}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={criticalStockThreshold}
                          onChange={(e) => setCriticalStockThreshold(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("outStockThreshold")}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={outStockThreshold}
                          onChange={(e) => setOutStockThreshold(parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{t("stockStatusThresholdRule")}</p>
                  </div>
                  {storeMsg && (
                    <p className={`text-sm ${storeMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
                      {storeMsg.text}
                    </p>
                  )}
                  <Button className="gap-1" onClick={handleSaveStore} disabled={storeSaving}>
                    {storeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {tc("save")}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />{t("language")}</CardTitle>
              <CardDescription>{t("languageDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Select value={locale} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh">中文 (Chinese)</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("users")}</CardTitle>
                <CardDescription>{t("usersDesc")}</CardDescription>
              </div>
              <Button size="sm" className="gap-1" onClick={() => { setEditingUser(null); setNewUser({ displayName: "", username: "", password: "", role: "" }); setShowUserDialog(true); setUserMsg(null); }}><Plus className="h-4 w-4" />{t("addUser")}</Button>
            </CardHeader>
            <CardContent className="p-0">
              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("userCol")}</TableHead>
                      <TableHead>{t("usernameCol")}</TableHead>
                      <TableHead>{t("roleCol")}</TableHead>
                      <TableHead>{tc("status")}</TableHead>
                      <TableHead>{t("lastLogin")}</TableHead>
                      <TableHead className="w-20">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-gold-400/15 text-gold-600 dark:text-gold-400">
                                {(user.displayName || user.username).split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{user.displayName || user.username}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{user.username}</TableCell>
                        <TableCell><Badge variant="outline" className={`${roleColors[user.role] || ""} border-0`}>{roleLabelKeys[user.role] ? t(roleLabelKeys[user.role]) : user.role}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "success" : "secondary"}>{user.isActive ? t("active") : t("inactive")}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(user.lastLoginAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditUser(user)}><Edit className="h-4 w-4" /></Button>
                            {user.role !== "SUPER_ADMIN" && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPermissions(user)} title={t("permissionsTitle")}><Shield className="h-4 w-4" /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteUser(user)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("noUsersFound")}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              {!usersLoading && users.length > 0 && (
                <PaginationControls
                  className="border-t px-4 py-3"
                  page={currentUsersPage}
                  totalPages={usersTotalPages}
                  totalItems={users.length}
                  onPageChange={setUsersPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("categoryManagement")}</CardTitle>
                <CardDescription>{t("categoryManagementDesc")}</CardDescription>
              </div>
              <Button size="sm" className="gap-1" onClick={() => openCategoryDialog()}><Plus className="h-4 w-4" />{t("addCategory")}</Button>
            </CardHeader>
            <CardContent className="p-0">
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("categoryNameZh")}</TableHead>
                      <TableHead>{t("categoryNameEn")}</TableHead>
                      <TableHead>{t("categoryPosition")}</TableHead>
                      <TableHead className="w-20">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedCategories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.nameZh}</TableCell>
                        <TableCell>{cat.nameEn || "-"}</TableCell>
                        <TableCell>{cat.position}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openCategoryDialog(cat)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteCategory(cat.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {categories.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t("noCategoriesFound")}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              {!categoriesLoading && categories.length > 0 && (
                <PaginationControls
                  className="border-t px-4 py-3"
                  page={currentCategoriesPage}
                  totalPages={categoriesTotalPages}
                  totalItems={categories.length}
                  onPageChange={setCategoriesPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Export */}
        <TabsContent value="export" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("dataExport")}</CardTitle>
              <CardDescription>{t("dataExportDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <Download className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="font-medium text-sm mb-1">{t("exportProducts")}</p>
                    <p className="text-xs text-muted-foreground mb-3">{t("exportProductsDesc")}</p>
                    <Button size="sm" onClick={() => handleExport("products")} disabled={exporting === "products"}>
                      {exporting === "products" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                      {t("exportCSV")}
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <Download className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="font-medium text-sm mb-1">{t("exportPurchasing")}</p>
                    <p className="text-xs text-muted-foreground mb-3">{t("exportPurchasingDesc")}</p>
                    <Button size="sm" onClick={() => handleExport("purchasing")} disabled={exporting === "purchasing"}>
                      {exporting === "purchasing" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                      {t("exportCSV")}
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <Download className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="font-medium text-sm mb-1">{t("exportOrders")}</p>
                    <p className="text-xs text-muted-foreground mb-3">{t("exportOrdersDesc")}</p>
                    <Button size="sm" onClick={() => handleExport("orders")} disabled={exporting === "orders"}>
                      {exporting === "orders" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                      {t("exportCSV")}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Logs */}
        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("systemLog")}</CardTitle>
              <CardDescription>{t("systemLogDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("timeCol")}</TableHead>
                      <TableHead>{t("userCol")}</TableHead>
                      <TableHead>{t("actionCol")}</TableHead>
                      <TableHead>{t("detailCol")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{formatDate(log.time)}</TableCell>
                        <TableCell className="font-mono text-sm">{log.username}</TableCell>
                        <TableCell>
                          <Badge variant={log.success ? "secondary" : "destructive"}>
                            {log.success ? t("logLogin") : t("logFailed")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.success ? t("logSuccessDetail") : t("logFailedDetail")}
                          {log.ip ? ` from ${log.ip}` : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t("noLogsFound")}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              {!logsLoading && logsTotal > 0 && (
                <PaginationControls
                  className="border-t px-4 py-3"
                  page={currentLogsPage}
                  totalPages={logsTotalPages}
                  totalItems={logsTotal}
                  onPageChange={setLogsPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="p-0">
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {editingUser ? t("editUser") : t("addUser")}
            </DialogTitle>
            <DialogDescription className="text-gold-200 mt-1">
              {editingUser ? t("editUserDesc") : t("createUserDesc")}
            </DialogDescription>
          </div>
          <div className="px-6 pb-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("displayName")}</Label>
                <Input
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("username")}</Label>
                <Input
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("password")}</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("role")}</Label>
              <Select value={newUser.role} onValueChange={(val) => setNewUser({ ...newUser, role: val })}>
                <SelectTrigger><SelectValue placeholder={t("selectRole")} /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabelKeys).map(([key, labelKey]) => (
                    <SelectItem key={key} value={key}>{t(labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {userMsg && (
              <p className={`text-sm ${userMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {userMsg.text}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>{tc("cancel")}</Button>
            <Button onClick={handleCreateUser} disabled={userSaving}>
              {userSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {tc("save")}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? t("editCategory") : t("addCategory")}</DialogTitle>
            <DialogDescription>{t("categoryDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("categoryNameZh")}</Label>
              <Input value={categoryForm.nameZh} onChange={(e) => setCategoryForm({ ...categoryForm, nameZh: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("categoryNameEn")}</Label>
              <Input value={categoryForm.nameEn} onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("categoryPosition")}</Label>
              <Input type="number" min={0} value={categoryForm.position} onChange={(e) => setCategoryForm({ ...categoryForm, position: parseInt(e.target.value) || 0 })} />
            </div>
            {categoryMsg && (
              <p className={`text-sm ${categoryMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {categoryMsg.text}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>{tc("cancel")}</Button>
            <Button onClick={handleSaveCategory} disabled={categorySaving || !categoryForm.nameZh}>
              {categorySaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermDialog} onOpenChange={setShowPermDialog}>
        <DialogContent className="w-[96vw] max-w-[1200px] max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg shrink-0">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("permissionsTitle")} - {permUser?.displayName || permUser?.username}
            </DialogTitle>
            <DialogDescription className="text-gold-200 mt-1">
              {t("permissionsDesc")}
            </DialogDescription>
          </div>
          <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
            {permLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-2">
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {ALL_PERMISSION_KEYS.every((k) => permMap[k]) ? t("deselectAll") : t("selectAll")}
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">{t("permModule")}</TableHead>
                      <TableHead className="text-center w-20">
                        <button className="text-xs hover:underline" onClick={() => toggleAllColumn("view")}>{t("permView")}</button>
                      </TableHead>
                      <TableHead className="text-center w-20">
                        <button className="text-xs hover:underline" onClick={() => toggleAllColumn("create")}>{t("permCreate")}</button>
                      </TableHead>
                      <TableHead className="text-center w-20">
                        <button className="text-xs hover:underline" onClick={() => toggleAllColumn("edit")}>{t("permEdit")}</button>
                      </TableHead>
                      <TableHead className="text-center w-20">
                        <button className="text-xs hover:underline" onClick={() => toggleAllColumn("delete")}>{t("permDelete")}</button>
                      </TableHead>
                      <TableHead className="text-center w-16">
                        <span className="text-xs">{t("permAll")}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PERMISSION_GROUPS.map((group) => {
                      const allActions = ["view", "create", "edit", "delete"] as const;
                      return (
                        <TableRow key={group.module}>
                          <TableCell className="font-medium text-sm">
                            {locale === "zh" ? group.labelZh : group.labelEn}
                          </TableCell>
                          {allActions.map((action) => {
                            const key = `${group.module}.${action}`;
                            const hasAction = group.actions.includes(action);
                            return (
                              <TableCell key={action} className="text-center">
                                {hasAction ? (
                                  <Checkbox
                                    checked={!!permMap[key]}
                                    onCheckedChange={() => togglePerm(key)}
                                  />
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center">
                            <Checkbox
                              checked={group.actions.every((a) => permMap[`${group.module}.${a}`])}
                              onCheckedChange={() => toggleAllRow(group.module, group.actions)}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
          <div className="px-6 py-4 border-t shrink-0">
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPermDialog(false)}>{tc("cancel")}</Button>
              <Button onClick={handleSavePermissions} disabled={permSaving}>
                {permSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {tc("save")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
