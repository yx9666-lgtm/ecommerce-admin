"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { Download, Calendar, TrendingUp, BarChart3, PieChart as PieIcon, Award, ShoppingCart, DollarSign, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type SalesTrendItem = { date: string; shopee: number; lazada: number; tiktok: number; pgmall: number };
type PlatformRow = { metric: string; shopee: number; lazada: number; tiktok: number; pgmall: number };
type ProductRow = { rank: number; name: string; sales: number; revenue: number };
type CategoryItem = { name: string; value: number; color: string };
type Summary = { totalOrders: number; totalRevenue: number; avgOrderValue: number };

type AnalyticsData = {
  salesTrend: SalesTrendItem[];
  platformComparison: PlatformRow[];
  productRanking: ProductRow[];
  categoryShare: CategoryItem[];
  summary: Summary;
};

export default function AnalyticsPage() {
  const t = useTranslations("analytics");
  const [dateRange, setDateRange] = useState("last30days");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [platformPage, setPlatformPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const pageSize = 20;

  const fetchData = useCallback(async (range: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?range=${range}`);
      if (res.ok) {
        const json: AnalyticsData = await res.json();
        setData(json);
      }
    } catch {
      // keep previous data on network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(dateRange);
  }, [dateRange, fetchData]);

  const salesTrend = data?.salesTrend ?? [];
  const platformComparison = data?.platformComparison ?? [];
  const productRanking = data?.productRanking ?? [];
  const categoryShare = data?.categoryShare ?? [];
  const summary = data?.summary ?? { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 };
  const platformTotalPages = Math.max(1, Math.ceil(platformComparison.length / pageSize));
  const currentPlatformPage = Math.min(platformPage, platformTotalPages);
  const pagedPlatformComparison = platformComparison.slice(
    (currentPlatformPage - 1) * pageSize,
    currentPlatformPage * pageSize
  );
  const productTotalPages = Math.max(1, Math.ceil(productRanking.length / pageSize));
  const currentProductPage = Math.min(productPage, productTotalPages);
  const pagedProductRanking = productRanking.slice(
    (currentProductPage - 1) * pageSize,
    currentProductPage * pageSize
  );

  useEffect(() => {
    if (platformPage > platformTotalPages) setPlatformPage(platformTotalPages);
  }, [platformPage, platformTotalPages]);

  useEffect(() => {
    if (productPage > productTotalPages) setProductPage(productTotalPages);
  }, [productPage, productTotalPages]);

  useEffect(() => {
    setPlatformPage(1);
    setProductPage(1);
  }, [dateRange]);

  const formatCell = (row: PlatformRow, value: number) => {
    if (row.metric === "Revenue") return formatCurrency(value);
    if (row.metric === "Avg Order") return formatCurrency(value);
    return value.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t("today")}</SelectItem>
              <SelectItem value="last7days">{t("last7days")}</SelectItem>
              <SelectItem value="last30days">{t("last30days")}</SelectItem>
              <SelectItem value="last90days">{t("last90days")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => {
          if (!data) return;
          const lines = ["=== Sales Trend ===", "Date,Shopee,Lazada,TikTok,PGMall"];
          salesTrend.forEach(r => lines.push(`${r.date},${r.shopee},${r.lazada},${r.tiktok},${r.pgmall}`));
          lines.push("", "=== Product Ranking ===", "Rank,Product,Sales,Revenue");
          productRanking.forEach(r => lines.push(`${r.rank},"${r.name}",${r.sales},${r.revenue}`));
          const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = `analytics_${dateRange}_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
        }}><Download className="h-4 w-4" />{t("exportReport")}</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("totalOrders")}</p>
              <p className="text-2xl font-bold">{loading ? "..." : summary.totalOrders.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("totalRevenue")}</p>
              <p className="text-2xl font-bold">{loading ? "..." : formatCurrency(summary.totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-400/10">
              <Receipt className="h-5 w-5 text-gold-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("avgOrderValue")}</p>
              <p className="text-2xl font-bold">{loading ? "..." : formatCurrency(summary.avgOrderValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5" />{t("salesTrend")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
            ) : salesTrend.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fill: 'hsl(220, 9%, 46%)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(220, 9%, 46%)', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`RM ${v.toLocaleString()}`, undefined]} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="shopee" name="Shopee" stroke="#EE4D2D" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="lazada" name="Lazada" stroke="#0F146D" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="tiktok" name="TikTok" stroke="#25F4EE" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="pgmall" name="PG Mall" stroke="#E31837" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Platform Comparison + Category */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5" />{t("platformComparison")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Shopee</TableHead>
                  <TableHead>Lazada</TableHead>
                  <TableHead>TikTok</TableHead>
                  <TableHead>PG Mall</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : platformComparison.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">No data</TableCell>
                  </TableRow>
                ) : (
                  pagedPlatformComparison.map((row) => (
                    <TableRow key={row.metric}>
                      <TableCell className="text-sm">{row.metric}</TableCell>
                      <TableCell>{formatCell(row, row.shopee)}</TableCell>
                      <TableCell>{formatCell(row, row.lazada)}</TableCell>
                      <TableCell>{formatCell(row, row.tiktok)}</TableCell>
                      <TableCell>{formatCell(row, row.pgmall)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {!loading && platformTotalPages > 1 && (
              <PaginationControls
                className="mt-3"
                page={currentPlatformPage}
                totalPages={platformTotalPages}
                totalItems={platformComparison.length}
                prevLabel="Previous"
                nextLabel="Next"
                itemLabel="items"
                onPageChange={setPlatformPage}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><PieIcon className="h-5 w-5" />Category Share</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
              ) : categoryShare.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryShare} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                      {categoryShare.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}%`, undefined]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-2 mt-2">
              {categoryShare.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span>{c.name}</span>
                  </div>
                  <span className="font-medium">{c.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Ranking */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2"><Award className="h-5 w-5" />{t("productRanking")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead>Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : productRanking.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No data</TableCell>
                </TableRow>
              ) : (
                pagedProductRanking.map((p) => (
                  <TableRow key={p.rank}>
                    <TableCell>
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${p.rank <= 3 ? "bg-gold-400/15 text-gold-600 dark:text-gold-400" : "bg-muted text-muted-foreground"}`}>
                        {p.rank}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{p.name}</TableCell>
                    <TableCell>{p.sales}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(p.revenue)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
            {!loading && productTotalPages > 1 && (
              <PaginationControls
                className="mt-3"
                page={currentProductPage}
                totalPages={productTotalPages}
                totalItems={productRanking.length}
                prevLabel="Previous"
                nextLabel="Next"
                itemLabel="items"
                onPageChange={setProductPage}
              />
            )}
          </CardContent>
        </Card>
    </div>
  );
}
