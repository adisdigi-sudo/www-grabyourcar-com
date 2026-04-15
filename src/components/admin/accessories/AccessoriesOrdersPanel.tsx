import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  Loader2,
  Eye,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", variant: "outline" as const },
  { value: "confirmed", label: "Confirmed", variant: "default" as const },
  { value: "processing", label: "Processing", variant: "secondary" as const },
  { value: "shipped", label: "Shipped", variant: "default" as const },
  { value: "delivered", label: "Delivered", variant: "default" as const },
  { value: "cancelled", label: "Cancelled", variant: "destructive" as const },
];

function statusColor(s: string) {
  switch (s) {
    case "pending": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "confirmed": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "processing": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    case "shipped": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
    case "delivered": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    default: return "bg-muted text-muted-foreground";
  }
}

export function AccessoriesOrdersPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<any>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["acc-orders", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("accessory_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("order_status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("accessory_orders")
        .update({ order_status: status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["acc-orders"] });
      toast.success("Order status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const filtered = (orders || []).filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.shipping_name?.toLowerCase().includes(s) ||
      o.order_id?.toLowerCase().includes(s) ||
      o.id.toLowerCase().includes(s) ||
      o.shipping_phone?.includes(s)
    );
  });

  const getItems = (items: any): any[] => {
    if (Array.isArray(items)) return items;
    try { return JSON.parse(items); } catch { return []; }
  };

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Badge variant="outline">{filtered.length} orders</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order ID, name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {filtered.map((order) => {
            const items = getItems(order.items);
            const isExpanded = expandedId === order.id;
            return (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Row */}
                  <button
                    className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-[120px]">
                      <p className="font-mono text-sm font-medium">
                        #{(order.order_id || order.id).slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(order.created_at), "dd MMM")}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{order.shipping_name}</p>
                    </div>
                    <p className="text-sm text-muted-foreground shrink-0">
                      {items.length} item{items.length !== 1 ? "s" : ""}
                    </p>
                    <p className="text-sm font-semibold shrink-0 min-w-[80px] text-right">
                      ₹{order.total_amount?.toLocaleString("en-IN")}
                    </p>
                    <div className="shrink-0 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={order.order_status}
                        onValueChange={(v) => updateStatus.mutate({ id: order.id, status: v })}
                      >
                        <SelectTrigger className={`h-8 text-xs border-0 ${statusColor(order.order_status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t px-4 py-3 bg-muted/30 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Customer</p>
                          <p className="font-medium">{order.shipping_name}</p>
                          <p className="text-xs">{order.shipping_phone}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Address</p>
                          <p className="text-xs">
                            {order.shipping_address}, {order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Payment</p>
                          <Badge variant={order.payment_status === "paid" ? "default" : "outline"} className="text-xs">
                            {order.payment_status}
                          </Badge>
                          {order.payment_id && <p className="text-xs mt-1 font-mono">{order.payment_id}</p>}
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Amount</p>
                          <p className="text-xs">Subtotal: ₹{order.subtotal?.toLocaleString("en-IN")}</p>
                          <p className="text-xs">Delivery: ₹{order.delivery_fee}</p>
                          {order.discount_amount ? (
                            <p className="text-xs text-emerald-600">Discount: -₹{order.discount_amount}</p>
                          ) : null}
                          <p className="font-semibold text-sm">Total: ₹{order.total_amount?.toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                      {/* Items */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Items</p>
                        <div className="flex flex-wrap gap-2">
                          {items.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 bg-background border rounded-md px-2 py-1">
                              {item.image && (
                                <img src={item.image} alt={item.name} className="h-8 w-8 rounded object-cover" />
                              )}
                              <div>
                                <p className="text-xs font-medium">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  ₹{item.price} × {item.quantity}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {order.notes && (
                        <p className="text-xs text-muted-foreground bg-background rounded p-2">
                          <span className="font-medium">Notes:</span> {order.notes}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
