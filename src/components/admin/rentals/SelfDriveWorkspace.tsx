import { useState, useMemo, useCallback, forwardRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import {
  Car, Phone, PhoneCall, MessageCircle, Plus, GripVertical, Clock,
  Users, TrendingUp, CheckCircle2, XCircle, Tag, Share2, Send,
  Calendar, Star, FileSpreadsheet, MapPin, CreditCard, FileText,
  AlertTriangle, Download, Upload, Image, Banknote, Trophy, Search,
} from "lucide-react";
import jsPDF from "jspdf";
import { LeadImportDialog } from "../shared/LeadImportDialog";
import { StageNotificationBanner } from "../shared/StageNotificationBanner";

// ─── 6-Stage Pipeline ──────────────────────────────────────────────────
const STAGES = [
  { value: "new_inquiry", label: "New Inquiry", icon: Car, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { value: "smart_calling", label: "Smart Call", icon: PhoneCall, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "offer_shared", label: "Offer Shared", icon: Tag, color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  { value: "partner_escalation", label: "Partner Escalation", icon: Send, color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  { value: "booking_payment", label: "Booking & Payment", icon: CreditCard, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { value: "trip_complete", label: "Trip Complete", icon: CheckCircle2, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
];

const STAGE_MAP: Record<string, string> = {
  new_inquiry: "new_inquiry", new: "new_inquiry", pending: "new_inquiry",
  smart_calling: "smart_calling", contacted: "smart_calling",
  offer_shared: "offer_shared", quoted: "offer_shared",
  partner_escalation: "partner_escalation", escalated: "partner_escalation",
  booking_payment: "booking_payment", confirmed: "booking_payment", booked: "booking_payment",
  trip_complete: "trip_complete", completed: "trip_complete", delivered: "trip_complete",
  lost: "new_inquiry",
};
const normalizeStage = (s: string | null) => STAGE_MAP[s || "new_inquiry"] || "new_inquiry";

const CALL_STATUSES = ["Interested", "Not Interested", "Call Back", "No Answer", "Wrong Number", "Busy", "Follow Up"];
const VEHICLE_TYPES = ["Hatchback", "Sedan", "SUV", "MUV", "Tempo Traveller", "Luxury"];
const PAYMENT_STATUSES = ["Pending", "Partial", "Paid", "Refunded"];
const LOST_REASONS = ["Price too high", "Found cheaper", "Changed plans", "No availability", "Bad reviews", "Other"];

export function SelfDriveWorkspace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragging, setDragging] = useState<any>(null);

  // Fetch bookings
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["rental-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rental_bookings")
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((b: any) => ({
        ...b,
        pipeline_stage: b.pipeline_stage || normalizeStage(b.status),
      }));
    },
  });

  // Fetch vehicles for car data
  const { data: vehicles = [] } = useQuery({
    queryKey: ["rental-vehicles"],
    queryFn: async () => {
      const { data } = await supabase.from("rental_vehicles").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  // Fetch partners
  const { data: partners = [] } = useQuery({
    queryKey: ["api-partners"],
    queryFn: async () => {
      const { data } = await supabase.from("api_partners").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  // KPI
  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s.value] = bookings.filter((b: any) => b.pipeline_stage === s.value).length;
    return acc;
  }, {} as Record<string, number>);
  const totalBookings = bookings.length;
  const completed = stageCounts["trip_complete"] || 0;
  const totalRevenue = bookings.filter((b: any) => b.pipeline_stage === "trip_complete" || b.payment_status === "paid")
    .reduce((s: number, b: any) => s + (b.total_amount || 0), 0);

  // Notifications
  const notifications = useMemo(() => {
    const items: any[] = [];
    const now = new Date();
    bookings.forEach((b: any) => {
      if (b.pickup_date) {
        const pickup = new Date(b.pickup_date);
        const hours = differenceInHours(pickup, now);
        if (hours >= 0 && hours <= 48 && b.pipeline_stage !== "trip_complete") {
          items.push({
            id: `pickup-${b.id}`, type: hours <= 12 ? "urgent" : "followup",
            title: `${b.vehicle_name} - pickup in ${hours}h`,
            subtitle: `${b.pickup_location}`,
          });
        }
      }
      if (b.dropoff_date) {
        const dropoff = new Date(b.dropoff_date);
        const hours = differenceInHours(dropoff, now);
        if (hours >= -6 && hours <= 6 && b.pipeline_stage === "booking_payment") {
          items.push({
            id: `dropoff-${b.id}`, type: "urgent",
            title: `${b.vehicle_name} - return ${hours < 0 ? "overdue" : "today"}`,
            subtitle: `${b.dropoff_location}`,
          });
        }
      }
    });
    return items;
  }, [bookings]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: any) => {
      const statusMap: Record<string, string> = {
        new_inquiry: "pending", smart_calling: "contacted", offer_shared: "quoted",
        partner_escalation: "escalated", booking_payment: "confirmed", trip_complete: "completed",
      };
      const dbUpdates = { ...updates, updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() };
      if (updates.pipeline_stage) {
        dbUpdates.status = statusMap[updates.pipeline_stage] || updates.pipeline_stage;
      }
      const { error } = await supabase.from("rental_bookings").update(dbUpdates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-pipeline"] });
      toast.success("Updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Drag & Drop
  const handleDragStart = useCallback((e: React.DragEvent, b: any) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: b.id, stage: b.pipeline_stage }));
    setDragging(b);
  }, []);
  const handleDragEnd = useCallback(() => { setDragging(null); setDragOver(null); }, []);
  const handleDrop = useCallback((e: React.DragEvent, target: string) => {
    e.preventDefault(); setDragOver(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.stage === target) return;
      if (target === "trip_complete") {
        const b = bookings.find((x: any) => x.id === data.id);
        if (b) { setSelected({ ...b, _targetStage: "trip_complete" }); setShowModal(true); }
        return;
      }
      updateMutation.mutate({ id: data.id, updates: { pipeline_stage: target } });
    } catch {}
    setDragging(null);
  }, [bookings, updateMutation]);

  const formatAmt = (v: number) => v >= 100000 ? `Rs.${(v / 100000).toFixed(1)}L` : `Rs.${v.toLocaleString("en-IN")}`;

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Inquiries", value: totalBookings, icon: Users, color: "text-blue-600", bg: "from-blue-500/10" },
          { label: "Active Trips", value: stageCounts["booking_payment"] || 0, icon: Car, color: "text-emerald-600", bg: "from-emerald-500/10" },
          { label: "Completed", value: completed, icon: CheckCircle2, color: "text-yellow-600", bg: "from-yellow-500/10" },
          { label: "Revenue", value: formatAmt(totalRevenue), icon: Banknote, color: "text-emerald-600", bg: "from-emerald-500/10" },
        ].map((kpi, i) => (
          <Card key={i} className="border overflow-hidden">
            <CardContent className="p-3 relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.bg} to-transparent opacity-50`} />
              <div className="relative flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg bg-background/80 ${kpi.color}`}><kpi.icon className="h-3.5 w-3.5" /></div>
                <div><p className="text-lg font-bold leading-none">{kpi.value}</p><p className="text-[9px] text-muted-foreground mt-0.5">{kpi.label}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {notifications.length > 0 && <StageNotificationBanner items={notifications} />}

      <LeadImportDialog open={showImport} onOpenChange={setShowImport} title="Import Rental Leads"
        templateColumns={["name", "phone", "vehicle_type", "pickup_date", "dropoff_date", "pickup_location"]}
        onImport={async (rows) => {
          const inserts = rows.map(r => ({
            user_id: user?.id || "system",
            vehicle_name: r.vehicle_type || "TBD",
            vehicle_type: r.vehicle_type || "SUV",
            pickup_date: r.pickup_date || new Date().toISOString(),
            pickup_time: "10:00",
            pickup_location: r.pickup_location || "Delhi NCR",
            dropoff_date: r.dropoff_date || new Date().toISOString(),
            dropoff_time: "10:00",
            dropoff_location: r.pickup_location || "Delhi NCR",
            total_days: 1, daily_rate: 0, subtotal: 0, total_amount: 0,
            status: "pending",
            notes: `Imported: ${r.name || ""} - ${r.phone || ""}`,
          }));
          const { error } = await supabase.from("rental_bookings").insert(inserts);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ["rental-pipeline"] });
        }}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Self-Drive Pipeline</h2>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{completed} Completed</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowImport(true)} className="gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Import
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Inquiry
          </Button>
        </div>
      </div>

      {dragging && (
        <div className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg py-1.5 border border-dashed border-primary/30 animate-pulse">
          Drop to move <strong>{dragging.vehicle_name}</strong>
        </div>
      )}

      {/* Kanban */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max">
          {STAGES.map(stage => {
            const stageItems = bookings.filter((b: any) => b.pipeline_stage === stage.value);
            const isOver = dragOver === stage.value;
            const showDrop = dragging && isOver;
            const Icon = stage.icon;
            return (
              <div key={stage.value} className="w-[280px] shrink-0 flex flex-col"
                onDragOver={e => { e.preventDefault(); setDragOver(stage.value); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
                onDrop={e => handleDrop(e, stage.value)}>
                <div className={`rounded-lg border p-2.5 mb-2 transition-all ${stage.color} ${showDrop ? "ring-2 ring-primary scale-[1.02] shadow-lg" : ""}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /><span className="font-semibold text-xs">{stage.label}</span></div>
                    <Badge variant="secondary" className="text-[10px] h-5">{stageItems.length}</Badge>
                  </div>
                </div>
                <div className={`space-y-2 min-h-[120px] flex-1 rounded-lg transition-all p-1 ${showDrop ? "bg-primary/5 border-2 border-dashed border-primary/30" : ""}`}>
                  {stageItems.length === 0 && <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/40 py-8">{showDrop ? "Drop here" : "No items"}</div>}
                  {stageItems.map((b: any) => (
                    <RentalCard key={b.id} booking={b} onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                      onClick={() => { setSelected(b); setShowModal(true); }} isDragging={dragging?.id === b.id} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Add Dialog */}
      <AddRentalDialog open={showAdd} onOpenChange={setShowAdd} vehicles={vehicles} userId={user?.id || ""} />

      {/* Detail Modal */}
      {selected && (
        <RentalDetailModal open={showModal} onOpenChange={v => { setShowModal(v); if (!v) setSelected(null); }}
          booking={selected} vehicles={vehicles} partners={partners}
          onUpdate={(updates: any) => updateMutation.mutate({ id: selected.id, updates })} />
      )}
    </div>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────
const RentalCard = forwardRef<HTMLDivElement, any>(function RentalCard(
  { booking, onDragStart, onDragEnd, onClick, isDragging }: any,
  ref,
) {
  const customerName = booking.customer_name || booking.notes?.match(/Imported:\s*(.+?)\s*-/)?.[1] || "";
  const customerPhone = booking.phone || booking.notes?.match(/-\s*(\d{10})/)?.[1] || "";

  const handleWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!customerPhone) return;
    const msg = `Hi${customerName ? ` ${customerName}` : ""}, regarding your ${booking.vehicle_name} rental booking (${booking.pickup_date ? format(new Date(booking.pickup_date), "dd MMM") : ""} - ${booking.dropoff_date ? format(new Date(booking.dropoff_date), "dd MMM") : ""}). Rs.${(booking.total_amount || 0).toLocaleString("en-IN")}. — GrabYourCar`;
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    await sendWhatsApp({ phone: customerPhone, message: msg, name: customerName, logEvent: "rental_update" });
  };

  return (
    <Card ref={ref} draggable onDragStart={e => onDragStart(e, booking)} onDragEnd={onDragEnd} onClick={onClick}
      className={`border-border/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${isDragging ? "opacity-30 scale-95" : ""}`}>
      <CardContent className="p-2.5 space-y-1.5">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1.5 min-w-0">
            <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0" />
            <span className="font-medium text-xs truncate max-w-[150px]">{booking.vehicle_name}</span>
          </div>
          <Badge className={`text-[8px] px-1 py-0 ${booking.payment_status === "paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
            {booking.payment_status}
          </Badge>
        </div>
        {customerName && (
          <div className="text-[10px] font-medium text-foreground/80 flex items-center gap-1">
            <Users className="h-2.5 w-2.5" /> {customerName}
          </div>
        )}
        {customerPhone && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Phone className="h-2.5 w-2.5" />{customerPhone}
            </div>
            <button onClick={handleWhatsApp} className="p-1 rounded-md hover:bg-emerald-500/10 transition-colors opacity-0 group-hover:opacity-100" title="Send WhatsApp">
              <MessageCircle className="h-3 w-3 text-emerald-600" />
            </button>
          </div>
        )}
        <div className="text-[9px] font-mono text-muted-foreground/50">{booking.vehicle_type}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MapPin className="h-2.5 w-2.5" />{booking.pickup_location}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Calendar className="h-2.5 w-2.5" />
          {booking.pickup_date ? format(new Date(booking.pickup_date), "dd MMM") : "-"} - {booking.dropoff_date ? format(new Date(booking.dropoff_date), "dd MMM") : "-"}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold">Rs.{(booking.total_amount || 0).toLocaleString("en-IN")}</span>
          <span className="text-[10px] text-muted-foreground">{booking.total_days}d</span>
        </div>
      </CardContent>
    </Card>
  );
});

// ─── Add Dialog ─────────────────────────────────────────────────────────
function AddRentalDialog({ open, onOpenChange, vehicles, userId }: any) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    customer_name: "", phone: "", email: "", source: "walk_in",
    vehicle_id: "", vehicle_name: "", vehicle_type: "SUV",
    pickup_date: "", pickup_time: "10:00", pickup_location: "Delhi NCR",
    dropoff_date: "", dropoff_time: "10:00", dropoff_location: "Delhi NCR",
    daily_rate: "", notes: "", driver_license_number: "",
  });

  const totalDays = form.pickup_date && form.dropoff_date
    ? Math.max(1, Math.ceil((new Date(form.dropoff_date).getTime() - new Date(form.pickup_date).getTime()) / 86400000))
    : 1;
  const subtotal = totalDays * (Number(form.daily_rate) || 0);

  const SOURCES = ["Website", "WhatsApp", "Walk-in", "Google Ads", "Instagram", "Facebook", "Referral", "JustDial", "Other"];

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rental_bookings").insert({
        user_id: userId || "system",
        customer_name: form.customer_name || null,
        phone: form.phone || null,
        email: form.email || null,
        source: form.source || "walk_in",
        vehicle_name: form.vehicle_name || "TBD",
        vehicle_type: form.vehicle_type,
        pickup_date: form.pickup_date, pickup_time: form.pickup_time, pickup_location: form.pickup_location,
        dropoff_date: form.dropoff_date, dropoff_time: form.dropoff_time, dropoff_location: form.dropoff_location,
        total_days: totalDays, daily_rate: Number(form.daily_rate) || 0, subtotal, total_amount: subtotal,
        status: "pending", payment_status: "pending",
        driver_license_number: form.driver_license_number || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rental-pipeline"] });
      toast.success("Rental inquiry created");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Self-Drive Inquiry</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {/* Customer Info */}
          <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Name *</Label><Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Full name" /></div>
              <div><Label className="text-xs">Phone *</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit mobile" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email address" /></div>
              <div><Label className="text-xs">Source</Label>
                <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s.toLowerCase().replace(/\s+/g, "_")}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">DL Number</Label><Input value={form.driver_license_number} onChange={e => setForm(p => ({ ...p, driver_license_number: e.target.value.toUpperCase() }))} placeholder="Driving License No." /></div>
          </div>

          {/* Vehicle & Trip */}
          <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vehicle & Trip</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Vehicle</Label>
                <Select value={form.vehicle_id} onValueChange={v => {
                  const veh = vehicles.find((x: any) => x.id === v);
                  setForm(p => ({ ...p, vehicle_id: v, vehicle_name: veh?.name || "", vehicle_type: veh?.vehicle_type || p.vehicle_type, daily_rate: veh?.rent_self_drive?.toString() || p.daily_rate }));
                }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name} ({v.vehicle_type})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Type</Label>
                <Select value={form.vehicle_type} onValueChange={v => setForm(p => ({ ...p, vehicle_type: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Pickup Date</Label><Input type="date" value={form.pickup_date} onChange={e => setForm(p => ({ ...p, pickup_date: e.target.value }))} /></div>
              <div><Label className="text-xs">Drop-off Date</Label><Input type="date" value={form.dropoff_date} onChange={e => setForm(p => ({ ...p, dropoff_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Pickup Location</Label><Input value={form.pickup_location} onChange={e => setForm(p => ({ ...p, pickup_location: e.target.value }))} /></div>
              <div><Label className="text-xs">Drop-off Location</Label><Input value={form.dropoff_location} onChange={e => setForm(p => ({ ...p, dropoff_location: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Daily Rate (Rs.)</Label><Input type="number" value={form.daily_rate} onChange={e => setForm(p => ({ ...p, daily_rate: e.target.value }))} /></div>
              <div className="flex flex-col justify-end">
                <p className="text-xs text-muted-foreground">{totalDays} days = <span className="font-bold text-foreground">Rs.{subtotal.toLocaleString("en-IN")}</span></p>
              </div>
            </div>
          </div>

          <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          <Button onClick={() => createMutation.mutate()} disabled={!form.customer_name || !form.phone || !form.vehicle_name || !form.pickup_date || createMutation.isPending} className="w-full">
            {createMutation.isPending ? "Creating..." : "Create Inquiry"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail Modal ───────────────────────────────────────────────────────
function RentalDetailModal({ open, onOpenChange, booking, vehicles, partners, onUpdate }: any) {
  const [remarks, setRemarks] = useState("");
  const [callStatus, setCallStatus] = useState("");
  const [callRemarks, setCallRemarks] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(booking.payment_status || "pending");
  const [paymentId, setPaymentId] = useState(booking.payment_id || "");
  const [partnerId, setPartnerId] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [agreementGenerated, setAgreementGenerated] = useState(!!booking.agreement_url);
  const [agreementApproved, setAgreementApproved] = useState(false);

  const currentStage = booking._targetStage || booking.pipeline_stage;
  const stageConfig = STAGES.find(s => s.value === currentStage);

  const handleGenerateAgreement = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();

    doc.setFillColor(37, 99, 235); doc.rect(0, 0, w, 45, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.setFont("helvetica", "bold");
    doc.text("Self-Drive Rental Agreement", w / 2, 20, { align: "center" });
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("GrabYourCar - www.grabyourcar.com", w / 2, 32, { align: "center" });

    let y = 60;
    const bx = 20; const bw = w - 40;
    doc.setTextColor(60, 60, 60);

    const rows = [
      ["Booking ID", booking.id.slice(0, 12)],
      ["Vehicle", `${booking.vehicle_name} (${booking.vehicle_type})`],
      ["Pickup", `${booking.pickup_date} at ${booking.pickup_time} - ${booking.pickup_location}`],
      ["Drop-off", `${booking.dropoff_date} at ${booking.dropoff_time} - ${booking.dropoff_location}`],
      ["Duration", `${booking.total_days} day(s)`],
      ["Daily Rate", `Rs.${(booking.daily_rate || 0).toLocaleString("en-IN")}`],
      ["Total Amount", `Rs.${(booking.total_amount || 0).toLocaleString("en-IN")}`],
      ["Security Deposit", `Rs.${(booking.security_deposit || 0).toLocaleString("en-IN")}`],
      ["Payment Status", booking.payment_status],
      ["DL Number", booking.driver_license_number || "-"],
    ];

    rows.forEach(([label, value], i) => {
      const ry = y + i * 12;
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(bx, ry - 4, bw, 12, "F"); }
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
      doc.text(label, bx + 6, ry + 4);
      doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text(value, bx + bw - 6, ry + 4, { align: "right" });
    });

    y += rows.length * 12 + 20;
    doc.setFontSize(8); doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${format(new Date(), "dd MMM yyyy")} | GrabYourCar`, bx, y);

    doc.save(`Rental_Agreement_${booking.id.slice(0, 8)}.pdf`);
    toast.success("Agreement PDF downloaded!");
  };

  const handleShareWhatsApp = async () => {
    const msg = `*Self-Drive Rental - GrabYourCar*\n\nVehicle: ${booking.vehicle_name}\nType: ${booking.vehicle_type}\nPickup: ${booking.pickup_date} at ${booking.pickup_time}\nLocation: ${booking.pickup_location}\nDrop-off: ${booking.dropoff_date}\nTotal: Rs.${(booking.total_amount || 0).toLocaleString("en-IN")}\n\nwww.grabyourcar.com`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" /> {booking.vehicle_name}
            <Badge className={stageConfig?.color}>{stageConfig?.label}</Badge>
            <Badge variant="outline" className="text-[10px]">{booking.vehicle_type}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Vehicle & Booking Info */}
        <Card className="border bg-muted/30">
          <CardContent className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div><span className="text-muted-foreground text-xs">Pickup</span>
              <p className="font-medium">{booking.pickup_date ? format(new Date(booking.pickup_date), "dd MMM yyyy") : "-"} at {booking.pickup_time}</p>
              <p className="text-xs text-muted-foreground">{booking.pickup_location}</p>
            </div>
            <div><span className="text-muted-foreground text-xs">Drop-off</span>
              <p className="font-medium">{booking.dropoff_date ? format(new Date(booking.dropoff_date), "dd MMM yyyy") : "-"} at {booking.dropoff_time}</p>
              <p className="text-xs text-muted-foreground">{booking.dropoff_location}</p>
            </div>
            <div><span className="text-muted-foreground text-xs">Amount</span>
              <p className="font-bold text-emerald-600">Rs.{(booking.total_amount || 0).toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-muted-foreground">{booking.total_days}d x Rs.{(booking.daily_rate || 0).toLocaleString("en-IN")}/day</p>
            </div>
            {booking.driver_license_number && (
              <div><span className="text-muted-foreground text-xs">DL Number</span><p className="font-medium">{booking.driver_license_number}</p></div>
            )}
            {booking.security_deposit && (
              <div><span className="text-muted-foreground text-xs">Security Deposit</span><p className="font-medium">Rs.{booking.security_deposit.toLocaleString("en-IN")}</p></div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* ─── Stage: New Inquiry ─────────────────── */}
        {currentStage === "new_inquiry" && (
          <div className="space-y-3 p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Car className="h-4 w-4" /> New Inquiry - Car & Partner Details</h3>
            {booking.vehicle_image && <img src={booking.vehicle_image} alt={booking.vehicle_name} className="w-full h-32 object-cover rounded-lg" />}
            <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2"
              onClick={() => { onUpdate({ pipeline_stage: "smart_calling" }); toast.success("Moved to Smart Calling"); }}>
              <PhoneCall className="h-4 w-4" /> Move to Smart Calling
            </Button>
          </div>
        )}

        {/* ─── Stage: Smart Calling ──────────────── */}
        {currentStage === "smart_calling" && (
          <div className="space-y-3 p-4 rounded-lg border bg-amber-500/5 border-amber-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><PhoneCall className="h-4 w-4" /> Smart Calling</h3>
            <div>
              <Label>Call Status *</Label>
              <Select value={callStatus} onValueChange={setCallStatus}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{CALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Call Remarks *</Label>
              <Textarea value={callRemarks} onChange={e => setCallRemarks(e.target.value)} placeholder="Discussion notes..." rows={2} />
            </div>
            <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white" onClick={() => {
              if (!callStatus || !callRemarks.trim()) { toast.error("Status and remarks are mandatory"); return; }
              const notes = `[Call: ${callStatus}] ${callRemarks}\n${booking.notes || ""}`;
              const next = callStatus === "Interested" ? "offer_shared" : booking.pipeline_stage;
              onUpdate({ pipeline_stage: next, notes });
              toast.success("Call logged");
            }}>Save Call Log</Button>
          </div>
        )}

        {/* ─── Stage: Offer Shared ──────────────── */}
        {currentStage === "offer_shared" && (
          <div className="space-y-3 p-4 rounded-lg border bg-violet-500/5 border-violet-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Tag className="h-4 w-4" /> Share Offer & Quote</h3>
            {booking.notes && (
              <div className="rounded-lg border bg-background p-3 max-h-32 overflow-y-auto">
                <p className="text-[10px] text-muted-foreground font-medium uppercase mb-1">Chat / Remarks History</p>
                <pre className="text-xs whitespace-pre-wrap">{booking.notes}</pre>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerateAgreement}>
                <Download className="h-3.5 w-3.5" /> Download Agreement
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-emerald-600" onClick={handleShareWhatsApp}>
                <Share2 className="h-3.5 w-3.5" /> Share on WhatsApp
              </Button>
            </div>
            <Button size="sm" className="w-full gap-2" onClick={() => { onUpdate({ pipeline_stage: "partner_escalation" }); toast.success("Moved to Partner Escalation"); }}>
              <Send className="h-4 w-4" /> Escalate to Partner
            </Button>
          </div>
        )}

        {/* ─── Stage: Partner Escalation ─────────── */}
        {currentStage === "partner_escalation" && (
          <div className="space-y-3 p-4 rounded-lg border bg-indigo-500/5 border-indigo-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Send className="h-4 w-4" /> Partner Escalation & Booking Management</h3>
            <div>
              <Label>Select Partner</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger><SelectValue placeholder="Choose partner..." /></SelectTrigger>
                <SelectContent>
                  {partners.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} {p.contact_phone ? `- ${p.contact_phone}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {partnerId && (() => {
              const p = partners.find((x: any) => x.id === partnerId);
              return p ? (
                <Card className="border bg-background">
                  <CardContent className="p-3 text-sm space-y-1">
                    <p className="font-semibold">{p.name}</p>
                    {p.contact_name && <p className="text-muted-foreground text-xs">Contact: {p.contact_name}</p>}
                    {p.contact_phone && <p className="text-muted-foreground text-xs">Phone: {p.contact_phone}</p>}
                    {p.contact_email && <p className="text-muted-foreground text-xs">Email: {p.contact_email}</p>}
                    {p.commission_percentage && <Badge variant="outline" className="text-[10px]">Commission: {p.commission_percentage}%</Badge>}
                  </CardContent>
                </Card>
              ) : null;
            })()}
            <Button size="sm" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
              const notes = `[Partner: ${partners.find((p: any) => p.id === partnerId)?.name || "N/A"}]\n${booking.notes || ""}`;
              onUpdate({ pipeline_stage: "booking_payment", notes });
              toast.success("Moved to Booking & Payment");
            }}>
              <CreditCard className="h-4 w-4" /> Confirm & Move to Payment
            </Button>
          </div>
        )}

        {/* ─── Stage: Booking & Payment ──────────── */}
        {currentStage === "booking_payment" && (
          <div className="space-y-3 p-4 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" /> Booking & Payment</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payment Status</Label>
                <Select value={paymentStatus} onValueChange={v => { setPaymentStatus(v); onUpdate({ payment_status: v }); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_STATUSES.map(s => <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment ID / Ref</Label>
                <Input value={paymentId} onChange={e => setPaymentId(e.target.value)} placeholder="TXN ID..."
                  onBlur={() => onUpdate({ payment_id: paymentId })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerateAgreement}>
                <FileText className="h-3.5 w-3.5" /> Agreement PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-emerald-600" onClick={handleShareWhatsApp}>
                <Share2 className="h-3.5 w-3.5" /> Share Details
              </Button>
            </div>
            <Button size="sm" className="w-full gap-2 bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => {
              if (paymentStatus !== "paid") { toast.error("Complete payment first"); return; }
              onUpdate({ pipeline_stage: "trip_complete" });
              toast.success("Moved to Trip Complete");
            }}>
              <CheckCircle2 className="h-4 w-4" /> Complete Trip
            </Button>
          </div>
        )}

        {/* ─── Stage: Trip Complete ──────────────── */}
        {(currentStage === "trip_complete" || booking._targetStage === "trip_complete") && (
          <div className="space-y-3 p-4 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Trophy className="h-4 w-4" /> Trip Complete - Customer Feedback</h3>
            <div>
              <Label>Rating * (1-5)</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setFeedbackRating(n)}
                    className={`p-1.5 rounded-lg transition-all ${feedbackRating >= n ? "text-yellow-500 bg-yellow-500/10" : "text-muted-foreground/30"}`}>
                    <Star className="h-6 w-6" fill={feedbackRating >= n ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>
            <div><Label>Feedback</Label>
              <Textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Trip experience..." rows={2} />
            </div>
            <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white gap-2" onClick={() => {
              const notes = `[Trip Complete] Rating: ${feedbackRating}/5 - ${feedbackText}\n${booking.notes || ""}`;
              onUpdate({ pipeline_stage: "trip_complete", notes });
              toast.success("Trip marked complete!");
              onOpenChange(false);
            }}>
              <Trophy className="h-4 w-4" /> Mark Complete
            </Button>
          </div>
        )}

        {/* Universal Remarks */}
        <Separator />
        <div className="space-y-2">
          <div className="flex gap-2">
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add remark..." rows={2} className="flex-1" />
            <Button size="sm" className="self-end" onClick={() => {
              if (!remarks.trim()) return;
              onUpdate({ notes: `[${format(new Date(), "dd MMM HH:mm")}] ${remarks}\n${booking.notes || ""}` });
              setRemarks(""); toast.success("Remark saved");
            }}>Save</Button>
          </div>
        </div>

        {/* Notes History */}
        {booking.notes && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-2">Activity & Notes</h4>
              <ScrollArea className="max-h-40">
                <pre className="text-xs whitespace-pre-wrap text-muted-foreground bg-muted/30 rounded p-2">{booking.notes}</pre>
              </ScrollArea>
            </div>
          </>
        )}

        {/* Quick Move */}
        {!booking._targetStage && currentStage !== "trip_complete" && (
          <div className="border-t pt-3">
            <p className="text-[10px] text-muted-foreground mb-2">Quick Move</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.filter(s => s.value !== currentStage).map(s => (
                <Button key={s.value} variant="outline" size="sm" className={`text-[10px] h-7 ${s.color}`}
                  onClick={() => {
                    if (s.value === "trip_complete") return;
                    onUpdate({ pipeline_stage: s.value });
                    toast.success(`Moved to ${s.label}`);
                  }}>{s.label}</Button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
