"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PasswordConfirmDialog } from "@/components/password-confirm";
import { Plus, Building2, Search, Loader2, Users, Phone, MapPin, Hash, Edit, Trash2 } from "lucide-react";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

interface Supplier {
  id: string; supplierNo: string; name: string; contactName: string | null;
  phone1: string | null; phone2: string | null; phone3: string | null;
  address: string | null; country: string; notes: string | null;
  isActive: boolean; createdAt: string;
}

const emptyForm = { name: "", contactName: "", phone1: "", phone2: "", phone3: "", address: "", country: "MY", notes: "" };

export default function SuppliersPage() {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [nextNo, setNextNo] = useState("SUP-001");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const [pwAction, setPwAction] = useState<"edit" | "delete">("delete");
  const [pwOpen, setPwOpen] = useState(false);
  const [pwItemName, setPwItemName] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/suppliers?${params}`);
      const data = await res.json();
      setSuppliers(data.items || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [search]);

  const loadNextNo = useCallback(async () => {
    try {
      const res = await fetch("/api/suppliers/next-no");
      const data = await res.json();
      setNextNo(data.supplierNo || "SUP-001");
    } catch { setNextNo("SUP-001"); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useAutoRefresh(loadData);

  const openAdd = async () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    await loadNextNo();
    setShowDialog(true);
  };

  const openEdit = (s: Supplier) => {
    setPwAction("edit");
    setPwItemName(s.name);
    setPendingAction(() => async () => {
      setEditingId(s.id);
      setForm({
        name: s.name, contactName: s.contactName || "", phone1: s.phone1 || "",
        phone2: s.phone2 || "", phone3: s.phone3 || "", address: s.address || "",
        country: s.country, notes: s.notes || "",
      });
      setShowDialog(true);
    });
    setPwOpen(true);
  };

  const openDelete = (s: Supplier) => {
    setPwAction("delete");
    setPwItemName(s.name);
    setPendingAction(() => async () => {
      await fetch(`/api/suppliers/${s.id}`, { method: "DELETE" });
      loadData();
    });
    setPwOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert("请输入供应商店铺名称");
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/suppliers/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setShowDialog(false);
      setForm({ ...emptyForm });
      setEditingId(null);
      loadData();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const filtered = suppliers;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardContent className="p-5 flex items-center justify-between">
          <div><p className="text-sm text-muted-foreground">{t("totalSuppliers")}</p><p className="text-2xl font-bold mt-1">{suppliers.length}</p></div>
          <div className="bg-amber-50 dark:bg-amber-500/15 p-3 rounded-xl"><Building2 className="h-6 w-6 text-amber-700" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between">
          <div><p className="text-sm text-muted-foreground">{t("activeSuppliers")}</p><p className="text-2xl font-bold mt-1">{suppliers.filter((s) => s.isActive).length}</p></div>
          <div className="bg-emerald-50 dark:bg-emerald-500/15 p-3 rounded-xl"><Users className="h-6 w-6 text-emerald-600" /></div>
        </CardContent></Card>
      </div>

      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索编号、店铺名、联系人..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <Plus className="h-4 w-4" />{t("addSupplier")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-amber-700" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{tc("noData")}</p>
              <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={openAdd}><Plus className="h-4 w-4" />{t("addSupplier")}</Button>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>编号</TableHead>
                <TableHead>店铺名称</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>电话</TableHead>
                <TableHead>地址</TableHead>
                <TableHead>国家</TableHead>
                <TableHead className="w-24">{tc("actions")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const phones = [s.phone1, s.phone2, s.phone3].filter(Boolean);
                  return (
                    <TableRow key={s.id}>
                      <TableCell><span className="font-mono text-sm">{s.supplierNo ? s.supplierNo.replace("SUP-", "") : "-"}</span></TableCell>
                      <TableCell className="text-sm">{s.name}</TableCell>
                      <TableCell className="text-sm">{s.contactName || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {phones.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {phones.map((p, i) => (
                              <span key={i}>{p}</span>
                            ))}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{s.address || "-"}</TableCell>
                      <TableCell className="text-sm">{s.country}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10" onClick={() => openEdit(s)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => openDelete(s)}>
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

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md p-0 gap-0">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3.5 text-white rounded-t-lg">
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {editingId ? "编辑供应商" : t("addSupplier")}
            </DialogTitle>
            <DialogDescription className="text-amber-200 text-xs mt-0.5">
              {editingId ? "修改供应商信息" : <>编号：<span className="font-mono font-bold text-white">{nextNo}</span></>}
            </DialogDescription>
          </div>

          <div className="px-5 py-4 space-y-3">
            {!editingId && (
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-[11px] text-muted-foreground">供应商编号</Label>
                  <div className="h-9 flex items-center bg-amber-50 rounded-md px-2.5 border border-amber-100">
                    <Hash className="h-3.5 w-3.5 text-amber-600 mr-1.5" />
                    <span className="font-mono text-sm font-bold text-amber-700">{nextNo}</span>
                  </div>
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-[11px] text-muted-foreground">店铺名称 <span className="text-red-500">*</span></Label>
                  <Input className="h-9 text-sm" placeholder="供应商店铺名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>
            )}
            {editingId && (
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">店铺名称 <span className="text-red-500">*</span></Label>
                <Input className="h-9 text-sm" placeholder="供应商店铺名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">联系人</Label><Input className="h-9 text-sm" placeholder="姓名" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">国家</Label><Input className="h-9 text-sm" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />电话号码</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input className="h-9 text-sm" placeholder="电话 1" value={form.phone1} onChange={(e) => setForm({ ...form, phone1: e.target.value })} />
                <Input className="h-9 text-sm" placeholder="电话 2" value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} />
                <Input className="h-9 text-sm" placeholder="电话 3" value={form.phone3} onChange={(e) => setForm({ ...form, phone3: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1"><Label className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />地址</Label><Input className="h-9 text-sm" placeholder="详细地址" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">备注</Label><Input className="h-9 text-sm" placeholder="可选备注" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>

          <div className="border-t bg-muted px-5 py-3 flex justify-end gap-2 rounded-b-lg">
            <Button variant="outline" size="sm" onClick={() => setShowDialog(false)}>{tc("cancel")}</Button>
            <Button size="sm" className="px-5" onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}{tc("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Confirmation */}
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
