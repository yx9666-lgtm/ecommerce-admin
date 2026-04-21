"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Loader2,
  Building2,
  ClipboardList,
  Warehouse,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

interface DashboardData {
  stats: {
    totalRevenue: number;
    orderCount: number;
    productCount: number;
    customerCount: number;
    supplierCount: number;
    purchaseOrderCount: number;
    totalExpenses: number;
  };
  recentOrders: any[];
  topProducts: any[];
  warehouses: any[];
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      setData(json);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useAutoRefresh(loadData);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gold-600" />
      </div>
    );
  }

  const stats = data?.stats;

  const statCards = [
    { key: "todaySales", value: formatCurrency(stats?.totalRevenue || 0), icon: DollarSign, color: "text-white", bg: "bg-gradient-gold" },
    { key: "todayOrders", value: stats?.orderCount || 0, icon: ShoppingCart, color: "text-gold-700", bg: "bg-gradient-to-br from-gold-100 to-gold-200" },
    { key: "totalProducts", value: stats?.productCount || 0, icon: Package, color: "text-gold-800", bg: "bg-gradient-to-br from-gold-200 to-gold-300" },
    { key: "totalCustomers", value: stats?.customerCount || 0, icon: Users, color: "text-gold-600", bg: "bg-gradient-to-br from-gold-50 to-gold-100" },
  ];

  const extraStats = [
    { label: t("suppliers") as string, value: stats?.supplierCount || 0, icon: Building2, color: "text-white", bg: "bg-gradient-to-br from-gold-300 to-gold-400" },
    { label: t("purchaseOrders") as string, value: stats?.purchaseOrderCount || 0, icon: ClipboardList, color: "text-gold-700", bg: "bg-gradient-to-br from-gold-100 to-gold-200" },
    { label: t("warehouses") as string, value: data?.warehouses?.length || 0, icon: Warehouse, color: "text-gold-800", bg: "bg-gradient-to-br from-gold-200 to-gold-300" },
    { label: t("totalExpenses") as string, value: formatCurrency(stats?.totalExpenses || 0), icon: DollarSign, color: "text-red-600", bg: "bg-gradient-to-br from-red-100 to-red-200" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">{t("salesOverview")}</h3>
        <Button variant="outline" size="sm" className="gap-1" onClick={loadData}>
          <RefreshCw className="h-4 w-4" />{tc("refresh")}
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.key}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t(stat.key)}</p>
                  <p className="text-3xl font-bold mt-1.5 text-foreground tracking-tight">{stat.value}</p>
                </div>
                <div className={`${stat.bg} p-3 rounded-2xl shadow-sm`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {extraStats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1.5 text-foreground tracking-tight">{stat.value}</p>
                </div>
                <div className={`${stat.bg} p-3 rounded-2xl shadow-sm`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">{t("recentOrders")}</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.recentOrders?.length || 0) === 0 ? (
              <p className="text-center py-8 text-muted-foreground">{tc("noData")}</p>
            ) : (
              <div className="space-y-3">
                {data!.recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{order.platformOrderId}</p>
                      <p className="text-xs text-muted-foreground">{order.platform}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(order.totalAmount)}</p>
                      <Badge variant="outline" className="text-[10px]">{order.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">{t("topProducts")}</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.topProducts?.length || 0) === 0 ? (
              <p className="text-center py-8 text-muted-foreground">{tc("noData")}</p>
            ) : (
              <div className="space-y-3">
                {data!.topProducts.map((product: any, index: number) => (
                  <div key={product.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-5">#{index + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{product.nameEn}</p>
                        <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(product.sellingPrice)}</p>
                      <p className="text-xs text-muted-foreground">Stock: {product.totalStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
