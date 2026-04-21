"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/auth-store";
import { PERMISSION_GROUPS, ALL_PERMISSION_KEYS } from "@/lib/permissions";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Settings,
  Users,
  Shield,
  Store,
  Bell,
  Globe,
  ScrollText,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2,
  Tag,
  Bookmark,
  Ruler,
  ArrowLeftRight,
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

type BrandItem = {
  id: string;
  name: string;
  nameEn: string | null;
  position: number;
};

type UnitItem = {
  id: string;
  name: string;
  nameEn: string | null;
  symbol: string | null;
};

type ExchangeRateItem = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { locale, setLocale } = useAuthStore();

  // ── Users state ──
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // ── Store state ──
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [storeName, setStoreName] = useState("");
  const [storeCurrency, setStoreCurrency] = useState("MYR");
  const [storeTimezone, setStoreTimezone] = useState("Asia/Kuala_Lumpur");
  const [storeDescription, setStoreDescription] = useState("");
  const [skuPrefix, setSkuPrefix] = useState("RJ");
  const [skuStartNo, setSkuStartNo] = useState("1001");
  const [supplierPrefix, setSupplierPrefix] = useState("SUP");
  const [supplierStartNo, setSupplierStartNo] = useState("001");
  const [poPrefix, setPoPrefix] = useState("RJ");
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeMsg, setStoreMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Logs state ──
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // ── Categories state ──
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryForm, setCategoryForm] = useState({ nameZh: "", nameEn: "", position: 0 });
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryMsg, setCategoryMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Brands state ──
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [showBrandDialog, setShowBrandDialog] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [brandForm, setBrandForm] = useState({ name: "", nameEn: "", position: 0 });
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandMsg, setBrandMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Units state ──
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [showUnitDialog, setShowUnitDialog] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);
  const [unitForm, setUnitForm] = useState({ name: "", nameEn: "", symbol: "" });
  const [unitSaving, setUnitSaving] = useState(false);
  const [unitMsg, setUnitMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Exchange Rates state ──
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateItem[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [rateForm, setRateForm] = useState({ fromCurrency: "", toCurrency: "", rate: "" });
  const [rateSaving, setRateSaving] = useState(false);
  const [rateMsg, setRateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Export state ──
  const [exporting, setExporting] = useState<string | null>(null);

  // ── Low stock threshold ──
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  // ── Add/Edit-user dialog state ──
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [newUser, setNewUser] = useState({ displayName: "", username: "", password: "", role: "" });
  const [userSaving, setUserSaving] = useState(false);
  const [userMsg, setUserMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Notifications ──
  const [notifications, setNotifications] = useState({
    email: true,
    lowStock: true,
    newOrder: true,
    syncError: true,
    refund: false,
  });
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsSaving, setNotificationsSaving] = useState(false);

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
        setSkuPrefix(data.skuPrefix || "RJ");
        setSkuStartNo(data.skuStartNo || "1001");
        setSupplierPrefix(data.supplierPrefix || "SUP");
        setSupplierStartNo(data.supplierStartNo || "001");
        setPoPrefix(data.poPrefix || "RJ");
        setLowStockThreshold(data.lowStockThreshold ?? 10);
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
      const res = await fetch("/api/settings/logs");
      if (res.ok) setLogs(await res.json());
    } catch {
      // silent
    } finally {
      setLogsLoading(false);
    }
  }, []);

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

  const fetchBrands = useCallback(async () => {
    setBrandsLoading(true);
    try {
      const res = await fetch("/api/brands");
      if (res.ok) setBrands(await res.json());
    } catch {
      // silent
    } finally {
      setBrandsLoading(false);
    }
  }, []);

  const fetchUnits = useCallback(async () => {
    setUnitsLoading(true);
    try {
      const res = await fetch("/api/units");
      if (res.ok) setUnits(await res.json());
    } catch {
      // silent
    } finally {
      setUnitsLoading(false);
    }
  }, []);

  const fetchExchangeRates = useCallback(async () => {
    setRatesLoading(true);
    try {
      const res = await fetch("/api/exchange-rates");
      if (res.ok) setExchangeRates(await res.json());
    } catch {
      // silent
    } finally {
      setRatesLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const res = await fetch("/api/settings/notifications");
      if (res.ok) setNotifications(await res.json());
    } catch {
      // silent
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const saveNotification = async (key: string, checked: boolean) => {
    const updated = { ...notifications, [key]: checked };
    setNotifications(updated);
    setNotificationsSaving(true);
    try {
      await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: checked }),
      });
    } catch {
      // revert on error
      setNotifications(notifications);
    } finally {
      setNotificationsSaving(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStore();
    fetchLogs();
    fetchCategories();
    fetchBrands();
    fetchUnits();
    fetchExchangeRates();
    fetchNotifications();
  }, [fetchUsers, fetchStore, fetchLogs, fetchCategories, fetchBrands, fetchUnits, fetchExchangeRates, fetchNotifications]);

  // ── Handlers ──

  const handleSaveStore = async () => {
    setStoreSaving(true);
    setStoreMsg(null);
    try {
      const res = await fetch("/api/settings/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: storeName,
          currency: storeCurrency,
          timezone: storeTimezone,
          description: storeDescription || null,
          skuPrefix,
          skuStartNo,
          supplierPrefix,
          supplierStartNo,
          poPrefix,
          lowStockThreshold,
        }),
      });
      if (res.ok) {
        const data: StoreInfo = await res.json();
        setStoreInfo(data);
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
        setPermMap(data.permissions || {});
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

  // ── Brand handlers ──

  const openBrandDialog = (brand?: BrandItem) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandForm({ name: brand.name, nameEn: brand.nameEn || "", position: brand.position });
    } else {
      setEditingBrand(null);
      setBrandForm({ name: "", nameEn: "", position: 0 });
    }
    setBrandMsg(null);
    setShowBrandDialog(true);
  };

  const handleSaveBrand = async () => {
    setBrandSaving(true);
    setBrandMsg(null);
    try {
      const url = editingBrand ? `/api/brands/${editingBrand.id}` : "/api/brands";
      const method = editingBrand ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brandForm),
      });
      if (res.ok) {
        setBrandMsg({ type: "success", text: editingBrand ? t("brandSaved") : t("brandCreated") });
        fetchBrands();
        setTimeout(() => setShowBrandDialog(false), 800);
      } else {
        const err = await res.json().catch(() => ({}));
        setBrandMsg({ type: "error", text: err.error || t("saveFailed") });
      }
    } catch {
      setBrandMsg({ type: "error", text: t("networkError") });
    } finally {
      setBrandSaving(false);
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!confirm(t("confirmDeleteBrand"))) return;
    try {
      await fetch(`/api/brands/${id}`, { method: "DELETE" });
      fetchBrands();
    } catch {
      // silent
    }
  };

  // ── Unit handlers ──

  const openUnitDialog = (unit?: UnitItem) => {
    if (unit) {
      setEditingUnit(unit);
      setUnitForm({ name: unit.name, nameEn: unit.nameEn || "", symbol: unit.symbol || "" });
    } else {
      setEditingUnit(null);
      setUnitForm({ name: "", nameEn: "", symbol: "" });
    }
    setUnitMsg(null);
    setShowUnitDialog(true);
  };

  const handleSaveUnit = async () => {
    setUnitSaving(true);
    setUnitMsg(null);
    try {
      const url = editingUnit ? `/api/units/${editingUnit.id}` : "/api/units";
      const method = editingUnit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unitForm),
      });
      if (res.ok) {
        setUnitMsg({ type: "success", text: editingUnit ? t("unitSaved") : t("unitCreated") });
        fetchUnits();
        setTimeout(() => setShowUnitDialog(false), 800);
      } else {
        const err = await res.json().catch(() => ({}));
        setUnitMsg({ type: "error", text: err.error || t("saveFailed") });
      }
    } catch {
      setUnitMsg({ type: "error", text: t("networkError") });
    } finally {
      setUnitSaving(false);
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm(t("confirmDeleteUnit"))) return;
    try {
      await fetch(`/api/units/${id}`, { method: "DELETE" });
      fetchUnits();
    } catch {
      // silent
    }
  };

  // ── Exchange Rate handlers ──

  const handleSaveRate = async () => {
    if (!rateForm.fromCurrency || !rateForm.rate) return;
    setRateSaving(true);
    setRateMsg(null);
    try {
      const res = await fetch("/api/exchange-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromCurrency: rateForm.fromCurrency,
          toCurrency: rateForm.toCurrency || storeCurrency || "MYR",
          rate: parseFloat(rateForm.rate),
        }),
      });
      if (res.ok) {
        setRateMsg({ type: "success", text: t("rateSaved") });
        setRateForm({ fromCurrency: "", toCurrency: "", rate: "" });
        fetchExchangeRates();
      } else {
        const err = await res.json().catch(() => ({}));
        setRateMsg({ type: "error", text: err.error || t("saveFailed") });
      }
    } catch {
      setRateMsg({ type: "error", text: t("networkError") });
    } finally {
      setRateSaving(false);
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

  // ── Helpers ──

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general" className="gap-1"><Settings className="h-4 w-4" />{t("general")}</TabsTrigger>
          <TabsTrigger value="users" className="gap-1"><Users className="h-4 w-4" />{t("users")}</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1"><Bell className="h-4 w-4" />{t("notifications")}</TabsTrigger>
          <TabsTrigger value="categories" className="gap-1"><Tag className="h-4 w-4" />{t("categoryManagement")}</TabsTrigger>
          <TabsTrigger value="brands" className="gap-1"><Bookmark className="h-4 w-4" />{t("brandManagement")}</TabsTrigger>
          <TabsTrigger value="units" className="gap-1"><Ruler className="h-4 w-4" />{t("unitManagement")}</TabsTrigger>
          <TabsTrigger value="exchangeRates" className="gap-1"><ArrowLeftRight className="h-4 w-4" />{t("exchangeRates")}</TabsTrigger>
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
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>{t("skuPrefix")}</Label>
                        <div className="flex gap-2">
                          <Input value={skuPrefix} onChange={(e) => setSkuPrefix(e.target.value.toUpperCase())} maxLength={10} placeholder="RJ" className="w-24" />
                          <Input value={skuStartNo} onChange={(e) => setSkuStartNo(e.target.value)} placeholder="1001" className="w-24" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{t("skuPrefixDesc")}</p>
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
                    <h3 className="text-sm font-semibold mb-1">{t("lowStockThreshold")}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{t("lowStockThresholdDesc")}</p>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-gold-500" />
                      <Input
                        type="number"
                        min={0}
                        value={lowStockThreshold}
                        onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                        className="w-32"
                      />
                    </div>
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
                    {users.map((user) => (
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("notifications")}</CardTitle>
              <CardDescription>{t("notificationsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {notificationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
              [
                { key: "email", labelKey: "emailNotifications", descKey: "emailNotificationsDesc" },
                { key: "newOrder", labelKey: "newOrderAlerts", descKey: "newOrderAlertsDesc" },
                { key: "lowStock", labelKey: "lowStockWarnings", descKey: "lowStockWarningsDesc" },
                { key: "syncError", labelKey: "syncErrorAlerts", descKey: "syncErrorAlertsDesc" },
                { key: "refund", labelKey: "refundRequests", descKey: "refundRequestsDesc" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t(item.labelKey)}</p>
                    <p className="text-xs text-muted-foreground">{t(item.descKey)}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(checked) => saveNotification(item.key, checked)}
                    disabled={notificationsSaving}
                  />
                </div>
              ))
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
                    {categories.map((cat) => (
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brands */}
        <TabsContent value="brands" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("brandManagement")}</CardTitle>
                <CardDescription>{t("brandManagementDesc")}</CardDescription>
              </div>
              <Button size="sm" className="gap-1" onClick={() => openBrandDialog()}><Plus className="h-4 w-4" />{t("addBrand")}</Button>
            </CardHeader>
            <CardContent className="p-0">
              {brandsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("brandName")}</TableHead>
                      <TableHead>{t("brandNameEn")}</TableHead>
                      <TableHead>{t("categoryPosition")}</TableHead>
                      <TableHead className="w-20">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brands.map((brand) => (
                      <TableRow key={brand.id}>
                        <TableCell className="font-medium">{brand.name}</TableCell>
                        <TableCell>{brand.nameEn || "-"}</TableCell>
                        <TableCell>{brand.position}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openBrandDialog(brand)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteBrand(brand.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {brands.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t("noBrandsFound")}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Units */}
        <TabsContent value="units" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("unitManagement")}</CardTitle>
                <CardDescription>{t("unitManagementDesc")}</CardDescription>
              </div>
              <Button size="sm" className="gap-1" onClick={() => openUnitDialog()}><Plus className="h-4 w-4" />{t("addUnit")}</Button>
            </CardHeader>
            <CardContent className="p-0">
              {unitsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("unitName")}</TableHead>
                      <TableHead>{t("unitNameEn")}</TableHead>
                      <TableHead>{t("unitSymbol")}</TableHead>
                      <TableHead className="w-20">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-medium">{unit.name}</TableCell>
                        <TableCell>{unit.nameEn || "-"}</TableCell>
                        <TableCell>{unit.symbol || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openUnitDialog(unit)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteUnit(unit.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {units.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t("noUnitsFound")}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exchange Rates */}
        <TabsContent value="exchangeRates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("exchangeRates")}</CardTitle>
              <CardDescription>{t("exchangeRatesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 items-end">
                <div className="space-y-1">
                  <Label>{t("fromCurrency")}</Label>
                  <Select value={rateForm.fromCurrency} onValueChange={(v) => setRateForm({ ...rateForm, fromCurrency: v })}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("selectCurrency")} /></SelectTrigger>
                    <SelectContent>
                      {["CNY","USD","SGD","EUR","GBP","JPY","KRW","TWD","HKD","THB","IDR","PHP","VND","AUD","INR"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t("toCurrency")}</Label>
                  <Input value={storeCurrency || "MYR"} disabled className="w-[100px]" />
                </div>
                <div className="space-y-1">
                  <Label>{t("rate")}</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={rateForm.rate}
                    onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })}
                    placeholder="0.6500"
                    className="w-[140px]"
                  />
                </div>
                <Button onClick={handleSaveRate} disabled={rateSaving || !rateForm.fromCurrency || !rateForm.rate} className="gap-1">
                  {rateSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {tc("save")}
                </Button>
              </div>
              {rateMsg && (
                <p className={`text-sm ${rateMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>{rateMsg.text}</p>
              )}
              {ratesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("fromCurrency")}</TableHead>
                      <TableHead>{t("toCurrency")}</TableHead>
                      <TableHead>{t("rate")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exchangeRates.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.fromCurrency}</TableCell>
                        <TableCell>{r.toCurrency}</TableCell>
                        <TableCell>{r.rate}</TableCell>
                      </TableRow>
                    ))}
                    {exchangeRates.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{t("noRatesFound")}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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

      {/* Brand Dialog */}
      <Dialog open={showBrandDialog} onOpenChange={setShowBrandDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBrand ? t("editBrand") : t("addBrand")}</DialogTitle>
            <DialogDescription>{t("brandDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("brandName")}</Label>
              <Input value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("brandNameEn")}</Label>
              <Input value={brandForm.nameEn} onChange={(e) => setBrandForm({ ...brandForm, nameEn: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("categoryPosition")}</Label>
              <Input type="number" min={0} value={brandForm.position} onChange={(e) => setBrandForm({ ...brandForm, position: parseInt(e.target.value) || 0 })} />
            </div>
            {brandMsg && (
              <p className={`text-sm ${brandMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {brandMsg.text}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBrandDialog(false)}>{tc("cancel")}</Button>
            <Button onClick={handleSaveBrand} disabled={brandSaving || !brandForm.name}>
              {brandSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit Dialog */}
      <Dialog open={showUnitDialog} onOpenChange={setShowUnitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? t("editUnit") : t("addUnit")}</DialogTitle>
            <DialogDescription>{t("unitDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("unitName")}</Label>
              <Input value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("unitNameEn")}</Label>
              <Input value={unitForm.nameEn} onChange={(e) => setUnitForm({ ...unitForm, nameEn: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("unitSymbol")}</Label>
              <Input value={unitForm.symbol} onChange={(e) => setUnitForm({ ...unitForm, symbol: e.target.value })} placeholder="pcs / kg / m" />
            </div>
            {unitMsg && (
              <p className={`text-sm ${unitMsg.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {unitMsg.text}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnitDialog(false)}>{tc("cancel")}</Button>
            <Button onClick={handleSaveUnit} disabled={unitSaving || !unitForm.name}>
              {unitSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermDialog} onOpenChange={setShowPermDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
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
