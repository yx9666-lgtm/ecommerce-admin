"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  ArrowUpRight,
  PieChart as PieChartIcon,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Edit,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

interface FinanceSummary {
  totalRevenue: number;
  totalManualIncome: number;
  totalExpenses: number;
  totalManualExpenses: number;
  totalPurchaseExpenses: number;
  purchaseExpenseCount: number;
  totalCommission: number;
  netProfit: number;
  channelRevenue: {
    channelId: string;
    channelName: string;
    channelCode: string;
    color: string;
    revenue: number;
    commission: number;
    net: number;
  }[];
  monthlyFinance: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
  recentPurchases: {
    id: string;
    poNumber: string;
    totalAmountLocal: number;
    notes: string | null;
    createdAt: string;
    expectedDate: string | null;
    supplier: {
      name: string;
      supplierNo: string;
    };
  }[];
}

interface FinanceRecord {
  id: string;
  type: "order" | "income" | "expense" | "purchase";
  category: string;
  amount: number;
  note: string | null;
  date: string;
  channelName?: string;
  channelColor?: string;
  shopUsername?: string;
  orderNoHint?: string;
  supplierNoHint?: string;
  commission?: number;
  net?: number;
}

export default function FinancePage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [recordPage, setRecordPage] = useState(1);
  const pageSize = 20;
  const sourcePageSize = 500;
  const [loading, setLoading] = useState(true);
  const [showChart, setShowChart] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [channels, setChannels] = useState<any[]>([]);

  // Add expense dialog
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [expCategory, setExpCategory] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState("");
  const [expNote, setExpNote] = useState("");
  const [expShopUsername, setExpShopUsername] = useState("");
  const [creatingExpense, setCreatingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // Add income dialog
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);
  const [incCategory, setIncCategory] = useState("");
  const [incAmount, setIncAmount] = useState("");
  const [incDate, setIncDate] = useState("");
  const [incNote, setIncNote] = useState("");
  const [incShopUsername, setIncShopUsername] = useState("");
  const [creatingIncome, setCreatingIncome] = useState(false);
  const [incomeError, setIncomeError] = useState<string | null>(null);

  // Edit record dialog
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
  const [editRecordCategory, setEditRecordCategory] = useState("");
  const [editRecordAmount, setEditRecordAmount] = useState("");
  const [editRecordDate, setEditRecordDate] = useState("");
  const [editRecordNote, setEditRecordNote] = useState("");
  const [editRecordShopUsername, setEditRecordShopUsername] = useState("");
  const [savingRecord, setSavingRecord] = useState(false);
  const [editRecordError, setEditRecordError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/summary");
      if (res.ok) setSummary(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.items || []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: "1", pageSize: sourcePageSize.toString() });
      const res = await fetch(`/api/orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.items || []);
      }
    } catch { /* ignore */ }
  }, [sourcePageSize]);

  const fetchExpenses = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: "1", pageSize: sourcePageSize.toString() });
      const res = await fetch(`/api/expenses?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.items || []);
        setExpenseTotal(data.total || 0);
      }
    } catch { /* ignore */ }
  }, [sourcePageSize]);

  const fetchIncomes = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: "1", pageSize: sourcePageSize.toString() });
      const res = await fetch(`/api/incomes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setIncomes(data.items || []);
        setIncomeTotal(data.total || 0);
      }
    } catch { /* ignore */ }
  }, [sourcePageSize]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchSummary(), fetchOrders(), fetchExpenses(), fetchIncomes()]);
    setLoading(false);
  }, [fetchSummary, fetchOrders, fetchExpenses, fetchIncomes]);

  useEffect(() => { fetchAll(); fetchChannels(); }, [fetchAll, fetchChannels]);
  useAutoRefresh(fetchAll);

  // Format date as yyyy/MM/dd
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}/${m}/${day}`;
  };

  // Build merged records: individual orders + manual incomes + expenses
  const allRecords: FinanceRecord[] = [];

  // Individual order rows
  for (const order of orders) {
    const commission = (order.platformFee || 0) + (order.commissionFee || 0);
    allRecords.push({
      id: `order-${order.id}`,
      type: "order",
      category: order.channel?.name || order.platform || "-",
      amount: order.totalAmount,
      note: order.buyerNote || order.sellerNote || null,
      date: order.createdAt,
      channelName: order.channel?.name || order.platform || "-",
      channelColor: order.channel?.color || "#6b7280",
      shopUsername: order.channel?.shopUsername || "-",
      commission,
      net: order.totalAmount - commission,
    });
  }

  // Manual incomes
  for (const inc of incomes) {
    allRecords.push({
      id: inc.id,
      type: "income",
      category: inc.category,
      amount: inc.amount,
      note: inc.note,
      date: inc.date,
      shopUsername: inc.shopUsername || undefined,
    });
  }

  // Expenses
  for (const exp of expenses) {
    allRecords.push({
      id: exp.id,
      type: "expense",
      category: exp.category,
      amount: exp.amount,
      note: exp.note,
      date: exp.date,
      shopUsername: exp.shopUsername || undefined,
    });
  }

  // Purchase orders (system expense)
  for (const po of summary?.recentPurchases || []) {
    allRecords.push({
      id: `purchase-${po.id}`,
      type: "purchase",
      category: po.supplier?.name || "采购支出",
      amount: po.totalAmountLocal || 0,
      note: po.notes,
      date: po.expectedDate || po.createdAt,
      shopUsername: undefined,
      orderNoHint: po.poNumber || undefined,
      supplierNoHint: po.supplier?.supplierNo || undefined,
    });
  }

  // Sort by date desc (newest first)
  allRecords.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Filter by date range
  const filteredRecords = allRecords.filter((r) => {
    if (!r.date) return true;
    const d = new Date(r.date);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  });

  useEffect(() => {
    setRecordPage(1);
  }, [startDate, endDate]);

  const totalFilteredRecords = filteredRecords.length;
  const totalRecordPages = Math.max(1, Math.ceil(totalFilteredRecords / pageSize));
  const currentRecordPage = Math.min(recordPage, totalRecordPages);
  const pagedRecords = filteredRecords.slice(
    (currentRecordPage - 1) * pageSize,
    currentRecordPage * pageSize
  );

  useEffect(() => {
    if (recordPage > totalRecordPages) {
      setRecordPage(totalRecordPages);
    }
  }, [recordPage, totalRecordPages]);

  const handleCreateExpense = async () => {
    if (!expCategory || !expAmount || !expDate) {
      setExpenseError("请填写日期、支出费用和金额");
      return;
    }
    setCreatingExpense(true);
    setExpenseError(null);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expCategory, amount: parseFloat(expAmount),
          date: expDate, note: expNote || undefined,
          shopUsername: expShopUsername || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || tc("error"));
      setShowExpenseDialog(false);
      fetchAll();
    } catch (err: any) { setExpenseError(err.message); }
    finally { setCreatingExpense(false); }
  };

  const handleCreateIncome = async () => {
    if (!incCategory || !incAmount || !incDate) {
      setIncomeError("请填写日期、收入来源和金额");
      return;
    }
    setCreatingIncome(true);
    setIncomeError(null);
    try {
      const res = await fetch("/api/incomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: incCategory, amount: parseFloat(incAmount),
          date: incDate, note: incNote || undefined,
          shopUsername: incShopUsername || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || tc("error"));
      setShowIncomeDialog(false);
      fetchAll();
    } catch (err: any) { setIncomeError(err.message); }
    finally { setCreatingIncome(false); }
  };

  const handleDeleteRecord = async (record: FinanceRecord) => {
    if (record.type === "order" || record.type === "purchase") return;
    const typeName = record.type === "income" ? "收入" : "支出";
    if (!confirm(`确定要删除此${typeName}记录吗？`)) return;
    const endpoint = record.type === "income" ? "incomes" : "expenses";
    await fetch(`/api/${endpoint}/${record.id}`, { method: "DELETE" });
    fetchAll();
  };

  const handleEditRecord = (record: FinanceRecord) => {
    if (record.type === "order" || record.type === "purchase") return;
    setEditingRecord(record);
    setEditRecordCategory(record.category);
    setEditRecordAmount(String(record.amount));
    setEditRecordDate(record.date ? new Date(record.date).toISOString().split("T")[0] : "");
    setEditRecordNote(record.note || "");
    setEditRecordShopUsername(record.shopUsername || "");
    setEditRecordError(null);
  };

  const handleSaveRecord = async () => {
    if (!editingRecord || !editRecordCategory || !editRecordAmount || !editRecordDate) {
      setEditRecordError("请填写所有必填项");
      return;
    }
    setSavingRecord(true);
    setEditRecordError(null);
    try {
      const endpoint = editingRecord.type === "income" ? "incomes" : "expenses";
      const res = await fetch(`/api/${endpoint}/${editingRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editRecordCategory,
          amount: parseFloat(editRecordAmount),
          date: editRecordDate,
          note: editRecordNote || undefined,
          shopUsername: editRecordShopUsername || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || tc("error"));
      setEditingRecord(null);
      fetchAll();
    } catch (err: any) { setEditRecordError(err.message); }
    finally { setSavingRecord(false); }
  };

  const totalRevenue = summary?.totalRevenue || 0;
  const totalExpenses = summary?.totalExpenses || 0;
  const totalCommission = summary?.totalCommission || 0;
  const netProfit = summary?.netProfit || 0;
  const expenseCount = (summary?.purchaseExpenseCount || 0) + expenseTotal;
  const NO_SHOP_USERNAME_VALUE = "__none__";
  const channelUsernameOptions = useMemo(() => {
    const seen = new Set<string>();
    return (channels || [])
      .map((ch) => ({
        name: ch.name as string,
        shopUsername: (ch.shopUsername || "").trim(),
        isActive: ch.isActive !== false,
      }))
      .filter((ch) => {
        if (!ch.isActive || !ch.shopUsername || seen.has(ch.shopUsername)) return false;
        seen.add(ch.shopUsername);
        return true;
      });
  }, [channels]);

  return (
    <div className="space-y-6">
      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("revenue")}</p>
                <p className="text-2xl font-bold mt-1">
                  {loading ? "-" : formatCurrency(totalRevenue)}
                </p>
                {totalRevenue > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                    <span className="text-xs text-muted-foreground">{t("fromOrders")}</span>
                  </div>
                )}
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/15 p-3 rounded-xl"><DollarSign className="h-6 w-6 text-emerald-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("expenses")}</p>
                <p className="text-2xl font-bold mt-1">
                  {loading ? "-" : formatCurrency(totalExpenses)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-muted-foreground">{expenseCount} {tc("items")}</span>
                </div>
              </div>
              <div className="bg-red-50 p-3 rounded-xl"><Wallet className="h-6 w-6 text-red-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("platformCommission")}</p>
                <p className="text-2xl font-bold mt-1">
                  {loading ? "-" : formatCurrency(totalCommission)}
                </p>
                {totalRevenue > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <PieChartIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {((totalCommission / totalRevenue) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <div className="bg-purple-50 p-3 rounded-xl"><TrendingDown className="h-6 w-6 text-purple-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("netProfit")}</p>
                <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {loading ? "-" : formatCurrency(netProfit)}
                </p>
                {totalRevenue > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                    <span className="text-xs text-emerald-600">
                      {t("grossMargin")} {((netProfit / totalRevenue) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <div className="bg-gold-50 dark:bg-gold-400/15 p-3 rounded-xl"><TrendingUp className="h-6 w-6 text-gold-700" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart - Collapsible */}
      <Card>
        <CardHeader
          className="flex flex-row items-center justify-between pb-2 cursor-pointer"
          onClick={() => setShowChart(!showChart)}
        >
          <CardTitle className="text-base font-semibold">{t("profitReport")}</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {showChart ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>
        {showChart && (
          <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : summary?.monthlyFinance && summary.monthlyFinance.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.monthlyFinance}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`RM ${v.toLocaleString()}`, undefined]} contentStyle={{ backgroundColor: "hsl(0, 0%, 13%)", border: "1px solid hsl(0, 0%, 20%)", borderRadius: "12px", fontSize: "12px", color: "#fff", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }} />
                  <Legend />
                  <Bar dataKey="revenue" name={t("revenue")} fill="#D97706" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name={t("expenses")} fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name={t("profit")} fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">{tc("noData")}</div>
          )}
        </CardContent>
        )}
      </Card>

      {/* Combined Finance Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">收支明细</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="gap-1"
              onClick={() => {
                setIncCategory(""); setIncAmount(""); setIncNote("");
                setIncDate(new Date().toISOString().split("T")[0]);
                setIncShopUsername("");
                setIncomeError(null);
                setShowIncomeDialog(true);
              }}
            >
              <Plus className="h-4 w-4" />
              添加收入
            </Button>
            <Button
              size="sm"
              className="gap-1"
              onClick={() => {
                setExpCategory(""); setExpAmount(""); setExpNote("");
                setExpDate(new Date().toISOString().split("T")[0]);
                setExpShopUsername("");
                setExpenseError(null);
                setShowExpenseDialog(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("addExpense")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Date range filter */}
          <div className="flex items-center gap-3 px-4 pb-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">开始日期</Label>
              <DateInput value={startDate} onChange={setStartDate} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">结束日期</Label>
              <DateInput value={endDate} onChange={setEndDate} />
            </div>
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setStartDate(""); setEndDate(""); }}>
                清除
              </Button>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : totalFilteredRecords === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">{tc("noData")}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{t("date")}</TableHead>
                    <TableHead className="text-center">类型</TableHead>
                    <TableHead className="text-center">名称</TableHead>
                    <TableHead className="text-center">渠道用户名</TableHead>
                    <TableHead className="text-center">{t("amount")}</TableHead>
                    <TableHead className="text-center">支出</TableHead>
                    <TableHead className="text-center">净额</TableHead>
                    <TableHead className="text-center">备注</TableHead>
                    <TableHead className="text-center w-16">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRecords.map((record) => {
                    // Calculate net for every row
                    let netAmount = 0;
                    if (record.type === "order") {
                      netAmount = record.amount - (record.commission || 0);
                    } else if (record.type === "income") {
                      netAmount = record.amount;
                    } else {
                      netAmount = -record.amount;
                    }

                    return (
                      <TableRow key={record.id}>
                        <TableCell className="text-center text-sm">
                          {formatDate(record.date)}
                        </TableCell>
                        <TableCell className="text-center">
                          {record.type === "order" ? (
                            <Badge variant="outline" className="bg-gold-400/15 text-gold-600 dark:text-gold-400 border-0">渠道收入</Badge>
                          ) : record.type === "purchase" ? (
                            <Badge variant="outline" className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-0">采购支出</Badge>
                          ) : record.type === "income" ? (
                            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0">收入</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-500/15 text-red-600 dark:text-red-400 border-0">支出</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {record.type === "order" && record.channelColor && (
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: record.channelColor }} />
                            )}
                            <div className="flex flex-col items-center">
                              <span className="text-sm">{record.category}</span>
                              {record.supplierNoHint && (
                                <span className="text-[11px] text-muted-foreground">
                                  供应商编码: {record.supplierNoHint}
                                </span>
                              )}
                              {record.orderNoHint && (
                                <span className="text-[11px] text-muted-foreground">
                                  单号: {record.orderNoHint}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          <span>{record.shopUsername || "-"}</span>
                        </TableCell>
                        {/* 金额: only for order & income */}
                        <TableCell className="text-center text-sm">
                          {record.type === "expense" || record.type === "purchase" ? "-" : `+${formatCurrency(record.amount)}`}
                        </TableCell>
                        {/* 支出: for expense rows and order commission */}
                        <TableCell className="text-center text-sm">
                          {record.type === "purchase"
                            ? formatCurrency(record.amount)
                            : record.type === "expense"
                            ? formatCurrency(record.amount)
                            : record.type === "order" && record.commission
                              ? formatCurrency(record.commission)
                              : "-"}
                        </TableCell>
                        {/* 净额: calculated for every row */}
                        <TableCell className="text-center text-sm">
                          {netAmount >= 0 ? `+${formatCurrency(netAmount)}` : `-${formatCurrency(Math.abs(netAmount))}`}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {record.note || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {record.type !== "order" && record.type !== "purchase" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-gold-600 dark:text-gold-400 hover:bg-gold-50 dark:hover:bg-gold-400/10"
                                  onClick={() => handleEditRecord(record)}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:bg-red-50"
                                  onClick={() => handleDeleteRecord(record)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="p-4">
                <PaginationControls
                  page={currentRecordPage}
                  totalPages={totalRecordPages}
                  totalItems={totalFilteredRecords}
                  prevLabel={tc("previous")}
                  nextLabel={tc("next")}
                  onPageChange={setRecordPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              {t("addExpense")}
            </DialogTitle>
            <DialogDescription className="text-gold-200 mt-1">
              记录新的支出
            </DialogDescription>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {expenseError && (
            <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-2 text-sm">{expenseError}</div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("date")} *</Label>
              <DateInput value={expDate} onChange={setExpDate} />
            </div>
            <div className="space-y-2">
              <Label>支出费用 *</Label>
              <Input placeholder="输入支出费用名称" value={expCategory} onChange={(e) => setExpCategory(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                提示：采购相关支出可在备注填写单号，方便后续核对。
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t("amount")} (MYR) *</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>渠道用户名</Label>
              <Select
                value={expShopUsername || NO_SHOP_USERNAME_VALUE}
                onValueChange={(value) =>
                  setExpShopUsername(value === NO_SHOP_USERNAME_VALUE ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择渠道用户名（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SHOP_USERNAME_VALUE}>不选择</SelectItem>
                  {channelUsernameOptions.map((ch) => (
                    <SelectItem key={ch.shopUsername} value={ch.shopUsername}>
                      {ch.name} - {ch.shopUsername}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                提示：供应商编码可在备注填写，系统会在采购支出里显示提示。
              </p>
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Input placeholder="备注（可选）" value={expNote} onChange={(e) => setExpNote(e.target.value)} />
            </div>
          </div>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setShowExpenseDialog(false)} disabled={creatingExpense}>{tc("cancel")}</Button>
            <Button className="gap-1" onClick={handleCreateExpense} disabled={creatingExpense}>
              {creatingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Income Dialog */}
      <Dialog open={showIncomeDialog} onOpenChange={setShowIncomeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              添加收入
            </DialogTitle>
            <DialogDescription className="text-gold-200 mt-1">
              记录新的收入
            </DialogDescription>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {incomeError && (
            <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-2 text-sm">{incomeError}</div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("date")} *</Label>
              <DateInput value={incDate} onChange={setIncDate} />
            </div>
            <div className="space-y-2">
              <Label>收入来源 *</Label>
              <Input placeholder="输入收入来源名称" value={incCategory} onChange={(e) => setIncCategory(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("amount")} (MYR) *</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={incAmount} onChange={(e) => setIncAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>渠道用户名</Label>
              <Select
                value={incShopUsername || NO_SHOP_USERNAME_VALUE}
                onValueChange={(value) =>
                  setIncShopUsername(value === NO_SHOP_USERNAME_VALUE ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择渠道用户名（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SHOP_USERNAME_VALUE}>不选择</SelectItem>
                  {channelUsernameOptions.map((ch) => (
                    <SelectItem key={ch.shopUsername} value={ch.shopUsername}>{ch.name} - {ch.shopUsername}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Input placeholder="备注（可选）" value={incNote} onChange={(e) => setIncNote(e.target.value)} />
            </div>
          </div>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setShowIncomeDialog(false)} disabled={creatingIncome}>{tc("cancel")}</Button>
            <Button className="gap-1" onClick={handleCreateIncome} disabled={creatingIncome}>
              {creatingIncome ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent className="p-0">
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Edit className="h-5 w-5" />
              编辑{editingRecord?.type === "income" ? "收入" : "支出"}
            </DialogTitle>
            <DialogDescription className="text-gold-200 mt-1">
              修改记录信息
            </DialogDescription>
          </div>
          <div className="px-6 pb-6">
          {editRecordError && (
            <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-3 py-2 text-sm">{editRecordError}</div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("date")} *</Label>
              <DateInput value={editRecordDate} onChange={setEditRecordDate} />
            </div>
            <div className="space-y-2">
              <Label>{editingRecord?.type === "income" ? "收入来源" : "支出费用"} *</Label>
              <Input
                placeholder={editingRecord?.type === "income" ? "输入收入来源名称" : "输入支出费用名称"}
                value={editRecordCategory}
                onChange={(e) => setEditRecordCategory(e.target.value)}
              />
              {editingRecord?.type === "expense" && (
                <p className="text-xs text-muted-foreground">
                  提示：采购相关支出可在备注填写单号，方便后续核对。
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("amount")} (MYR) *</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={editRecordAmount} onChange={(e) => setEditRecordAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>渠道用户名</Label>
              <Select
                value={editRecordShopUsername || NO_SHOP_USERNAME_VALUE}
                onValueChange={(value) =>
                  setEditRecordShopUsername(value === NO_SHOP_USERNAME_VALUE ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择渠道用户名（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SHOP_USERNAME_VALUE}>不选择</SelectItem>
                  {channelUsernameOptions.map((ch) => (
                    <SelectItem key={ch.shopUsername} value={ch.shopUsername}>
                      {ch.name} - {ch.shopUsername}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingRecord?.type === "expense" && (
                <p className="text-xs text-muted-foreground">
                  提示：供应商编码可在备注填写，系统会在采购支出里显示提示。
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Input placeholder="备注（可选）" value={editRecordNote} onChange={(e) => setEditRecordNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecord(null)} disabled={savingRecord}>{tc("cancel")}</Button>
            <Button className="gap-1" onClick={handleSaveRecord} disabled={savingRecord}>
              {savingRecord ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
              {tc("save")}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
