import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeTable } from "@/hooks/useRealtimeSync";
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
import { format, differenceInHours } from "date-fns";
import {
  Shield, Phone, PhoneCall, MessageCircle, Plus, GripVertical,
  Users, TrendingUp, CheckCircle2, Tag, Send, CreditCard,
  Calendar, Star, FileSpreadsheet, MapPin, FileText,
  Download, Share2, Banknote, Trophy, Wrench, Clock, Car,
} from "lucide-react";
import jsPDF from "jspdf";
import { LeadImportDialog } from "../shared/LeadImportDialog";
import { StageNotificationBanner } from "../shared/StageNotificationBanner";

// ─── 6-Stage Pipeline ──────────────────────────────────────────────────
const STAGES = [
  { value: "new_booking", label: "New Booking", icon: Shield, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { value: "verification", label: "Verification", icon: PhoneCall, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "payment", label: "Payment", icon: CreditCard, color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  { value: "scheduled", label: "Scheduled", icon: Calendar, color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  { value: "installation", label: "Installation", icon: Wrench, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { value: "completed", label: "Completed", icon: CheckCircle2, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
];

const ORDER_MAP: Record<string, string> = {
  pending: "new_booking", new_booking: "new_booking",
  verification: "verification", verifying: "verification", contacted: "verification",
  payment: "payment", payment_pending: "payment",
  scheduled: "scheduled", confirmed: "scheduled",
  installation: "installation", in_progress: "installation", fitting: "installation",
  completed: "completed", delivered: "completed", done: "completed",
};
const normalizeStage = (s: string | null) => ORDER_MAP[s || "pending"] || "new_booking";

const CALL_STATUSES = ["Verified", "Pending Info", "Wrong Number", "Call Back", "Cancelled"];
const VEHICLE_CLASSES = ["Two Wheeler", "Four Wheeler - Private", "Four Wheeler - Commercial", "Three Wheeler"];
const SERVICE_TYPES = ["HSRP Only (Front + Rear)", "FASTag Only", "HSRP + FASTag Combo", "HSRP Frame Only"];

export function HSRPWorkspace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragging, setDragging] = useState<any>(null);
  const [prevCount, setPrevCount] = useState<number | null>(null);

  // ── Real-time updates ──
  useRealtimeTable('hsrp_bookings', ['hsrp-pipeline']);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["hsrp-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hsrp_bookings")
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((b: any) => ({ ...b, pipeline_stage: b.pipeline_stage || normalizeStage(b.order_status) }));
    },
  });

  // ── New booking toast ──
  useEffect(() => {
    if (prevCount === null) { setPrevCount(bookings.length); return; }
    if (bookings.length > prevCount) {
      const newest = bookings[0];
      if (newest) toast(`🆕 New HSRP Booking! ${newest.owner_name || ""} - ${newest.registration_number || ""}`);
    }
    setPrevCount(bookings.length);
  }, [bookings.length]);

  // KPI
  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s.value] = bookings.filter((b: any) => b.pipeline_stage === s.value).length;
    return acc;
  }, {} as Record<string, number>);
  const total = bookings.length;
  const completedCount = stageCounts["completed"] || 0;
  const totalRevenue = bookings.filter((b: any) => b.payment_status === "paid")
    .reduce((s: number, b: any) => s + (b.payment_amount || 0), 0);
  const pendingPayment = bookings.filter((b: any) => b.payment_status !== "paid")
    .reduce((s: number, b: any) => s + (b.payment_amount || 0), 0);

  // Notifications
  const notifications = useMemo(() => {
    const items: any[] = [];
    const now = new Date();
    bookings.forEach((b: any) => {
      if (b.scheduled_date) {
        const schedDate = new Date(b.scheduled_date);
        const hours = differenceInHours(schedDate, now);
        if (hours >= 0 && hours <= 48 && b.pipeline_stage !== "completed") {
          items.push({
            id: `sched-${b.id}`, type: hours <= 12 ? "urgent" : "followup",
            title: `${b.owner_name} - ${b.registration_number} installation in ${hours}h`,
            subtitle: b.service_type,
          });
        }
      }
      if (b.payment_status !== "paid" && b.pipeline_stage !== "new_booking") {
        items.push({
          id: `pay-${b.id}`, type: "followup",
          title: `${b.owner_name} - payment pending Rs.${b.payment_amount}`,
          subtitle: b.registration_number,
        });
      }
    });
    return items.slice(0, 10);
  }, [bookings]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates, oldStage }: any) => {
      const statusMap: Record<string, string> = {
        new_booking: "pending", verification: "verifying", payment: "payment_pending",
        scheduled: "confirmed", installation: "in_progress", completed: "completed",
      };
      const dbUpdates = { ...updates, updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() };
      if (updates.pipeline_stage) {
        dbUpdates.order_status = statusMap[updates.pipeline_stage] || updates.pipeline_stage;
      }
      const { error } = await supabase.from("hsrp_bookings").update(dbUpdates).eq("id", id);
      if (error) throw error;

      // Trigger WhatsApp status notification (non-blocking)
      if (updates.pipeline_stage && updates.pipeline_stage !== oldStage) {
        supabase.functions.invoke("hsrp-status-notifier", {
          body: { booking_id: id, new_stage: updates.pipeline_stage, old_stage: oldStage },
        }).then(({ error: fnErr }) => {
          if (fnErr) console.error("HSRP notifier error:", fnErr);
          else console.log("HSRP WhatsApp notification sent for stage:", updates.pipeline_stage);
        }).catch(err => console.error("HSRP notifier failed:", err));
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["hsrp-pipeline"] }); toast.success("Updated"); },
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
      if (target === "completed") {
        const b = bookings.find((x: any) => x.id === data.id);
        if (b) { setSelected({ ...b, _targetStage: "completed" }); setShowModal(true); }
        return;
      }
      updateMutation.mutate({ id: data.id, updates: { pipeline_stage: target }, oldStage: data.stage });
    } catch {}
    setDragging(null);
  }, [bookings, updateMutation]);

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Bookings", value: total, icon: Users, color: "text-blue-600", bg: "from-blue-500/10" },
          { label: "Completed", value: completedCount, icon: CheckCircle2, color: "text-emerald-600", bg: "from-emerald-500/10" },
          { label: "Revenue", value: `Rs.${totalRevenue.toLocaleString("en-IN")}`, icon: Banknote, color: "text-emerald-600", bg: "from-emerald-500/10" },
          { label: "Pending Pay", value: `Rs.${pendingPayment.toLocaleString("en-IN")}`, icon: Clock, color: "text-amber-600", bg: "from-amber-500/10" },
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

      <LeadImportDialog open={showImport} onOpenChange={setShowImport} title="Import HSRP Bookings"
        templateColumns={["owner_name", "mobile", "email", "registration_number", "vehicle_class", "state", "pincode", "service_type"]}
        onImport={async (rows) => {
          const inserts = rows.map(r => ({
            owner_name: r.owner_name || "Unknown",
            mobile: (r.mobile || r.phone || "").replace(/\D/g, ""),
            email: r.email || "na@na.com",
            registration_number: r.registration_number || "TBD",
            vehicle_class: r.vehicle_class || "Four Wheeler - Private",
            state: r.state || "Delhi",
            pincode: r.pincode || "110001",
            service_type: r.service_type || "HSRP Only (Front + Rear)",
            service_price: 1100, payment_amount: 1100,
            order_status: "pending", payment_status: "pending",
            user_id: user?.id || "system",
          }));
          const { error } = await supabase.from("hsrp_bookings").insert(inserts);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ["hsrp-pipeline"] });
        }}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">HSRP & FASTag Pipeline</h2>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{completedCount} Done</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowImport(true)} className="gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Import
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Booking
          </Button>
        </div>
      </div>

      {dragging && (
        <div className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg py-1.5 border border-dashed border-primary/30 animate-pulse">
          Drop to move <strong>{dragging.owner_name} - {dragging.registration_number}</strong>
        </div>
      )}

      {/* Kanban */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max">
          {STAGES.map(stage => {
            const items = bookings.filter((b: any) => b.pipeline_stage === stage.value);
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
                    <Badge variant="secondary" className="text-[10px] h-5">{items.length}</Badge>
                  </div>
                </div>
                <div className={`space-y-2 min-h-[120px] flex-1 rounded-lg transition-all p-1 ${showDrop ? "bg-primary/5 border-2 border-dashed border-primary/30" : ""}`}>
                  {items.length === 0 && <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/40 py-8">{showDrop ? "Drop here" : "No items"}</div>}
                  {items.map((b: any) => (
                    <HSRPCard key={b.id} booking={b} onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                      onClick={() => { setSelected(b); setShowModal(true); }} isDragging={dragging?.id === b.id} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <AddHSRPDialog open={showAdd} onOpenChange={setShowAdd} userId={user?.id || ""} />

      {selected && (
        <HSRPDetailModal open={showModal} onOpenChange={v => { setShowModal(v); if (!v) setSelected(null); }}
          booking={selected} onUpdate={(updates: any) => updateMutation.mutate({ id: selected.id, updates })} />
      )}
    </div>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────
function HSRPCard({ booking, onDragStart, onDragEnd, onClick, isDragging }: any) {
  const stage = booking.pipeline_stage;
  const hsrpVars = {
    owner_name: booking.owner_name || "",
    registration_number: booking.registration_number || "",
    tracking_id: booking.tracking_id || booking.id.slice(0, 8),
    payment_amount: (booking.payment_amount || 0).toLocaleString("en-IN"),
    service_type: booking.service_type || "HSRP",
    schedule_date: booking.scheduled_date ? ` on ${format(new Date(booking.scheduled_date), "dd MMM")}` : "",
  };
  const hsrpSlugMap: Record<string, string> = {
    new_booking: "hsrp_new_booking",
    verification: "hsrp_verification",
    payment: "hsrp_payment",
    scheduled: "hsrp_scheduled",
    installation: "hsrp_installation",
    completed: "hsrp_completed",
  };
  const handleWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { getCrmMessage } = await import("@/lib/crmMessageTemplates");
    const slug = hsrpSlugMap[stage] || "hsrp_new_booking";
    const msg = await getCrmMessage(slug, hsrpVars);
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    await sendWhatsApp({ phone: booking.mobile || "", message: msg, name: booking.owner_name, logEvent: "hsrp_update" });
  };

  return (
    <Card draggable onDragStart={e => onDragStart(e, booking)} onDragEnd={onDragEnd} onClick={onClick}
      className={`border-border/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${isDragging ? "opacity-30 scale-95" : ""}`}>
      <CardContent className="p-2.5 space-y-1.5">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1.5 min-w-0">
            <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0" />
            <span className="font-medium text-xs truncate max-w-[120px]">{booking.owner_name}</span>
          </div>
          <Badge className={`text-[8px] px-1 py-0 ${booking.payment_status === "paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
            {booking.payment_status}
          </Badge>
        </div>
        <div className="text-[10px] font-mono font-bold text-foreground">{booking.registration_number}</div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Phone className="h-2.5 w-2.5" />{booking.mobile}
          </div>
          <button onClick={handleWhatsApp} className="p-1 rounded-md hover:bg-emerald-500/10 transition-colors opacity-0 group-hover:opacity-100" title="Send WhatsApp">
            <MessageCircle className="h-3 w-3 text-emerald-600" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[8px]">{booking.service_type}</Badge>
          <span className="text-[10px] font-semibold">Rs.{(booking.payment_amount || 0).toLocaleString("en-IN")}</span>
        </div>
        {booking.scheduled_date && (
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5" /> {format(new Date(booking.scheduled_date), "dd MMM")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Add Dialog ─────────────────────────────────────────────────────────
function AddHSRPDialog({ open, onOpenChange, userId }: any) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    owner_name: "", mobile: "", email: "", registration_number: "",
    chassis_number: "", engine_number: "", vehicle_class: "Four Wheeler - Private",
    state: "Delhi", address: "", pincode: "", service_type: "HSRP Only (Front + Rear)",
    home_installation: false,
  });

  const price = form.service_type.includes("Combo") ? 1600 : form.service_type.includes("FASTag") ? 500 : 1100;
  const homeFee = form.home_installation ? 200 : 0;
  const total = price + homeFee;

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("hsrp_bookings").insert({
        ...form, user_id: userId || "system",
        service_price: price, home_installation_fee: homeFee, payment_amount: total,
        order_status: "pending", payment_status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hsrp-pipeline"] });
      toast.success("HSRP booking created");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New HSRP / FASTag Booking</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Owner Name *</Label><Input value={form.owner_name} onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))} /></div>
            <div><Label>Mobile *</Label><Input value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email *</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>Registration No *</Label><Input value={form.registration_number} onChange={e => setForm(p => ({ ...p, registration_number: e.target.value.toUpperCase() }))} placeholder="DL01AB1234" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Chassis No</Label><Input value={form.chassis_number} onChange={e => setForm(p => ({ ...p, chassis_number: e.target.value }))} /></div>
            <div><Label>Engine No</Label><Input value={form.engine_number} onChange={e => setForm(p => ({ ...p, engine_number: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Vehicle Class</Label>
              <Select value={form.vehicle_class} onValueChange={v => setForm(p => ({ ...p, vehicle_class: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VEHICLE_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>State</Label><Input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            <div><Label>Pincode *</Label><Input value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))} /></div>
          </div>
          <div>
            <Label>Service Type</Label>
            <Select value={form.service_type} onValueChange={v => setForm(p => ({ ...p, service_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div>
              <p className="text-sm font-semibold">Total: Rs.{total.toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-muted-foreground">Service: Rs.{price} {homeFee > 0 ? `+ Home: Rs.${homeFee}` : ""}</p>
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={form.home_installation}
                onChange={e => setForm(p => ({ ...p, home_installation: e.target.checked }))} className="rounded" />
              Home Installation (+Rs.200)
            </label>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!form.owner_name || !form.mobile || !form.registration_number || createMutation.isPending} className="w-full">
            {createMutation.isPending ? "Creating..." : "Create Booking"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail Modal ───────────────────────────────────────────────────────
function HSRPDetailModal({ open, onOpenChange, booking, onUpdate }: any) {
  const [remarks, setRemarks] = useState("");
  const [callStatus, setCallStatus] = useState("");
  const [callRemarks, setCallRemarks] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(booking.payment_status || "pending");
  const [paymentId, setPaymentId] = useState(booking.payment_id || "");
  const [scheduledDate, setScheduledDate] = useState(booking.scheduled_date || "");
  const [trackingId, setTrackingId] = useState(booking.tracking_id || "");

  const currentStage = booking._targetStage || booking.pipeline_stage;
  const stageConfig = STAGES.find(s => s.value === currentStage);

  const handleGenerateReceipt = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();

    doc.setFillColor(16, 185, 129); doc.rect(0, 0, w, 45, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.setFont("helvetica", "bold");
    doc.text("HSRP / FASTag Booking Receipt", w / 2, 20, { align: "center" });
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("GrabYourCar - www.grabyourcar.com", w / 2, 32, { align: "center" });

    let y = 60; const bx = 20; const bw = w - 40;
    doc.setTextColor(60, 60, 60);

    const rows = [
      ["Booking ID", booking.id.slice(0, 12)],
      ["Owner Name", booking.owner_name],
      ["Mobile", booking.mobile],
      ["Registration No", booking.registration_number],
      ["Vehicle Class", booking.vehicle_class],
      ["Service Type", booking.service_type],
      ["State", booking.state],
      ["Amount", `Rs.${(booking.payment_amount || 0).toLocaleString("en-IN")}`],
      ["Payment Status", booking.payment_status],
      ["Scheduled Date", booking.scheduled_date || "TBD"],
      ["Tracking ID", booking.tracking_id || "-"],
    ];

    rows.forEach(([label, value], i) => {
      const ry = y + i * 11;
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(bx, ry - 4, bw, 11, "F"); }
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
      doc.text(label, bx + 6, ry + 3);
      doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text(value, bx + bw - 6, ry + 3, { align: "right" });
    });

    y += rows.length * 11 + 15;
    doc.setFontSize(8); doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${format(new Date(), "dd MMM yyyy")} | GrabYourCar`, bx, y);

    doc.save(`HSRP_Receipt_${booking.registration_number}.pdf`);
    toast.success("Receipt PDF downloaded!");
  };

  const handleShareWhatsApp = async () => {
    const msg = `*HSRP Booking - GrabYourCar*\n\nOwner: ${booking.owner_name}\nVehicle: ${booking.registration_number}\nService: ${booking.service_type}\nAmount: Rs.${(booking.payment_amount || 0).toLocaleString("en-IN")}\nStatus: ${booking.payment_status}\n${booking.scheduled_date ? `Scheduled: ${booking.scheduled_date}` : ""}\n\nwww.grabyourcar.com`;
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    await sendWhatsApp({ phone: booking.mobile || "", message: msg, name: booking.owner_name, logEvent: "hsrp_share" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> {booking.owner_name}
            <Badge className="font-mono text-xs">{booking.registration_number}</Badge>
            <Badge className={stageConfig?.color}>{stageConfig?.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Vehicle & Booking Info */}
        <Card className="border bg-muted/30">
          <CardContent className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div><span className="text-muted-foreground text-xs">Mobile</span>
              <div className="flex items-center gap-2 font-medium">
                {booking.mobile}
                <a href={`tel:${booking.mobile}`} className="text-primary"><Phone className="h-3.5 w-3.5" /></a>
                <a href={`https://wa.me/91${booking.mobile?.replace(/\D/g, "")}`} target="_blank" className="text-emerald-600"><MessageCircle className="h-3.5 w-3.5" /></a>
              </div>
            </div>
            <div><span className="text-muted-foreground text-xs">Email</span><p className="font-medium truncate">{booking.email}</p></div>
            <div><span className="text-muted-foreground text-xs">Service</span><p className="font-medium">{booking.service_type}</p></div>
            <div><span className="text-muted-foreground text-xs">Vehicle Class</span><p className="font-medium">{booking.vehicle_class}</p></div>
            <div><span className="text-muted-foreground text-xs">State</span><p className="font-medium">{booking.state}</p></div>
            <div><span className="text-muted-foreground text-xs">Amount</span><p className="font-bold text-emerald-600">Rs.{(booking.payment_amount || 0).toLocaleString("en-IN")}</p></div>
            {booking.chassis_number && <div><span className="text-muted-foreground text-xs">Chassis</span><p className="font-mono text-xs">{booking.chassis_number}</p></div>}
            {booking.engine_number && <div><span className="text-muted-foreground text-xs">Engine</span><p className="font-mono text-xs">{booking.engine_number}</p></div>}
            {booking.address && <div><span className="text-muted-foreground text-xs">Address</span><p className="text-xs">{booking.address}, {booking.pincode}</p></div>}
          </CardContent>
        </Card>

        <Separator />

        {/* ─── Stage: New Booking ─────────────────── */}
        {currentStage === "new_booking" && (
          <div className="space-y-3 p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> New Booking - Vehicle Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded bg-background border"><p className="text-[10px] text-muted-foreground">Registration</p><p className="font-mono font-bold">{booking.registration_number}</p></div>
              <div className="p-2 rounded bg-background border"><p className="text-[10px] text-muted-foreground">Created</p><p className="text-sm">{booking.created_at ? format(new Date(booking.created_at), "dd MMM yyyy, hh:mm a") : "-"}</p></div>
            </div>
            <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2"
              onClick={() => { onUpdate({ pipeline_stage: "verification" }); toast.success("Moved to Verification"); }}>
              <PhoneCall className="h-4 w-4" /> Move to Verification
            </Button>
          </div>
        )}

        {/* ─── Stage: Verification ───────────────── */}
        {currentStage === "verification" && (
          <div className="space-y-3 p-4 rounded-lg border bg-amber-500/5 border-amber-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><PhoneCall className="h-4 w-4" /> Verification - Smart Calling</h3>
            <div className="flex gap-2">
              <a href={`tel:${booking.mobile}`} className="flex-1">
                <Button variant="outline" className="w-full gap-2"><Phone className="h-4 w-4" /> Dial</Button>
              </a>
              <a href={`https://wa.me/91${booking.mobile?.replace(/\D/g, "").slice(-10)}`} target="_blank" className="flex-1">
                <Button variant="outline" className="w-full gap-2 text-emerald-600"><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
              </a>
            </div>
            <div><Label>Verification Status *</Label>
              <Select value={callStatus} onValueChange={setCallStatus}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{CALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Remarks *</Label>
              <Textarea value={callRemarks} onChange={e => setCallRemarks(e.target.value)} placeholder="Verification notes..." rows={2} />
            </div>
            <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white" onClick={() => {
              if (!callStatus || !callRemarks.trim()) { toast.error("Status and remarks required"); return; }
              onUpdate({ pipeline_stage: callStatus === "Verified" ? "payment" : "verification" });
              toast.success(callStatus === "Verified" ? "Verified! Move to Payment" : "Status updated");
            }}>Save Verification</Button>
          </div>
        )}

        {/* ─── Stage: Payment ────────────────────── */}
        {currentStage === "payment" && (
          <div className="space-y-3 p-4 rounded-lg border bg-violet-500/5 border-violet-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payment Collection</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payment Status</Label>
                <Select value={paymentStatus} onValueChange={v => { setPaymentStatus(v); onUpdate({ payment_status: v }); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Payment ID</Label>
                <Input value={paymentId} onChange={e => setPaymentId(e.target.value)} placeholder="TXN / Razorpay ID"
                  onBlur={() => onUpdate({ payment_id: paymentId })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerateReceipt}>
                <Download className="h-3.5 w-3.5" /> Receipt PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-emerald-600" onClick={handleShareWhatsApp}>
                <Share2 className="h-3.5 w-3.5" /> Share Details
              </Button>
            </div>
            <Button size="sm" className="w-full gap-2" onClick={() => {
              if (paymentStatus !== "paid") { toast.error("Collect payment first"); return; }
              onUpdate({ pipeline_stage: "scheduled" }); toast.success("Moved to Scheduled");
            }}>
              <Calendar className="h-4 w-4" /> Schedule Installation
            </Button>
          </div>
        )}

        {/* ─── Stage: Scheduled ──────────────────── */}
        {currentStage === "scheduled" && (
          <div className="space-y-3 p-4 rounded-lg border bg-indigo-500/5 border-indigo-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Schedule & Track</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Scheduled Date</Label>
                <Input type="date" value={scheduledDate} onChange={e => {
                  setScheduledDate(e.target.value); onUpdate({ scheduled_date: e.target.value });
                }} />
              </div>
              <div><Label>Tracking ID</Label>
                <Input value={trackingId} onChange={e => setTrackingId(e.target.value)} placeholder="HSRP Tracking..."
                  onBlur={() => onUpdate({ tracking_id: trackingId })} />
              </div>
            </div>
            <Button size="sm" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
              if (!scheduledDate) { toast.error("Set scheduled date first"); return; }
              onUpdate({ pipeline_stage: "installation" }); toast.success("Moved to Installation");
            }}>
              <Wrench className="h-4 w-4" /> Start Installation
            </Button>
          </div>
        )}

        {/* ─── Stage: Installation ───────────────── */}
        {currentStage === "installation" && (
          <div className="space-y-3 p-4 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Wrench className="h-4 w-4" /> Installation In Progress</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded bg-background border"><p className="text-[10px] text-muted-foreground">Scheduled</p><p className="font-medium">{booking.scheduled_date || "TBD"}</p></div>
              <div className="p-2 rounded bg-background border"><p className="text-[10px] text-muted-foreground">Tracking</p><p className="font-mono text-xs">{booking.tracking_id || "-"}</p></div>
            </div>
            <Button size="sm" className="w-full gap-2 bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => {
              onUpdate({ pipeline_stage: "completed", completed_at: new Date().toISOString() });
              toast.success("Marked as Completed!");
              onOpenChange(false);
            }}>
              <CheckCircle2 className="h-4 w-4" /> Mark Completed
            </Button>
          </div>
        )}

        {/* ─── Stage: Completed ──────────────────── */}
        {(currentStage === "completed" || booking._targetStage === "completed") && (
          <div className="space-y-3 p-4 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Trophy className="h-4 w-4" /> Completed</h3>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Installation Done</Badge>
            {booking.completed_at && <p className="text-xs text-muted-foreground">Completed on {format(new Date(booking.completed_at), "dd MMM yyyy")}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerateReceipt}>
                <Download className="h-3.5 w-3.5" /> Receipt PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-emerald-600" onClick={handleShareWhatsApp}>
                <Share2 className="h-3.5 w-3.5" /> Share Confirmation
              </Button>
            </div>
          </div>
        )}

        {/* Universal Remarks */}
        <Separator />
        <div className="flex gap-2">
          <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add remark..." rows={2} className="flex-1" />
          <Button size="sm" className="self-end" onClick={() => {
            if (!remarks.trim()) return;
            toast.success("Remark saved");
            setRemarks("");
          }}>Save</Button>
        </div>

        {/* Quick Move */}
        {!booking._targetStage && currentStage !== "completed" && (
          <div className="border-t pt-3">
            <p className="text-[10px] text-muted-foreground mb-2">Quick Move</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.filter(s => s.value !== currentStage).map(s => (
                <Button key={s.value} variant="outline" size="sm" className={`text-[10px] h-7 ${s.color}`}
                  onClick={() => {
                    if (s.value === "completed") {
                      onUpdate({ pipeline_stage: "completed", completed_at: new Date().toISOString() });
                    } else {
                      onUpdate({ pipeline_stage: s.value });
                    }
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
