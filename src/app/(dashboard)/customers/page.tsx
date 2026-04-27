"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Search, Download, Users, UserPlus, Star, Clock, TrendingUp, Eye, ShoppingCart, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const tierConfig: Record<string, { variant: "success" | "info" | "warning" | "destructive" | "default" }> = {
  vip: { variant: "success" },
  returning: { variant: "info" },
  new: { variant: "default" },
  dormant: { variant: "warning" },
};

const platformColors: Record<string, string> = {
  SHOPEE: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  LAZADA: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  TIKTOK: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
  PGMALL: "bg-red-500/15 text-red-600 dark:text-red-400",
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  platform: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  tier: string;
  tags: string[];
  notes: string | null;
  createdAt: string;
};

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState({ total: 0, new: 0, vip: 0, dormant: 0 });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Debounce search input
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }, []);

  // Reset page when tier filter changes
  const handleTierChange = useCallback((value: string) => {
    setTierFilter(value);
    setPage(1);
  }, []);

  // Fetch customers from API
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (tierFilter !== "all") params.set("tier", tierFilter);

    setLoading(true);
    fetch(`/api/customers?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setCustomers(data.data ?? []);
        setTotal(data.total ?? 0);
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {
        setCustomers([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, tierFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const customerStats = [
    { key: "total", value: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { key: "new", value: stats.new, icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-50" },
    { key: "vip", value: stats.vip, icon: Star, color: "text-gold-600", bg: "bg-gold-50" },
    { key: "dormant", value: stats.dormant, icon: Clock, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {customerStats.map((stat) => (
          <Card key={stat.key}>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t(stat.key === "total" ? "title" : stat.key === "new" ? "newCustomer" : stat.key as any)}</p>
                <p className="text-2xl font-bold mt-1">{stat.value.toLocaleString()}</p>
              </div>
              <div className={`${stat.bg} p-3 rounded-xl`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={`${tc("search")} ${t("name")}, ${t("email")}...`} value={search} onChange={(e) => handleSearchChange(e.target.value)} className="pl-9" />
          </div>
          <Select value={tierFilter} onValueChange={handleTierChange}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc("all")}</SelectItem>
              <SelectItem value="vip">{t("vip")}</SelectItem>
              <SelectItem value="returning">{t("returning")}</SelectItem>
              <SelectItem value="new">{t("newCustomer")}</SelectItem>
              <SelectItem value="dormant">{t("dormant")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => {
            if (!customers.length) return;
            const header = "Name,Email,Phone,Orders,Spent,Tier,Platform\n";
            const rows = customers.map(c => `"${c.name}","${c.email || ""}","${c.phone || ""}",${c.totalOrders},${c.totalSpent},"${c.tier}","${c.platform || ""}"`).join("\n");
            const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `customers_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
          }}><Download className="h-4 w-4" />{tc("export")}</Button>
        </div>
      </div>

      {/* Customer Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("phone")}</TableHead>
                <TableHead className="text-center">{t("totalOrders")}</TableHead>
                <TableHead>{t("totalSpent")}</TableHead>
                <TableHead>{t("lastOrder")}</TableHead>
                <TableHead>{t("tier")}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>{tc("loading")}...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="h-10 w-10 mb-2 opacity-40" />
                      <p>{tc("noData")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id} className="cursor-pointer" onClick={() => setSelectedCustomer(customer)}>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-gold-400/15 text-gold-600 dark:text-gold-400">{customer.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{customer.email ?? "-"}</TableCell>
                    <TableCell className="text-sm">{customer.phone ?? "-"}</TableCell>
                    <TableCell className="text-center text-sm">{customer.totalOrders}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(customer.totalSpent)}</TableCell>
                    <TableCell className="text-sm">{customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={tierConfig[customer.tier]?.variant || "default"}>
                        {t(customer.tier === "returning" ? "returning" : customer.tier as any)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!loading && total > PAGE_SIZE && (
            <PaginationControls
              className="border-t px-4 py-3"
              page={page}
              totalPages={totalPages}
              totalItems={total}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-lg p-0">
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("customerDetail")}
            </DialogTitle>
            <DialogDescription className="text-gold-200 mt-1">
              {selectedCustomer?.email}
            </DialogDescription>
          </div>
          <div className="px-6 pb-6">
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg bg-gold-400/15 text-gold-600 dark:text-gold-400">
                    {selectedCustomer.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedCustomer.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone ?? "-"}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={tierConfig[selectedCustomer.tier]?.variant}>{selectedCustomer.tier.toUpperCase()}</Badge>
                    {selectedCustomer.platform && (
                      <Badge variant="outline" className={`${platformColors[selectedCustomer.platform] ?? ""} border-0`}>{selectedCustomer.platform}</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Card><CardContent className="p-4 text-center">
                  <ShoppingCart className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xl font-bold">{selectedCustomer.totalOrders}</p>
                  <p className="text-xs text-muted-foreground">{t("totalOrders")}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xl font-bold">{formatCurrency(selectedCustomer.totalSpent)}</p>
                  <p className="text-xs text-muted-foreground">{t("totalSpent")}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4 text-center">
                  <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold">{selectedCustomer.lastOrderAt ? formatDate(selectedCustomer.lastOrderAt) : "-"}</p>
                  <p className="text-xs text-muted-foreground">{t("lastOrder")}</p>
                </CardContent></Card>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">{t("tags")}</p>
                <div className="flex flex-wrap gap-1">
                  {selectedCustomer.tags.length > 0 ? (
                    selectedCustomer.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
