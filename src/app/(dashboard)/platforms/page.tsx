"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  Loader2,
  Store,
  ShoppingCart,
  Globe,
  Warehouse,
  Tag,
  CheckCircle2,
  XCircle,
  Save,
  ExternalLink,
  User,
  Boxes,
} from "lucide-react";
import { useAutoRefresh } from "@/lib/use-auto-refresh";
import { PasswordConfirmDialog } from "@/components/password-confirm";

interface Channel {
  id: string;
  name: string;
  code: string;
  type: string;
  icon: string | null;
  color: string | null;
  shopName: string | null;
  shopUsername: string | null;
  shopUrl: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { orders: number; channelInventory: number };
}

const CHANNEL_TYPES = [
  { value: "marketplace", label: "电商平台", labelEn: "Marketplace" },
  { value: "website", label: "自建站", labelEn: "Website" },
  { value: "offline", label: "线下门店", labelEn: "Offline Store" },
  { value: "wholesale", label: "批发", labelEn: "Wholesale" },
  { value: "custom", label: "自定义", labelEn: "Custom" },
];

const COLOR_OPTIONS = [
  "#f97316",
  "#1e3a8a",
  "#000000",
  "#dc2626",
  "#059669",
  "#7c3aed",
  "#0891b2",
  "#d97706",
  "#6b7280",
  "#ec4899",
];

function getTypeIcon(type: string) {
  switch (type) {
    case "marketplace":
      return <ShoppingCart className="h-4 w-4" />;
    case "website":
      return <Globe className="h-4 w-4" />;
    case "offline":
      return <Store className="h-4 w-4" />;
    case "wholesale":
      return <Boxes className="h-4 w-4" />;
    default:
      return <Tag className="h-4 w-4" />;
  }
}

export default function ChannelsPage() {
  const t = useTranslations("channels");
  const tc = useTranslations("common");

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<Channel | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState("marketplace");
  const [formColor, setFormColor] = useState("#f97316");
  const [formShopName, setFormShopName] = useState("");
  const [formShopUsername, setFormShopUsername] = useState("");
  const [formShopUrl, setFormShopUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [pwAction, setPwAction] = useState<"edit" | "delete">("delete");
  const [pwOpen, setPwOpen] = useState(false);
  const [pwItemName, setPwItemName] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.items || []);
      }
    } catch {
      setError(tc("error"));
    } finally {
      setLoading(false);
    }
  }, [tc]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);
  useAutoRefresh(fetchChannels);

  useEffect(() => {
    if (successMsg || error) {
      const timer = setTimeout(() => {
        setSuccessMsg(null);
        setError(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, error]);

  useEffect(() => {
    setFormShopUsername(formCode);
  }, [formCode]);

  const resetForm = () => {
    setFormName("");
    setFormCode("");
    setFormType("marketplace");
    setFormColor("#f97316");
    setFormShopName("");
    setFormShopUsername("");
    setFormShopUrl("");
    setFormNotes("");
  };

  const handleAdd = async () => {
    if (!formName || !formCode) {
      setError(t("nameCodeRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          code: formCode,
          type: formType,
          color: formColor,
          shopName: formShopName || undefined,
          shopUsername: formCode || undefined,
          shopUrl: formShopUrl || undefined,
          notes: formNotes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || tc("error"));
      }
      setSuccessMsg(t("channelAdded"));
      setShowAddDialog(false);
      resetForm();
      fetchChannels();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id,
          name: formName,
          color: formColor,
          shopName: formShopName || null,
          shopUsername: formCode || null,
          shopUrl: formShopUrl || null,
          notes: formNotes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || tc("error"));
      }
      setSuccessMsg(t("channelUpdated"));
      setShowEditDialog(false);
      setEditTarget(null);
      resetForm();
      fetchChannels();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (channel: Channel) => {
    try {
      const res = await fetch("/api/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: channel.id, isActive: !channel.isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || tc("error"));
      }
      fetchChannels();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditDialog = (ch: Channel) => {
    setPwAction("edit");
    setPwItemName(ch.name);
    setPendingAction(() => async () => {
      setEditTarget(ch);
      setFormName(ch.name);
      setFormCode(ch.code);
      setFormType(ch.type);
      setFormColor(ch.color || "#6b7280");
      setFormShopName(ch.shopName || "");
      setFormShopUsername(ch.code);
      setFormShopUrl(ch.shopUrl || "");
      setFormNotes(ch.notes || "");
      setShowEditDialog(true);
    });
    setPwOpen(true);
  };

  const openToggleActive = (ch: Channel) => {
    setPwAction("edit");
    setPwItemName(ch.name);
    setPendingAction(() => async () => {
      await handleToggleActive(ch);
    });
    setPwOpen(true);
  };

  const openDeleteChannel = (ch: Channel) => {
    setPwAction("delete");
    setPwItemName(ch.name);
    setPendingAction(() => async () => {
      const res = await fetch(`/api/channels?id=${encodeURIComponent(ch.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || tc("error"));
      }
      setSuccessMsg(t("channelDeleted"));
      fetchChannels();
    });
    setPwOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const channelFormContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("channelName")}</Label>
          <Input
            placeholder={t("channelNamePlaceholder")}
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("channelCode")}</Label>
          <Input
            placeholder={t("channelCodePlaceholder")}
            value={formCode}
            onChange={(e) => setFormCode(e.target.value.toUpperCase())}
            disabled={!!editTarget}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("channelType")}</Label>
          <Select value={formType} onValueChange={setFormType} disabled={!!editTarget}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_TYPES.map((ct) => (
                <SelectItem key={ct.value} value={ct.value}>
                  {ct.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("color")}</Label>
          <div className="flex gap-2 flex-wrap">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  formColor === c
                    ? "border-foreground scale-110"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setFormColor(c)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium mb-3">{t("accountInfo")}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("shopName")}</Label>
            <Input
              placeholder={t("shopNamePlaceholder")}
              value={formShopName}
              onChange={(e) => setFormShopName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("shopUsername")}</Label>
            <Input
              placeholder={t("shopUsernamePlaceholder")}
              value={formShopUsername}
              readOnly
              disabled
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label>{t("shopUrl")}</Label>
          <Input
            placeholder="https://..."
            value={formShopUrl}
            onChange={(e) => setFormShopUrl(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("notes")}</Label>
        <Input
          placeholder={t("notesPlaceholder")}
          value={formNotes}
          onChange={(e) => setFormNotes(e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="text-sm">{successMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("channelList")}</h2>
        <Button
          className="gap-1"
          onClick={() => {
            resetForm();
            setEditTarget(null);
            setShowAddDialog(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {t("addChannel")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {channels.map((ch) => (
          <Card
            key={ch.id}
            className={`relative overflow-hidden transition-opacity ${
              ch.isActive ? "" : "opacity-50"
            }`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0"
                    style={{ backgroundColor: ch.color || "#6b7280" }}
                  >
                    {ch.icon || ch.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{ch.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {getTypeIcon(ch.type)}
                      <span>
                        {CHANNEL_TYPES.find((ct) => ct.value === ch.type)
                          ?.label || ch.type}
                      </span>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="font-mono">{ch.code}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={ch.isActive ? "success" : "secondary"}>
                  {ch.isActive ? t("active") : t("inactive")}
                </Badge>
              </div>

              {(ch.shopName || ch.shopUsername) && (
                <div className="mt-3 bg-muted/50 rounded-lg p-2.5 space-y-1">
                  {ch.shopName && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Store className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{ch.shopName}</span>
                    </div>
                  )}
                  {ch.shopUsername && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{ch.shopUsername}</span>
                    </div>
                  )}
                  {ch.shopUrl && (
                    <a
                      href={ch.shopUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="truncate">{ch.shopUrl}</span>
                    </a>
                  )}
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="text-center bg-muted/30 rounded-lg py-2">
                  <p className="text-lg font-bold">{ch._count.orders}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("orders")}
                  </p>
                </div>
                <div className="text-center bg-muted/30 rounded-lg py-2">
                  <p className="text-lg font-bold">
                    {ch._count.channelInventory}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("skuCount")}
                  </p>
                </div>
              </div>

              {ch.notes && (
                <p className="mt-2 text-xs text-muted-foreground truncate">
                  {ch.notes}
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 flex-1"
                  onClick={() => openEditDialog(ch)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {tc("edit")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={`gap-1 ${
                    ch.isActive
                      ? "text-destructive hover:text-destructive"
                      : "text-emerald-600 hover:text-emerald-600"
                  }`}
                  onClick={() => openToggleActive(ch)}
                >
                  {ch.isActive ? (
                    <PowerOff className="h-3.5 w-3.5" />
                  ) : (
                    <Power className="h-3.5 w-3.5" />
                  )}
                  {ch.isActive ? t("disable") : t("enable")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-destructive hover:text-destructive"
                  onClick={() => openDeleteChannel(ch)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {tc("delete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {channels.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-12">
            <Warehouse className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t("noChannels")}</p>
            <Button
              className="mt-3 gap-1"
              variant="outline"
              onClick={() => {
                resetForm();
                setShowAddDialog(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("addChannel")}
            </Button>
          </div>
        )}
      </div>

      {/* Add Channel Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {t("addChannel")}
            </DialogTitle>
            <DialogDescription className="text-gold-200 mt-1">
              {t("addChannelDesc")}
            </DialogDescription>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {channelFormContent}
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={saving}
            >
              {tc("cancel")}
            </Button>
            <Button className="gap-1" onClick={handleAdd} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t("addChannel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Channel Dialog */}
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              {t("editChannel")}
            </DialogTitle>
            <DialogDescription className="text-gold-200 mt-1">
              {t("editChannelDesc")}
            </DialogDescription>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {channelFormContent}
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditTarget(null);
              }}
              disabled={saving}
            >
              {tc("cancel")}
            </Button>
            <Button className="gap-1" onClick={handleEdit} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {tc("save")}
            </Button>
          </DialogFooter>
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
