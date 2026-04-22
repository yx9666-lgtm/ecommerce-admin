"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  action: "edit" | "delete";
  itemName?: string;
}

export function PasswordConfirmDialog({ open, onClose, onConfirm, action, itemName }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isDelete = action === "delete";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError("请输入密码"); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.valid) {
        await onConfirm();
        setPassword("");
        onClose();
      } else {
        setError("密码错误，请重试");
      }
    } catch (err: any) {
      setError(err?.message || "验证失败，请重试");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setPassword(""); setError(""); onClose(); } }}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <div className={`px-5 py-4 rounded-t-lg ${isDelete ? "bg-gradient-to-r from-red-500 to-red-600" : "bg-gradient-to-r from-gold-500 to-gold-700"} text-white`}>
          <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
            {isDelete ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            {isDelete ? "确认删除" : "确认编辑"}
          </DialogTitle>
          <DialogDescription className="text-white/80 text-xs mt-0.5">
            {isDelete
              ? `即将删除「${itemName || "此项"}」，此操作不可恢复`
              : `正在修改「${itemName || "此项"}」，请验证身份`
            }
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">请输入您的登录密码</Label>
            <Input
              type="password"
              className="h-9 text-sm"
              placeholder="输入密码确认操作"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              autoFocus
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        </form>

        <div className="border-t bg-muted px-5 py-3 flex justify-end gap-2 rounded-b-lg">
          <Button type="button" variant="outline" size="sm" onClick={() => { setPassword(""); setError(""); onClose(); }}>
            取消
          </Button>
          <Button
            size="sm"
            className={`px-5 ${isDelete ? "bg-red-600 hover:bg-red-700" : "bg-gold-600 hover:bg-gold-700"}`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            {isDelete ? "确认删除" : "确认保存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
