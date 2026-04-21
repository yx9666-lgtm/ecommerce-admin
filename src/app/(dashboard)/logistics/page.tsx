"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck,
  Search,
  Printer,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Navigation,
  Eye,
  Loader2,
} from "lucide-react";

type ShipmentRow = {
  id: string;
  orderId: string;
  carrier: string;
  trackingNo: string;
  status: string;
  customer: string;
  destination: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  metadata: any;
};

type CarrierStat = {
  name: string;
  shipments: number;
  avgDays: number | null;
};

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "bg-gray-500/15 text-gray-600 dark:text-gray-400", icon: Clock, label: "Pending" },
  in_transit: { color: "bg-blue-500/15 text-blue-600 dark:text-blue-400", icon: Truck, label: "In Transit" },
  out_for_delivery: { color: "bg-gold-400/15 text-gold-600 dark:text-gold-400", icon: Navigation, label: "Out for Delivery" },
  delivered: { color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", icon: CheckCircle2, label: "Delivered" },
  delayed: { color: "bg-red-500/15 text-red-600 dark:text-red-400", icon: AlertTriangle, label: "Delayed" },
};

export default function LogisticsPage() {
  const t = useTranslations("logistics");
  const tc = useTranslations("common");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedShipment, setSelectedShipment] = useState<ShipmentRow | null>(null);

  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [carriers, setCarriers] = useState<CarrierStat[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  // Debounce ref for search input
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }, []);

  // Reset page when status filter changes
  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  // Fetch shipments from API
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", "20");
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (debouncedSearch) params.set("search", debouncedSearch);

        const res = await fetch(`/api/logistics?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch logistics data");
        const json = await res.json();

        if (!cancelled) {
          setShipments(json.data ?? []);
          setTotal(json.total ?? 0);
          setCarriers(json.carriers ?? []);
        }
      } catch (err) {
        console.error("Logistics fetch error:", err);
        if (!cancelled) {
          setShipments([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [page, statusFilter, debouncedSearch]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Parse metadata tracking updates if available
  const getTrackingUpdates = (shipment: ShipmentRow) => {
    if (!shipment.metadata) return null;
    const meta = typeof shipment.metadata === "string"
      ? JSON.parse(shipment.metadata)
      : shipment.metadata;
    if (Array.isArray(meta?.trackingUpdates) && meta.trackingUpdates.length > 0) {
      return meta.trackingUpdates as { time: string; location: string; status: string }[];
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Carrier Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {loading && carriers.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-center justify-center h-[100px]">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          carriers.map((carrier) => (
            <Card key={carrier.name}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-gold-50 rounded-lg"><Truck className="h-5 w-5 text-gold-700" /></div>
                  <div>
                    <p className="font-medium text-sm">{carrier.name}</p>
                    <p className="text-xs text-muted-foreground">{carrier.shipments} shipments</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-lg font-bold">{carrier.avgDays != null ? `${carrier.avgDays}d` : "-"}</p>
                    <p className="text-[10px] text-muted-foreground">Avg Delivery</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-lg font-bold text-emerald-600">-</p>
                    <p className="text-[10px] text-muted-foreground">On Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tracking no., customer..." value={search} onChange={(e) => handleSearchChange(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc("all")}</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="gap-1"><Printer className="h-4 w-4" />{t("batchPrint")}</Button>
      </div>

      {/* Shipments Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>{t("carrier")}</TableHead>
                  <TableHead>{t("trackingNumber")}</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("shippedAt")}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      No shipments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  shipments.map((shipment) => {
                    const status = statusConfig[shipment.status] || statusConfig.pending;
                    const Icon = status.icon;
                    return (
                      <TableRow key={shipment.id}>
                        <TableCell className="font-mono text-sm">{shipment.orderId}</TableCell>
                        <TableCell className="text-sm">{shipment.carrier}</TableCell>
                        <TableCell className="font-mono text-sm">{shipment.trackingNo}</TableCell>
                        <TableCell className="text-sm">{shipment.customer}</TableCell>
                        <TableCell className="text-sm">{shipment.destination}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${status.color} border-0 gap-1`}>
                            <Icon className="h-3 w-3" />{status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{shipment.shippedAt ? new Date(shipment.shippedAt).toLocaleString() : "-"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedShipment(shipment)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                共 {total} 条，第 {page}/{totalPages} 页
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tracking Detail Dialog */}
      <Dialog open={!!selectedShipment} onOpenChange={() => setSelectedShipment(null)}>
        <DialogContent className="max-w-lg p-0">
          <div className="bg-gradient-to-r from-gold-500 to-gold-700 px-6 py-5 text-white rounded-t-lg">
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Tracking Details
            </DialogTitle>
            <DialogDescription className="text-gold-200 mt-1">
              {selectedShipment?.trackingNo}
            </DialogDescription>
          </div>
          <div className="px-6 pb-6">
          {selectedShipment && (() => {
            const updates = getTrackingUpdates(selectedShipment);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-muted-foreground">{t("carrier")}</p><p className="font-medium">{selectedShipment.carrier}</p></div>
                  <div><p className="text-xs text-muted-foreground">Customer</p><p className="font-medium">{selectedShipment.customer}</p></div>
                  <div><p className="text-xs text-muted-foreground">Destination</p><p className="font-medium">{selectedShipment.destination}</p></div>
                  <div>
                    <p className="text-xs text-muted-foreground">{selectedShipment.deliveredAt ? "Delivered At" : "Shipped At"}</p>
                    <p className="font-medium">
                      {selectedShipment.deliveredAt
                        ? new Date(selectedShipment.deliveredAt).toLocaleString()
                        : selectedShipment.shippedAt
                        ? new Date(selectedShipment.shippedAt).toLocaleString()
                        : "-"}
                    </p>
                  </div>
                </div>
                {updates ? (
                  <div className="border rounded-lg p-4">
                    <p className="font-medium text-sm mb-3">Tracking History</p>
                    <div className="space-y-4">
                      {updates.map((update, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full ${i === 0 ? "bg-gold-600" : "bg-muted-foreground/30"}`} />
                            {i < updates.length - 1 && <div className="w-0.5 h-full bg-muted-foreground/20 mt-1" />}
                          </div>
                          <div className="pb-4">
                            <p className="text-sm font-medium">{update.status}</p>
                            <p className="text-xs text-muted-foreground">{update.location}</p>
                            <p className="text-xs text-muted-foreground">{update.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4">
                    <p className="font-medium text-sm mb-2">Shipment Info</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">{t("status")}</p>
                        <p className="font-medium capitalize">{selectedShipment.status.replace(/_/g, " ")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("trackingNumber")}</p>
                        <p className="font-medium font-mono">{selectedShipment.trackingNo}</p>
                      </div>
                      {selectedShipment.shippedAt && (
                        <div>
                          <p className="text-xs text-muted-foreground">{t("shippedAt")}</p>
                          <p className="font-medium">{new Date(selectedShipment.shippedAt).toLocaleString()}</p>
                        </div>
                      )}
                      {selectedShipment.deliveredAt && (
                        <div>
                          <p className="text-xs text-muted-foreground">Delivered At</p>
                          <p className="font-medium">{new Date(selectedShipment.deliveredAt).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
