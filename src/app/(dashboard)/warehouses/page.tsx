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
import { Plus, Container, Search, Loader2, Star, MapPin, Edit, Trash2, Package } from "lucide-react";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  isDefault: boolean;
  isActive: boolean;
  _count: { inventory: number };
}

const emptyForm = { name: "", address: "", isDefault: false };

export default function WarehousesPage() {
  const t = useTranslations("warehouses");
  const tc = useTranslations("common");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
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
      const res = await fetch(`/api/warehouses?${params}`);
      const data = await res.json();
      setWarehouses(data.items || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [search]);

  useEffect(() => { loadData(); }, [loadData]);
  useAutoRefresh(loadData);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowDialog(true);
  };

  const openEdit = (w: Warehouse) => {
    setPwAction("edit");
    setPwItemName(w.name);
    setPendingAction(() => async () => {
      setEditingId(w.id);
      setForm({ name: w.name, address: w.address || "", isDefault: w.isDefault });
      setShowDialog(true);
    });
    setPwOpen(true);
  };

  const openDelete = (w: Warehouse) => {
    setPwAction("delete");
    setPwItemName(w.name);
    setPendingAction(() => async () => {
      await fetch(`/api/warehouses/${w.id}`, { method: "DELETE" });
      loadData();
    });
    setPwOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/warehouses/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/warehouses", {
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

  const defaultWarehouse = warehouses.find((w) => w.isDefault);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardContent className="p-5 flex items-center justify-between">
          <div><p className="text-sm text-muted-foreground">{t("totalWarehouses")}</p><p className="text-2xl font-bold mt-1">{warehouses.length}</p></div>
          <div className="bg-amber-50 dark:bg-amber-500/15 p-3 rounded-xl"><Container className="h-6 w-6 text-amber-700" /></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center justify-between">
          <div><p className="text-sm text-muted-foreground">{t("defaultWarehouse")}</p><p className="text-2xl font-bold mt-1">{defaultWarehouse?.name || "-"}</p></div>
          <div className="bg-emerald-50 dark:bg-emerald-500/15 p-3 rounded-xl"><Star className="h-6 w-6 text-emerald-600" /></div>
        </CardContent></Card>
      </div>

      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={tc("search") + "..."} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <Plus className="h-4 w-4" />{t("addWarehouse")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-amber-700" /></div>
          ) : warehouses.length === 0 ? (
            <div className="text-center py-16">
              <Container className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{tc("noData")}</p>
              <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={openAdd}><Plus className="h-4 w-4" />{t("addWarehouse")}</Button>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("address")}</TableHead>
                <TableHead>{t("isDefault")}</TableHead>
                <TableHead>{t("inventoryCount")}</TableHead>
                <TableHead className="w-24">{tc("actions")}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {warehouses.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="text-sm max-w-[250px] truncate">{w.address || "-"}</TableCell>
                    <TableCell>
                      {w.isDefault ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-500/15 px-2 py-0.5 rounded-full">
                          <Star className="h-3 w-3" />{t("isDefault")}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        {w._count.inventory}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10" onClick={() => openEdit(w)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => openDelete(w)}>
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

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md p-0 gap-0">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3.5 text-white rounded-t-lg">
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Container className="h-4 w-4" />
              {editingId ? t("editWarehouse") : t("addWarehouse")}
            </DialogTitle>
            <DialogDescription className="text-amber-200 text-xs mt-0.5">
              {editingId ? t("editInfo") : t("addInfo")}
            </DialogDescription>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">{t("name")} <span className="text-red-500">*</span></Label>
              <Input className="h-9 text-sm" placeholder={t("name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{t("address")}</Label>
              <Input className="h-9 text-sm" placeholder={t("address")} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-border accent-amber-600"
              />
              <Label htmlFor="isDefault" className="text-sm cursor-pointer">{t("isDefault")}</Label>
            </div>
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
