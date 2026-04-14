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
} from "lucide-react";

// ─── Static config ──────────────────────────────────────────────────────────

const roleColors: Record<string, string> = {
  SUPER_ADMIN: "bg-red-500/15 text-red-600 dark:text-red-400",
  STORE_ADMIN: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  OPERATOR: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  CUSTOMER_SERVICE: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  FINANCE: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  STORE_ADMIN: "Store Admin",
  OPERATOR: "Operator",
  CUSTOMER_SERVICE: "Customer Service",
  FINANCE: "Finance",
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
};

type LogItem = {
  id: string;
  time: string;
  username: string;
  success: boolean;
  ip: string | null;
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
  const [storeLoading, setStoreLoading] = useState(true);
  const [storeSaving, setStoreSaving] = useState(false);
  const [storeMsg, setStoreMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Logs state ──
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // ── Add-user dialog state ──
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({ displayName: "", username: "", email: "", password: "", role: "" });
  const [userSaving, setUserSaving] = useState(false);
  const [userMsg, setUserMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ── Notifications (local only) ──
  const [notifications, setNotifications] = useState({
    email: true,
    lowStock: true,
    newOrder: true,
    syncError: true,
    refund: false,
  });

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

  useEffect(() => {
    fetchUsers();
    fetchStore();
    fetchLogs();
  }, [fetchUsers, fetchStore, fetchLogs]);

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
        }),
      });
      if (res.ok) {
        const data: StoreInfo = await res.json();
        setStoreInfo(data);
        setStoreMsg({ type: "success", text: "Store settings saved" });
      } else {
        const err = await res.json().catch(() => ({}));
        setStoreMsg({ type: "error", text: err.error || "Failed to save" });
      }
    } catch {
      setStoreMsg({ type: "error", text: "Network error" });
    } finally {
      setStoreSaving(false);
    }
  };

  const handleCreateUser = async () => {
    setUserSaving(true);
    setUserMsg(null);
    try {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        setUserMsg({ type: "success", text: "User created successfully" });
        setNewUser({ displayName: "", username: "", email: "", password: "", role: "" });
        fetchUsers();
        setTimeout(() => setShowUserDialog(false), 1200);
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.details
          ? err.details.map((d: { message: string }) => d.message).join(", ")
          : err.error || "Failed to create user";
        setUserMsg({ type: "error", text: msg });
      }
    } catch {
      setUserMsg({ type: "error", text: "Network error" });
    } finally {
      setUserSaving(false);
    }
  };

  const handleLanguageChange = (newLocale: string) => {
    setLocale(newLocale);
    window.location.reload();
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
          <TabsTrigger value="logs" className="gap-1"><ScrollText className="h-4 w-4" />{t("systemLog")}</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" />{t("store")}</CardTitle>
              <CardDescription>Manage your store information</CardDescription>
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
                      <Label>Store Name</Label>
                      <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={storeCurrency} onValueChange={setStoreCurrency}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                          <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Select value={storeTimezone} onValueChange={setStoreTimezone}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur (UTC+8)</SelectItem>
                          <SelectItem value="Asia/Singapore">Asia/Singapore (UTC+8)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Email</Label>
                      <Input value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} />
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
              <CardDescription>Change the interface language</CardDescription>
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
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </div>
              <Button size="sm" className="gap-1" onClick={() => { setShowUserDialog(true); setUserMsg(null); }}><Plus className="h-4 w-4" />{t("addUser")}</Button>
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
                      <TableHead>User</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>{tc("status")}</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="w-20">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                {(user.displayName || user.username).split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{user.displayName || user.username}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{user.username}</TableCell>
                        <TableCell className="text-sm">{user.email}</TableCell>
                        <TableCell><Badge variant="outline" className={`${roleColors[user.role] || ""} border-0`}>{roleLabels[user.role] || user.role}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "success" : "secondary"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(user.lastLoginAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No users found</TableCell>
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
              <CardDescription>Configure notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "email", label: "Email Notifications", desc: "Receive email alerts for important events" },
                { key: "newOrder", label: "New Order Alerts", desc: "Get notified when new orders arrive" },
                { key: "lowStock", label: "Low Stock Warnings", desc: "Alert when inventory drops below safety level" },
                { key: "syncError", label: "Sync Error Alerts", desc: "Notification when platform sync fails" },
                { key: "refund", label: "Refund Requests", desc: "Get notified of new refund requests" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Logs */}
        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("systemLog")}</CardTitle>
              <CardDescription>View recent system activity</CardDescription>
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
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{formatDate(log.time)}</TableCell>
                        <TableCell className="font-mono text-sm">{log.username}</TableCell>
                        <TableCell>
                          <Badge variant={log.success ? "secondary" : "destructive"}>
                            {log.success ? "Login" : "Failed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.success ? "Successful login" : "Failed login attempt"}
                          {log.ip ? ` from ${log.ip}` : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No logs found</TableCell>
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
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {t("addUser")}
            </DialogTitle>
            <DialogDescription className="text-amber-200 mt-1">
              Create a new system user
            </DialogDescription>
          </div>
          <div className="px-6 pb-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={(val) => setNewUser({ ...newUser, role: val })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
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
    </div>
  );
}
