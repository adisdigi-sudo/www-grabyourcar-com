import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Truck, Package, Search, Edit, Plus, MapPin, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"];

const COURIERS = [
  "Delhivery", "BlueDart", "DTDC", "Ecom Express", "XpressBees",
  "India Post", "FedEx", "Shadowfax", "Shiprocket", "Other",
];

export const AccessoriesTrackingPanel = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editOrder, setEditOrder] = useState<any | null>(null);
  const [trackingForm, setTrackingForm] = useState({
    tracking_number: "",
    courier_name: "",
    courier_tracking_url: "",
    estimated_delivery: "",
    order_status: "",
    note_message: "",
    note_location: "",
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-tracking-orders", statusFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("accessory_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        q = q.eq("order_status", statusFilter);
      }

      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string; updates: Record<string, any> }) => {
      const { error } = await (supabase as any)
        .from("accessory_orders")
        .update(updates)
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracking-orders"] });
      toast.success("Order tracking updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ orderId, message, location }: { orderId: string; message: string; location?: string }) => {
      const { error } = await (supabase as any)
        .from("order_tracking_history")
        .insert({
          order_id: orderId,
          status: "update",
          message,
          location: location || null,
          updated_by: "admin",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tracking note added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleOpenEdit = (order: any) => {
    setEditOrder(order);
    setTrackingForm({
      tracking_number: order.tracking_number || "",
      courier_name: order.courier_name || "",
      courier_tracking_url: order.courier_tracking_url || "",
      estimated_delivery: order.estimated_delivery || "",
      order_status: order.order_status || "pending",
      note_message: "",
      note_location: "",
    });
  };

  const handleSave = () => {
    if (!editOrder) return;

    const updates: Record<string, any> = {};
    if (trackingForm.tracking_number !== (editOrder.tracking_number || ""))
      updates.tracking_number = trackingForm.tracking_number || null;
    if (trackingForm.courier_name !== (editOrder.courier_name || ""))
      updates.courier_name = trackingForm.courier_name || null;
    if (trackingForm.courier_tracking_url !== (editOrder.courier_tracking_url || ""))
      updates.courier_tracking_url = trackingForm.courier_tracking_url || null;
    if (trackingForm.estimated_delivery !== (editOrder.estimated_delivery || ""))
      updates.estimated_delivery = trackingForm.estimated_delivery || null;
    if (trackingForm.order_status !== editOrder.order_status)
      updates.order_status = trackingForm.order_status;

    if (Object.keys(updates).length > 0) {
      updateMutation.mutate({ orderId: editOrder.id, updates });
    }

    if (trackingForm.note_message.trim()) {
      addNoteMutation.mutate({
        orderId: editOrder.id,
        message: trackingForm.note_message,
        location: trackingForm.note_location,
      });
    }

    setEditOrder(null);
  };

  const filteredOrders = orders.filter((o: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (o.order_id || "").toLowerCase().includes(q) ||
      (o.shipping_name || "").toLowerCase().includes(q) ||
      (o.shipping_phone || "").includes(q) ||
      (o.tracking_number || "").toLowerCase().includes(q)
    );
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "delivered": return "default";
      case "shipped": case "out_for_delivery": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" /> Order Tracking Management
        </h2>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order ID, name, phone, tracking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No orders found</div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order: any) => (
            <Card key={order.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-sm font-medium">
                        {order.order_id || order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <Badge variant={statusColor(order.order_status) as any}>
                        {order.order_status.replace(/_/g, " ")}
                      </Badge>
                      {order.tracking_number && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Truck className="h-3 w-3" />
                          {order.courier_name || "Courier"}: {order.tracking_number}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{order.shipping_name}</span>
                      <span>{order.shipping_phone}</span>
                      <span>{order.shipping_city}, {order.shipping_state}</span>
                      <span>₹{order.total_amount}</span>
                      <span>{format(new Date(order.created_at), "dd MMM yyyy")}</span>
                    </div>
                    {order.estimated_delivery && order.order_status !== "delivered" && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                        <Clock className="h-3 w-3" />
                        ETA: {format(new Date(order.estimated_delivery), "dd MMM yyyy")}
                      </div>
                    )}
                  </div>

                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(order)}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Update
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editOrder} onOpenChange={(open) => !open && setEditOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Update Tracking — {editOrder?.order_id || editOrder?.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Order Status</Label>
                <Select value={trackingForm.order_status} onValueChange={(v) => setTrackingForm((f) => ({ ...f, order_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Courier</Label>
                <Select value={trackingForm.courier_name} onValueChange={(v) => setTrackingForm((f) => ({ ...f, courier_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select courier" /></SelectTrigger>
                  <SelectContent>
                    {COURIERS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Tracking Number</Label>
              <Input
                value={trackingForm.tracking_number}
                onChange={(e) => setTrackingForm((f) => ({ ...f, tracking_number: e.target.value }))}
                placeholder="e.g. AWB1234567890"
              />
            </div>

            <div>
              <Label>Courier Tracking URL</Label>
              <Input
                value={trackingForm.courier_tracking_url}
                onChange={(e) => setTrackingForm((f) => ({ ...f, courier_tracking_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label>Estimated Delivery Date</Label>
              <Input
                type="date"
                value={trackingForm.estimated_delivery}
                onChange={(e) => setTrackingForm((f) => ({ ...f, estimated_delivery: e.target.value }))}
              />
            </div>

            <div className="border-t border-border pt-3">
              <Label className="flex items-center gap-1 mb-1">
                <Plus className="h-3 w-3" /> Add Tracking Note (optional)
              </Label>
              <Textarea
                rows={2}
                value={trackingForm.note_message}
                onChange={(e) => setTrackingForm((f) => ({ ...f, note_message: e.target.value }))}
                placeholder="e.g. Package reached Delhi hub"
              />
              <Input
                className="mt-2"
                value={trackingForm.note_location}
                onChange={(e) => setTrackingForm((f) => ({ ...f, note_location: e.target.value }))}
                placeholder="Location (optional)"
              />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={updateMutation.isPending}>
              Save & Update Tracking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
