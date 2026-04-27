"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DateInput } from "@/components/ui/date-input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Plus,
  Calendar,
  Megaphone,
  Zap,
  Gift,
  TrendingUp,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

// ─── Static Config ──────────────────────────────────────────────────────────

const typeIcons: Record<string, { icon: any; color: string }> = {
  "Flash Sale": { icon: Zap, color: "bg-gold-400/15 text-gold-600 dark:text-gold-400" },
  "Discount": { icon: DollarSign, color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  "Coupon": { icon: Gift, color: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  "Bundle": { icon: BarChart3, color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
};

const statusVariants: Record<string, "success" | "warning" | "secondary" | "default"> = {
  active: "success",
  scheduled: "warning",
  ended: "secondary",
  draft: "default",
};

const platformColors: Record<string, string> = {
  SHOPEE: "bg-orange-500",
  LAZADA: "bg-blue-800",
  TIKTOK: "bg-gray-800",
  PGMALL: "bg-emerald-600",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface Promotion {
  id: string;
  nameZh: string;
  nameEn: string;
  type: string;
  platform: string | null;
  discount: number | null;
  startDate: string;
  endDate: string;
  budget: number | null;
  spent: number;
  status: string;
}

interface PromotionsResponse {
  items: Promotion[];
  activeCount: number;
  totalBudget: number;
  totalSpent: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateRange(startDate: string, endDate: string): string {
  const s = new Date(startDate);
  const e = new Date(endDate);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const sMonth = months[s.getMonth()];
  const eMonth = months[e.getMonth()];
  if (sMonth === eMonth) {
    return `${sMonth} ${s.getDate()}-${e.getDate()}`;
  }
  return `${sMonth} ${s.getDate()} - ${eMonth} ${e.getDate()}`;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const t = useTranslations("marketing");
  const tc = useTranslations("common");
  const [showDialog, setShowDialog] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // API data
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  // Form state
  const [formNameEn, setFormNameEn] = useState("");
  const [formNameZh, setFormNameZh] = useState("");
  const [formType, setFormType] = useState("");
  const [formPlatform, setFormPlatform] = useState("");
  const [formDiscount, setFormDiscount] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formBudget, setFormBudget] = useState("");

  const fetchPromotions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/promotions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data: PromotionsResponse = await res.json();
      setPromotions(data.items);
      setActiveCount(data.activeCount);
      setTotalBudget(data.totalBudget);
      setTotalSpent(data.totalSpent);
    } catch (err) {
      console.error("Failed to fetch promotions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const resetForm = () => {
    setEditingPromo(null);
    setFormNameEn("");
    setFormNameZh("");
    setFormType("");
    setFormPlatform("");
    setFormDiscount("");
    setFormStartDate("");
    setFormEndDate("");
    setFormBudget("");
  };

  const handleCreate = async () => {
    if (!formNameEn || !formNameZh || !formType || !formStartDate || !formEndDate) return;
    try {
      setSubmitting(true);
      const isEditing = !!editingPromo;
      const url = isEditing ? `/api/promotions/${editingPromo!.id}` : "/api/promotions";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameEn: formNameEn,
          nameZh: formNameZh,
          type: formType,
          platform: formPlatform || null,
          discount: formDiscount ? parseFloat(formDiscount) : null,
          startDate: formStartDate,
          endDate: formEndDate,
          budget: formBudget ? parseFloat(formBudget) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setShowDialog(false);
      resetForm();
      await fetchPromotions();
    } catch (err) {
      console.error("Failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditPromo = (promo: Promotion) => {
    setEditingPromo(promo);
    setFormNameEn(promo.nameEn);
    setFormNameZh(promo.nameZh);
    setFormType(promo.type);
    setFormPlatform(promo.platform || "");
    setFormDiscount(promo.discount != null ? String(promo.discount) : "");
    setFormStartDate(promo.startDate.slice(0, 10));
    setFormEndDate(promo.endDate.slice(0, 10));
    setFormBudget(promo.budget != null ? String(promo.budget) : "");
    setShowDialog(true);
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm("确定删除此营销活动？")) return;
    try {
      await fetch(`/api/promotions/${id}`, { method: "DELETE" });
      await fetchPromotions();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // Derive calendar events from promotions
  const calendarEvents = promotions
    .filter((p) => p.status !== "ended")
    .map((p) => ({
      date: formatDateRange(p.startDate, p.endDate),
      event: p.nameEn,
      platform: p.platform || "All",
      color: p.platform ? (platformColors[p.platform] || "bg-gray-500") : "bg-gold-600",
    }));
  const totalPages = Math.max(1, Math.ceil(promotions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedPromotions = promotions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5 flex items-center justify-between">
          <div><p className="text-sm text-muted-foreground">Active Campaigns</p><p className="text-2xl font-bold mt-1">{activeCount}</p></div>
          <div className="bg-emerald-50 p-3 rounded-xl"><Megaphone className="h-6 w-6 text-emerald-600" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between">
          <div><p className="text-sm text-muted-foreground">Total Budget</p><p className="text-2xl font-bold mt-1">{formatCurrency(totalBudget)}</p></div>
          <div className="bg-blue-50 p-3 rounded-xl"><DollarSign className="h-6 w-6 text-blue-600" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between">
          <div><p className="text-sm text-muted-foreground">Total Spent</p><p className="text-2xl font-bold mt-1">{formatCurrency(totalSpent)}</p><Progress value={totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0} className="h-1.5 mt-2" /></div>
          <div className="bg-purple-50 p-3 rounded-xl"><TrendingUp className="h-6 w-6 text-purple-600" /></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="promotions">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="promotions">{t("promotions")}</TabsTrigger>
            <TabsTrigger value="calendar">{t("calendar")}</TabsTrigger>
          </TabsList>
          <Button size="sm" className="gap-1" onClick={() => setShowDialog(true)}><Plus className="h-4 w-4" />{t("addPromotion")}</Button>
        </div>

        <TabsContent value="promotions" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("promotionName")}</TableHead>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>{t("discount")}</TableHead>
                    <TableHead>{t("startDate")}</TableHead>
                    <TableHead>{t("endDate")}</TableHead>
                    <TableHead>{t("budget")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="w-20">{tc("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No promotions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedPromotions.map((promo) => {
                      const typeInfo = typeIcons[promo.type] || typeIcons["Discount"];
                      const Icon = typeInfo.icon;
                      const budgetVal = promo.budget ?? 0;
                      return (
                        <TableRow key={promo.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{promo.nameEn}</p>
                              <p className="text-xs text-muted-foreground">{promo.nameZh}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${typeInfo.color} border-0 gap-1`}>
                              <Icon className="h-3 w-3" />{promo.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{promo.platform || "All"}</TableCell>
                          <TableCell className="text-sm">{promo.discount != null ? `${promo.discount}%` : "-"}</TableCell>
                          <TableCell className="text-sm">{formatDate(promo.startDate)}</TableCell>
                          <TableCell className="text-sm">{formatDate(promo.endDate)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{formatCurrency(promo.spent)} / {formatCurrency(budgetVal)}</p>
                              {budgetVal > 0 && <Progress value={(promo.spent / budgetVal) * 100} className="h-1 mt-1" />}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant={statusVariants[promo.status] || "default"}>{promo.status}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPromo(promo)}><Edit className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeletePromo(promo.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {promotions.length > pageSize && (
            <PaginationControls
              className="mt-3"
              page={currentPage}
              totalPages={totalPages}
              totalItems={promotions.length}
              onPageChange={setPage}
            />
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                {calendarEvents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No upcoming events</p>
                ) : (
                  calendarEvents.map((event, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className={`w-1 h-12 ${event.color} rounded-full`} />
                      <div className="flex-1">
                        <p className="font-medium">{event.event}</p>
                        <p className="text-sm text-muted-foreground">{event.platform}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{event.date}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Promotion Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg p-0">
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              {editingPromo ? t("editPromotion") : t("addPromotion")}
            </DialogTitle>
            <DialogDescription className="text-gold-200 mt-1">
              Create a new marketing campaign
            </DialogDescription>
          </div>
          <div className="px-6 pb-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("promotionName")} (EN)</Label><Input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} /></div>
              <div className="space-y-2"><Label>{t("promotionName")} (中文)</Label><Input value={formNameZh} onChange={(e) => setFormNameZh(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("type")}</Label>
                <Select value={formType} onValueChange={setFormType}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Flash Sale">Flash Sale</SelectItem>
                    <SelectItem value="Discount">Discount</SelectItem>
                    <SelectItem value="Coupon">Coupon</SelectItem>
                    <SelectItem value="Bundle">Bundle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Platform</Label>
                <Select value={formPlatform} onValueChange={setFormPlatform}><SelectTrigger><SelectValue placeholder="All platforms" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHOPEE">Shopee</SelectItem>
                    <SelectItem value="LAZADA">Lazada</SelectItem>
                    <SelectItem value="TIKTOK">TikTok</SelectItem>
                    <SelectItem value="PGMALL">PGMall</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("discount")} (%)</Label><Input type="number" value={formDiscount} onChange={(e) => setFormDiscount(e.target.value)} /></div>
              <div className="space-y-2"><Label>{t("budget")} (MYR)</Label><Input type="number" step="0.01" value={formBudget} onChange={(e) => setFormBudget(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("startDate")}</Label><DateInput value={formStartDate} onChange={setFormStartDate} /></div>
              <div className="space-y-2"><Label>{t("endDate")}</Label><DateInput value={formEndDate} onChange={setFormEndDate} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{tc("cancel")}</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {tc("save")}
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
