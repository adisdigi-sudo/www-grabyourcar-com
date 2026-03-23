import { useState, useMemo, useCallback, forwardRef, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import {
  Car, Phone, PhoneCall, MessageCircle, Plus, GripVertical, Clock,
  Users, TrendingUp, CheckCircle2, XCircle, Tag, Send, Search,
  Calendar, Star, FileSpreadsheet, MapPin, CreditCard, FileText,
  AlertTriangle, Download, Upload, Image, Banknote, Trophy,
  ShieldCheck, Camera, Eye, RotateCcw, Gauge, Fuel, UserCheck,
  ClipboardList, PackageCheck, AlertCircle, FolderOpen,
} from "lucide-react";
import jsPDF from "jspdf";
import { LeadImportDialog } from "../shared/LeadImportDialog";
import { StageNotificationBanner } from "../shared/StageNotificationBanner";

// ─── 8-Stage Automotive Dealership Pipeline ────────────────────────────
const STAGES = [
  { value: "website_lead", label: "Website Lead", icon: Eye, color: "bg-sky-500/10 text-sky-600 border-sky-500/20", description: "Captured from website / abandoned carts" },
  { value: "new_inquiry", label: "New Inquiry", icon: Car, color: "bg-blue-500/10 text-blue-600 border-blue-500/20", description: "Fresh inquiry via any channel" },
  { value: "smart_calling", label: "Smart Calling", icon: PhoneCall, color: "bg-amber-500/10 text-amber-600 border-amber-500/20", description: "Contact & qualification calls" },
  { value: "offer_shared", label: "Quotation Sent", icon: Tag, color: "bg-violet-500/10 text-violet-600 border-violet-500/20", description: "Rate card / quote shared" },
  { value: "agreement_kyc", label: "Agreement & KYC", icon: ShieldCheck, color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20", description: "Documents & agreement signed" },
  { value: "booking_payment", label: "Booking & Payment", icon: CreditCard, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", description: "Payment confirmed" },
  { value: "vehicle_handover", label: "Vehicle Handover", icon: PackageCheck, color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", description: "Car delivered to customer" },
  { value: "trip_complete", label: "Trip Complete", icon: Trophy, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", description: "Returned + feedback" },
];

const STAGE_MAP: Record<string, string> = {
  website_lead: "website_lead",
  new_inquiry: "new_inquiry", new: "new_inquiry", pending: "new_inquiry",
  smart_calling: "smart_calling", contacted: "smart_calling",
  offer_shared: "offer_shared", quoted: "offer_shared",
  agreement_kyc: "agreement_kyc",
  partner_escalation: "agreement_kyc", escalated: "agreement_kyc",
  booking_payment: "booking_payment", confirmed: "booking_payment", booked: "booking_payment",
  vehicle_handover: "vehicle_handover",
  trip_complete: "trip_complete", completed: "trip_complete", delivered: "trip_complete",
  lost: "new_inquiry",
};
const normalizeStage = (s: string | null) => STAGE_MAP[s || "new_inquiry"] || "new_inquiry";

const CALL_STATUSES = ["Interested", "Not Interested", "Call Back", "No Answer", "Wrong Number", "Busy", "Follow Up"];
const VEHICLE_TYPES = ["Hatchback", "Sedan", "SUV", "MUV", "Tempo Traveller", "Luxury"];
const PAYMENT_STATUSES = ["Pending", "Partial", "Paid", "Refunded"];
const LOST_REASONS = ["Price too high", "Found cheaper", "Changed plans", "No availability", "Bad reviews", "Competitor booked", "KYC failed", "Other"];
const FUEL_LEVELS = ["Full", "3/4", "1/2", "1/4", "Empty"];
const DOC_TYPES = [
  { key: "dl", label: "Driving License", frontKey: "dl_front_url", backKey: "dl_back_url" },
  { key: "aadhaar", label: "Aadhaar Card", frontKey: "aadhaar_front_url", backKey: "aadhaar_back_url" },
  { key: "address_proof", label: "Address Proof", frontKey: "address_proof_url", backKey: null },
  { key: "selfie", label: "Customer Selfie", frontKey: "selfie_url", backKey: null },
];

export function SelfDriveWorkspace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragging, setDragging] = useState<any>(null);
  const [prevBookingCount, setPrevBookingCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");

  useRealtimeTable('rental_bookings', ['rental-pipeline']);

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

  const { data: vehicles = [] } = useQuery({
    queryKey: ["rental-vehicles"],
    queryFn: async () => {
      const { data } = await supabase.from("rental_vehicles").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: agreements = [] } = useQuery({
    queryKey: ["rental-agreements-all"],
    queryFn: async () => {
      const { data } = await supabase.from("rental_agreements")
        .select("id, booking_id, status, share_token, client_signed_at, agreement_number");
      return data || [];
    },
  });

  // New booking toast
  useEffect(() => {
    if (prevBookingCount === null) { setPrevBookingCount(bookings.length); return; }
    if (bookings.length > prevBookingCount) {
      const newest = bookings[0];
      if (newest) {
        const isAbandoned = newest.is_abandoned;
        toast(isAbandoned
          ? `🔴 Abandoned Cart! ${newest.customer_name || "Unknown"} - ${newest.vehicle_name}`
          : `🆕 New Rental Inquiry! ${newest.customer_name || newest.vehicle_name || ""}`
        );
      }
    }
    setPrevBookingCount(bookings.length);
  }, [bookings.length]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    let result = bookings;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((b: any) =>
        (b.customer_name || "").toLowerCase().includes(q) ||
        (b.phone || "").includes(q) ||
        (b.vehicle_name || "").toLowerCase().includes(q) ||
        (b.assigned_vehicle_number || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [bookings, searchQuery]);

  // KPIs
  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s.value] = filteredBookings.filter((b: any) => b.pipeline_stage === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  const totalBookings = filteredBookings.length;
  const abandonedCount = filteredBookings.filter((b: any) => b.is_abandoned).length;
  const activeTrips = (stageCounts["vehicle_handover"] || 0);
  const completed = stageCounts["trip_complete"] || 0;
  const totalRevenue = filteredBookings
    .filter((b: any) => b.payment_status === "paid")
    .reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
  const pendingKYC = filteredBookings.filter((b: any) => {
    const docs = b.documents_status || {};
    return b.pipeline_stage === "agreement_kyc" && (docs.dl === "pending" || docs.aadhaar === "pending");
  }).length;

  // Notifications
  const notifications = useMemo(() => {
    const items: any[] = [];
    const now = new Date();
    filteredBookings.forEach((b: any) => {
      if (b.is_abandoned && !b.recovery_attempted) {
        items.push({
          id: `abandoned-${b.id}`, type: "urgent",
          title: `🔴 Abandoned: ${b.customer_name || "Unknown"} - ${b.vehicle_name}`,
          subtitle: `Step: ${b.abandoned_step || "Unknown"} • ${formatDistanceToNow(new Date(b.abandoned_at || b.created_at))} ago`,
        });
      }
      if (b.pickup_date) {
        const pickup = new Date(b.pickup_date);
        const hours = differenceInHours(pickup, now);
        if (hours >= 0 && hours <= 48 && !["trip_complete", "vehicle_handover"].includes(b.pipeline_stage)) {
          items.push({
            id: `pickup-${b.id}`, type: hours <= 12 ? "urgent" : "followup",
            title: `${b.vehicle_name} - pickup in ${hours}h`,
            subtitle: `${b.pickup_location} • ${b.customer_name}`,
          });
        }
      }
      if (b.dropoff_date && b.pipeline_stage === "vehicle_handover") {
        const dropoff = new Date(b.dropoff_date);
        const hours = differenceInHours(dropoff, now);
        if (hours >= -6 && hours <= 6) {
          items.push({
            id: `return-${b.id}`, type: "urgent",
            title: `🚗 ${b.vehicle_name} - return ${hours < 0 ? "OVERDUE" : "today"}`,
            subtitle: `${b.dropoff_location} • ${b.customer_name}`,
          });
        }
      }
      // Pending KYC alerts
      const docs = b.documents_status || {};
      if (b.pipeline_stage === "agreement_kyc" && docs.dl === "pending") {
        items.push({
          id: `kyc-${b.id}`, type: "followup",
          title: `📄 KYC pending: ${b.customer_name || b.phone}`,
          subtitle: "DL/Aadhaar not uploaded yet",
        });
      }
    });
    return items;
  }, [filteredBookings]);

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: any) => {
      const statusMap: Record<string, string> = {
        website_lead: "pending", new_inquiry: "pending", smart_calling: "contacted",
        offer_shared: "quoted", agreement_kyc: "documents", booking_payment: "confirmed",
        vehicle_handover: "ongoing", trip_complete: "completed",
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
      if (target === "trip_complete" || target === "vehicle_handover") {
        const b = bookings.find((x: any) => x.id === data.id);
        if (b) { setSelected({ ...b, _targetStage: target }); setShowModal(true); }
        return;
      }
      updateMutation.mutate({ id: data.id, updates: { pipeline_stage: target } });
    } catch {}
    setDragging(null);
  }, [bookings, updateMutation]);

  const formatAmt = (v: number) => v >= 100000 ? `Rs.${(v / 100000).toFixed(1)}L` : `Rs.${v.toLocaleString("en-IN")}`;

  const getAgreementForBooking = (bookingId: string) => agreements.find((a: any) => a.booking_id === bookingId);

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: "Total Leads", value: totalBookings, icon: Users, color: "text-blue-600", bg: "from-blue-500/10" },
          { label: "Abandoned", value: abandonedCount, icon: AlertCircle, color: "text-red-600", bg: "from-red-500/10" },
          { label: "Pending KYC", value: pendingKYC, icon: ShieldCheck, color: "text-cyan-600", bg: "from-cyan-500/10" },
          { label: "Active Trips", value: activeTrips, icon: Car, color: "text-indigo-600", bg: "from-indigo-500/10" },
          { label: "Completed", value: completed, icon: CheckCircle2, color: "text-yellow-600", bg: "from-yellow-500/10" },
          { label: "Revenue", value: formatAmt(totalRevenue), icon: Banknote, color: "text-emerald-600", bg: "from-emerald-500/10" },
        ].map((kpi, i) => (
          <Card key={i} className="border overflow-hidden">
            <CardContent className="p-2.5 relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.bg} to-transparent opacity-50`} />
              <div className="relative flex items-center gap-2">
                <div className={`p-1.5 rounded-lg bg-background/80 ${kpi.color}`}><kpi.icon className="h-3 w-3" /></div>
                <div><p className="text-base font-bold leading-none">{kpi.value}</p><p className="text-[8px] text-muted-foreground mt-0.5">{kpi.label}</p></div>
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
            customer_name: r.name || null,
            phone: r.phone || null,
            notes: `Imported: ${r.name || ""} - ${r.phone || ""}`,
          }));
          const { error } = await supabase.from("rental_bookings").insert(inserts);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ["rental-pipeline"] });
        }}
      />

      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Rental Dealership CRM</h2>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{completed} Completed</Badge>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search name, phone, vehicle..." className="pl-8 h-8 w-48 text-xs"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowImport(true)} className="gap-1.5 h-8">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Import
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 h-8">
            <Plus className="h-3.5 w-3.5" /> New Inquiry
          </Button>
        </div>
      </div>

      {dragging && (
        <div className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg py-1.5 border border-dashed border-primary/30 animate-pulse">
          Drop to move <strong>{dragging.vehicle_name}</strong> — {dragging.customer_name}
        </div>
      )}

      {/* Kanban */}
      <ScrollArea className="w-full">
        <div className="flex gap-2.5 pb-4 min-w-max">
          {STAGES.map(stage => {
            const stageItems = filteredBookings.filter((b: any) => b.pipeline_stage === stage.value);
            const isOver = dragOver === stage.value;
            const showDrop = dragging && isOver;
            const Icon = stage.icon;
            return (
              <div key={stage.value} className="w-[260px] shrink-0 flex flex-col"
                onDragOver={e => { e.preventDefault(); setDragOver(stage.value); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
                onDrop={e => handleDrop(e, stage.value)}>
                <div className={`rounded-lg border p-2 mb-2 transition-all ${stage.color} ${showDrop ? "ring-2 ring-primary scale-[1.02] shadow-lg" : ""}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /><span className="font-semibold text-[11px]">{stage.label}</span></div>
                    <Badge variant="secondary" className="text-[10px] h-5">{stageItems.length}</Badge>
                  </div>
                  <p className="text-[8px] text-muted-foreground/60 mt-0.5">{stage.description}</p>
                </div>
                <div className={`space-y-2 min-h-[100px] flex-1 rounded-lg transition-all p-0.5 ${showDrop ? "bg-primary/5 border-2 border-dashed border-primary/30" : ""}`}>
                  {stageItems.length === 0 && <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground/40 py-6">{showDrop ? "Drop here" : "No items"}</div>}
                  {stageItems.map((b: any) => (
                    <RentalCard key={b.id} booking={b} onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                      onClick={() => { setSelected(b); setShowModal(true); }} isDragging={dragging?.id === b.id}
                      agreement={getAgreementForBooking(b.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <AddRentalDialog open={showAdd} onOpenChange={setShowAdd} vehicles={vehicles} userId={user?.id || ""} />

      {selected && (
        <RentalDetailModal open={showModal} onOpenChange={v => { setShowModal(v); if (!v) setSelected(null); }}
          booking={selected} vehicles={vehicles}
          agreement={getAgreementForBooking(selected.id)}
          onUpdate={(updates: any) => updateMutation.mutate({ id: selected.id, updates })} />
      )}
    </div>
  );
}

// ─── Enhanced Card with Journey + Docs Status ──────────────────────────
const RentalCard = forwardRef<HTMLDivElement, any>(function RentalCard(
  { booking, onDragStart, onDragEnd, onClick, isDragging, agreement }: any,
  ref,
) {
  const customerName = booking.customer_name || booking.notes?.match(/Imported:\s*(.+?)\s*-/)?.[1] || "";
  const customerPhone = booking.phone || booking.notes?.match(/-\s*(\d{10})/)?.[1] || "";
  const isAbandoned = booking.is_abandoned;
  const isPaid = booking.payment_status === "paid";
  const docs = booking.documents_status || {};
  const docsDone = ["dl", "aadhaar", "address_proof", "selfie"].filter(k => docs[k] === "verified").length;
  const docsTotal = 4;
  const hasAgreementSigned = !!agreement?.client_signed_at;
  const kycVerified = booking.kyc_verified;
  const leadAge = booking.created_at ? formatDistanceToNow(new Date(booking.created_at), { addSuffix: false }) : "";

  const handleWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!customerPhone) return;
    const msg = `Hi${customerName ? ` ${customerName}` : ""}, regarding your ${booking.vehicle_name} rental booking. — GrabYourCar`;
    const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
    await sendWhatsApp({ phone: customerPhone, message: msg, name: customerName, logEvent: "rental_update" });
  };

  // Journey breadcrumb
  const journeyStages = ["Lead", "Called", "Quoted", "KYC", "Paid", "Handover", "Done"];
  const stageIndex = { website_lead: 0, new_inquiry: 0, smart_calling: 1, offer_shared: 2, agreement_kyc: 3, booking_payment: 4, vehicle_handover: 5, trip_complete: 6 };
  const currentIdx = stageIndex[booking.pipeline_stage as keyof typeof stageIndex] ?? 0;

  return (
    <Card ref={ref} draggable onDragStart={e => onDragStart(e, booking)} onDragEnd={onDragEnd} onClick={onClick}
      className={`border-border/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${isDragging ? "opacity-30 scale-95" : ""} ${isAbandoned ? "border-red-400/50 bg-red-500/5" : ""}`}>
      <CardContent className="p-2.5 space-y-1.5">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1.5 min-w-0">
            <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0" />
            <span className="font-medium text-xs truncate max-w-[130px]">{booking.vehicle_name}</span>
          </div>
          <div className="flex items-center gap-1">
            {isAbandoned && <Badge className="text-[7px] px-1 py-0 bg-red-500/10 text-red-600">ABANDONED</Badge>}
            <Badge className={`text-[7px] px-1 py-0 ${isPaid ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
              {booking.payment_status}
            </Badge>
          </div>
        </div>

        {/* Customer */}
        {customerName && (
          <div className="text-[10px] font-medium text-foreground/80 flex items-center gap-1">
            <Users className="h-2.5 w-2.5" /> {customerName}
          </div>
        )}
        {customerPhone && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Phone className="h-2.5 w-2.5" />{customerPhone}
            </div>
            <button onClick={handleWhatsApp} className="p-0.5 rounded hover:bg-emerald-500/10 opacity-0 group-hover:opacity-100">
              <MessageCircle className="h-3 w-3 text-emerald-600" />
            </button>
          </div>
        )}

        {/* Vehicle + Dates */}
        {booking.assigned_vehicle_number && (
          <div className="text-[9px] font-mono text-indigo-600 flex items-center gap-1">
            <Car className="h-2.5 w-2.5" /> {booking.assigned_vehicle_number}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Calendar className="h-2.5 w-2.5" />
          {booking.pickup_date ? format(new Date(booking.pickup_date), "dd MMM") : "-"} → {booking.dropoff_date ? format(new Date(booking.dropoff_date), "dd MMM") : "-"}
          <span className="ml-auto text-[9px]">{booking.total_days}d</span>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold">Rs.{(booking.total_amount || 0).toLocaleString("en-IN")}</span>
          <span className="text-[8px] text-muted-foreground">{leadAge} ago</span>
        </div>

        {/* Journey Breadcrumb */}
        <div className="flex items-center gap-0.5 pt-0.5">
          {journeyStages.map((label, i) => (
            <span key={label} className={`text-[6px] px-1 py-0.5 rounded-full font-medium ${
              i < currentIdx ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : i === currentIdx ? "bg-primary/20 text-primary ring-1 ring-primary/30"
              : "bg-muted text-muted-foreground/40"
            }`}>{label}</span>
          ))}
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-1 flex-wrap">
          {hasAgreementSigned && (
            <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
              <FileText className="h-2 w-2" /> Signed
            </span>
          )}
          {kycVerified && (
            <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700 flex items-center gap-0.5">
              <ShieldCheck className="h-2 w-2" /> KYC ✓
            </span>
          )}
          {docsDone > 0 && !kycVerified && (
            <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5">
              <FolderOpen className="h-2 w-2" /> {docsDone}/{docsTotal} Docs
            </span>
          )}
          {booking.source && (
            <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {booking.source}
            </span>
          )}
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

  const SOURCES = ["Website", "WhatsApp", "Walk-in", "Google Ads", "Instagram", "Facebook", "Referral", "JustDial", "Phone Call", "Other"];

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
        status: "pending", payment_status: "pending", pipeline_stage: "new_inquiry",
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
        <DialogHeader><DialogTitle>New Rental Inquiry</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Name *</Label><Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Full name" /></div>
              <div><Label className="text-xs">Phone *</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit mobile" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label className="text-xs">Source</Label>
                <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s.toLowerCase().replace(/\s+/g, "_")}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">DL Number</Label><Input value={form.driver_license_number} onChange={e => setForm(p => ({ ...p, driver_license_number: e.target.value.toUpperCase() }))} placeholder="Driving License No." /></div>
          </div>

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

// ─── Detail Modal with Tabs ────────────────────────────────────────────
function RentalDetailModal({ open, onOpenChange, booking, vehicles, agreement, onUpdate }: any) {
  const [remarks, setRemarks] = useState("");
  const [callStatus, setCallStatus] = useState("");
  const [callRemarks, setCallRemarks] = useState("");
  const [paymentStatus, setPaymentStatus] = useState(booking.payment_status || "pending");
  const [paymentId, setPaymentId] = useState(booking.payment_id || "");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [activeTab, setActiveTab] = useState("pipeline");
  const [vehicleNumber, setVehicleNumber] = useState(booking.assigned_vehicle_number || "");
  const [vehicleColor, setVehicleColor] = useState(booking.assigned_vehicle_color || "");
  const [odometerStart, setOdometerStart] = useState(booking.odometer_start?.toString() || "");
  const [odometerEnd, setOdometerEnd] = useState(booking.odometer_end?.toString() || "");
  const [fuelStart, setFuelStart] = useState(booking.fuel_level_start || "");
  const [fuelEnd, setFuelEnd] = useState(booking.fuel_level_end || "");
  const [lostReason, setLostReason] = useState("");

  const currentStage = booking._targetStage || booking.pipeline_stage;
  const stageConfig = STAGES.find(s => s.value === currentStage);
  const docs = booking.documents_status || {};

  const handleGenerateAgreement = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const mx = 18;
    const cw = w - mx * 2;
    const customerName = booking.customer_name || "___________________";
    const customerPhone = booking.phone || "___________________";
    const today = format(new Date(), "dd MMMM yyyy");

    doc.setFillColor(15, 23, 42); doc.rect(0, 0, w, 48, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("SELF-DRIVE CAR RENTAL AGREEMENT", w / 2, 16, { align: "center" });
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text("GrabYourCar Pvt. Ltd. | www.grabyourcar.com", w / 2, 24, { align: "center" });
    doc.text(`Date: ${today} | Ref: GYC-${booking.id.slice(0, 8).toUpperCase()}`, w / 2, 32, { align: "center" });

    let y = 56;
    doc.setTextColor(0, 0, 0); doc.setFontSize(10);
    const addRow = (l: string, v: string) => {
      doc.setFont("helvetica", "normal"); doc.text(l, mx, y);
      doc.setFont("helvetica", "bold"); doc.text(v, w - mx, y, { align: "right" }); y += 6;
    };
    addRow("Customer", customerName);
    addRow("Phone", customerPhone);
    addRow("Vehicle", `${booking.vehicle_name} (${booking.vehicle_type})`);
    if (vehicleNumber) addRow("Vehicle No.", vehicleNumber);
    addRow("Pickup", `${booking.pickup_date || "-"} at ${booking.pickup_time || "-"}`);
    addRow("Location", booking.pickup_location || "-");
    addRow("Drop-off", `${booking.dropoff_date || "-"} at ${booking.dropoff_time || "-"}`);
    addRow("Duration", `${booking.total_days || 1} day(s)`);
    addRow("Amount", `Rs. ${(booking.total_amount || 0).toLocaleString("en-IN")}`);
    addRow("Deposit", `Rs. ${(booking.security_deposit || 5000).toLocaleString("en-IN")}`);
    addRow("DL No.", booking.driver_license_number || "To be provided");

    y += 8;
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    const terms = [
      "1. Customer must be 21+ with valid DL and government photo ID.",
      "2. Vehicle for lawful personal use only. No racing, sub-renting, or illegal activities.",
      "3. 250 KM/day included. Excess at Rs.12-15/KM based on vehicle type.",
      "4. Return with same fuel level. Shortfall charged at Rs.150/litre.",
      "5. Late return beyond 2 hrs grace: additional day charge.",
      "6. Customer liable for damage not covered by insurance (max Rs.15,000 excess).",
      "7. Security deposit refunded within 7 days post inspection.",
      "8. Smoking/pet penalties apply. Vehicle tracked via GPS.",
      "9. FIR + Company notification required for any accident.",
      "10. Company may terminate for violations; customer liable for all costs.",
    ];
    terms.forEach(t => { doc.text(t, mx, y, { maxWidth: cw }); y += 5; });

    y += 10;
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Customer Signature: _______________", mx, y);
    doc.text("For GrabYourCar: _______________", w / 2, y);

    doc.save(`Rental_Agreement_${booking.id.slice(0, 8)}.pdf`);
    toast.success("Agreement PDF downloaded");
  };

  const handleShareWhatsApp = async () => {
    const msg = `*Self-Drive Rental - GrabYourCar*\n\nVehicle: ${booking.vehicle_name}\nPickup: ${booking.pickup_date} at ${booking.pickup_time}\nLocation: ${booking.pickup_location}\nDrop-off: ${booking.dropoff_date}\nTotal: Rs.${(booking.total_amount || 0).toLocaleString("en-IN")}\n\nwww.grabyourcar.com`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleMarkLost = () => {
    if (!lostReason) { toast.error("Select a reason"); return; }
    onUpdate({ pipeline_stage: "new_inquiry", lost_reason: lostReason, notes: `[LOST: ${lostReason}] ${remarks}\n${booking.notes || ""}` });
    toast.success("Marked as lost");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Car className="h-5 w-5" /> {booking.vehicle_name}
            <Badge className={stageConfig?.color}>{stageConfig?.label}</Badge>
            {booking.is_abandoned && <Badge variant="destructive" className="text-[10px]">ABANDONED</Badge>}
            {booking.source && <Badge variant="outline" className="text-[10px]">{booking.source}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {/* Customer & Booking Summary */}
        <Card className="border bg-muted/30">
          <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground text-[10px]">Customer</span>
              <p className="font-medium text-xs">{booking.customer_name || "-"}</p>
              <p className="text-[10px] text-muted-foreground">{booking.phone}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px]">Pickup</span>
              <p className="font-medium text-xs">{booking.pickup_date ? format(new Date(booking.pickup_date), "dd MMM yyyy") : "-"} {booking.pickup_time}</p>
              <p className="text-[10px] text-muted-foreground">{booking.pickup_location}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px]">Drop-off</span>
              <p className="font-medium text-xs">{booking.dropoff_date ? format(new Date(booking.dropoff_date), "dd MMM yyyy") : "-"} {booking.dropoff_time}</p>
              <p className="text-[10px] text-muted-foreground">{booking.dropoff_location}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px]">Amount</span>
              <p className="font-bold text-emerald-600">Rs.{(booking.total_amount || 0).toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-muted-foreground">{booking.total_days}d × Rs.{(booking.daily_rate || 0).toLocaleString("en-IN")}/d</p>
            </div>
          </CardContent>
        </Card>

        {/* Website Journey Info */}
        {(booking.utm_source || booking.page_referrer || booking.website_journey) && (
          <Card className="border bg-sky-500/5 border-sky-500/20">
            <CardContent className="p-2.5">
              <h4 className="text-[10px] font-semibold text-sky-700 uppercase mb-1">Website Journey Data</h4>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                {booking.utm_source && <div><span className="text-muted-foreground">UTM Source:</span> <span className="font-medium">{booking.utm_source}</span></div>}
                {booking.utm_medium && <div><span className="text-muted-foreground">UTM Medium:</span> <span className="font-medium">{booking.utm_medium}</span></div>}
                {booking.utm_campaign && <div><span className="text-muted-foreground">Campaign:</span> <span className="font-medium">{booking.utm_campaign}</span></div>}
                {booking.page_referrer && <div className="col-span-3"><span className="text-muted-foreground">Referrer:</span> <span className="font-medium">{booking.page_referrer}</span></div>}
                {booking.session_duration_seconds && <div><span className="text-muted-foreground">Session:</span> <span className="font-medium">{Math.round(booking.session_duration_seconds / 60)}m</span></div>}
                {booking.abandoned_step && <div><span className="text-muted-foreground">Abandoned at:</span> <span className="font-medium text-red-600">{booking.abandoned_step}</span></div>}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 h-8">
            <TabsTrigger value="pipeline" className="text-[10px] gap-1"><ClipboardList className="h-3 w-3" /> Pipeline</TabsTrigger>
            <TabsTrigger value="documents" className="text-[10px] gap-1"><FolderOpen className="h-3 w-3" /> Documents</TabsTrigger>
            <TabsTrigger value="handover" className="text-[10px] gap-1"><PackageCheck className="h-3 w-3" /> Handover</TabsTrigger>
            <TabsTrigger value="history" className="text-[10px] gap-1"><Clock className="h-3 w-3" /> History</TabsTrigger>
          </TabsList>

          {/* ═══ PIPELINE TAB ═══ */}
          <TabsContent value="pipeline" className="space-y-3 mt-3">
            {/* Abandoned Recovery */}
            {booking.is_abandoned && !booking.recovery_attempted && (
              <div className="p-3 rounded-lg border bg-red-500/5 border-red-500/20 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-red-700"><RotateCcw className="h-4 w-4" /> Abandoned Cart Recovery</h3>
                <p className="text-xs text-muted-foreground">Customer abandoned at: <strong>{booking.abandoned_step || "Unknown step"}</strong></p>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white" onClick={async () => {
                    if (booking.phone) {
                      const msg = `Hi ${booking.customer_name || ""},\n\nWe noticed you were looking at our ${booking.vehicle_name} rental. Complete your booking now and get a special discount!\n\n🚗 Book now: ${window.location.origin}/self-drive\n\n— GrabYourCar`;
                      window.open(`https://wa.me/91${booking.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(msg)}`, "_blank");
                    }
                    onUpdate({ recovery_attempted: true, recovery_attempted_at: new Date().toISOString() });
                  }}>
                    <MessageCircle className="h-3.5 w-3.5" /> Send Recovery WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    onUpdate({ is_abandoned: false, pipeline_stage: "new_inquiry" });
                  }}>Convert to Active Lead</Button>
                </div>
              </div>
            )}

            {/* Smart Calling */}
            {currentStage === "smart_calling" && (
              <div className="space-y-3 p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
                <h3 className="font-semibold text-sm flex items-center gap-2"><PhoneCall className="h-4 w-4" /> Smart Calling</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Call Status *</Label>
                    <Select value={callStatus} onValueChange={setCallStatus}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{CALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Call Attempts</Label>
                    <p className="text-sm font-bold mt-1">{(booking.call_attempts || 0) + 1}</p>
                  </div>
                </div>
                <div><Label className="text-xs">Call Remarks *</Label>
                  <Textarea value={callRemarks} onChange={e => setCallRemarks(e.target.value)} placeholder="Discussion notes..." rows={2} />
                </div>
                <Button className="w-full" onClick={() => {
                  if (!callStatus || !callRemarks.trim()) { toast.error("Status and remarks are mandatory"); return; }
                  const notes = `[Call ${(booking.call_attempts || 0) + 1}: ${callStatus}] ${callRemarks}\n${booking.notes || ""}`;
                  const next = callStatus === "Interested" ? "offer_shared" : booking.pipeline_stage;
                  onUpdate({ pipeline_stage: next, call_status: callStatus, call_remarks: callRemarks, call_attempts: (booking.call_attempts || 0) + 1, notes });
                  toast.success("Call logged");
                }}>Save Call Log</Button>
              </div>
            )}

            {/* Offer/Quote Shared */}
            {currentStage === "offer_shared" && (
              <div className="space-y-3 p-3 rounded-lg border bg-violet-500/5 border-violet-500/20">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Tag className="h-4 w-4" /> Quotation & Agreement</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerateAgreement}>
                    <Download className="h-3.5 w-3.5" /> Download Agreement
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-emerald-600" onClick={handleShareWhatsApp}>
                    <MessageCircle className="h-3.5 w-3.5" /> Share on WhatsApp
                  </Button>
                </div>
                <Button size="sm" className="w-full gap-2" onClick={() => {
                  onUpdate({ pipeline_stage: "agreement_kyc" });
                  toast.success("Moved to Agreement & KYC");
                }}><ShieldCheck className="h-4 w-4" /> Proceed to Agreement & KYC</Button>
              </div>
            )}

            {/* Agreement & KYC */}
            {currentStage === "agreement_kyc" && (
              <div className="space-y-3 p-3 rounded-lg border bg-cyan-500/5 border-cyan-500/20">
                <h3 className="font-semibold text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Agreement & KYC Verification</h3>
                {agreement ? (
                  <div className={`rounded-lg p-2.5 text-sm flex items-center justify-between ${
                    agreement.client_signed_at ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"
                  }`}>
                    <div className="flex items-center gap-2">
                      {agreement.client_signed_at ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-amber-600" />}
                      <div>
                        <span className="font-medium text-xs">{agreement.client_signed_at ? "Agreement Signed ✓" : "Agreement Pending"}</span>
                        <p className="text-[10px] text-muted-foreground">{agreement.agreement_number}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No agreement linked. Generate and send one.</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {DOC_TYPES.map(dt => (
                    <div key={dt.key} className={`rounded-lg border p-2 text-xs ${
                      docs[dt.key] === "verified" ? "bg-emerald-50 border-emerald-200" :
                      docs[dt.key] === "uploaded" ? "bg-blue-50 border-blue-200" :
                      "bg-muted/50 border-border"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{dt.label}</span>
                        <Badge className={`text-[8px] ${
                          docs[dt.key] === "verified" ? "bg-emerald-500/10 text-emerald-600" :
                          docs[dt.key] === "uploaded" ? "bg-blue-500/10 text-blue-600" :
                          "bg-amber-500/10 text-amber-600"
                        }`}>{docs[dt.key] || "pending"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Button size="sm" className="w-full gap-2" disabled={!agreement?.client_signed_at}
                  onClick={() => {
                    onUpdate({ pipeline_stage: "booking_payment" });
                    toast.success("Moved to Booking & Payment");
                  }}>
                  <CreditCard className="h-4 w-4" /> Proceed to Payment
                </Button>
                {!agreement?.client_signed_at && (
                  <p className="text-[10px] text-destructive text-center">⚠ Agreement must be signed before proceeding</p>
                )}
              </div>
            )}

            {/* Booking & Payment */}
            {currentStage === "booking_payment" && (
              <div className="space-y-3 p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
                <h3 className="font-semibold text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" /> Booking & Payment</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Payment Status</Label>
                    <Select value={paymentStatus} onValueChange={v => { setPaymentStatus(v); onUpdate({ payment_status: v }); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_STATUSES.map(s => <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Payment Ref / TXN ID</Label>
                    <Input value={paymentId} onChange={e => setPaymentId(e.target.value)} onBlur={() => onUpdate({ payment_id: paymentId })} placeholder="TXN ID..." />
                  </div>
                </div>
                <Button size="sm" className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
                  if (paymentStatus !== "paid") { toast.error("Complete payment first"); return; }
                  onUpdate({ pipeline_stage: "vehicle_handover" });
                  toast.success("Moved to Vehicle Handover");
                }}><PackageCheck className="h-4 w-4" /> Prepare Vehicle Handover</Button>
              </div>
            )}

            {/* Vehicle Handover */}
            {(currentStage === "vehicle_handover" || booking._targetStage === "vehicle_handover") && (
              <div className="space-y-3 p-3 rounded-lg border bg-indigo-500/5 border-indigo-500/20">
                <h3 className="font-semibold text-sm flex items-center gap-2"><PackageCheck className="h-4 w-4" /> Vehicle Handover</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Vehicle Reg No. *</Label>
                    <Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value.toUpperCase())} placeholder="DL XX AB 1234" />
                  </div>
                  <div><Label className="text-xs">Vehicle Color</Label>
                    <Input value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} placeholder="White, Red..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Odometer Start (KM)</Label>
                    <Input type="number" value={odometerStart} onChange={e => setOdometerStart(e.target.value)} placeholder="e.g. 45230" />
                  </div>
                  <div><Label className="text-xs">Fuel Level</Label>
                    <Select value={fuelStart} onValueChange={setFuelStart}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{FUEL_LEVELS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Button size="sm" className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => {
                  if (!vehicleNumber) { toast.error("Vehicle number required"); return; }
                  onUpdate({
                    pipeline_stage: "vehicle_handover",
                    assigned_vehicle_number: vehicleNumber,
                    assigned_vehicle_color: vehicleColor,
                    odometer_start: Number(odometerStart) || null,
                    fuel_level_start: fuelStart,
                    handover_at: new Date().toISOString(),
                    notes: `[HANDOVER] Vehicle: ${vehicleNumber}, Color: ${vehicleColor}, ODO: ${odometerStart}, Fuel: ${fuelStart}\n${booking.notes || ""}`,
                  });
                  toast.success("Vehicle handed over");
                }}><Car className="h-4 w-4" /> Confirm Handover</Button>
              </div>
            )}

            {/* Trip Complete */}
            {(currentStage === "trip_complete" || booking._targetStage === "trip_complete") && (
              <div className="space-y-3 p-3 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Trophy className="h-4 w-4" /> Trip Complete — Return & Feedback</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Odometer End (KM)</Label>
                    <Input type="number" value={odometerEnd} onChange={e => setOdometerEnd(e.target.value)} placeholder="e.g. 45730" />
                  </div>
                  <div><Label className="text-xs">Fuel Level Return</Label>
                    <Select value={fuelEnd} onValueChange={setFuelEnd}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{FUEL_LEVELS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {odometerStart && odometerEnd && (
                  <div className="text-xs bg-muted/50 rounded-lg p-2">
                    <span className="text-muted-foreground">Total KM driven:</span>{" "}
                    <span className="font-bold">{Number(odometerEnd) - Number(odometerStart || booking.odometer_start || 0)} KM</span>
                    {Number(odometerEnd) - Number(odometerStart || booking.odometer_start || 0) > (booking.total_days || 1) * 250 && (
                      <span className="text-red-600 ml-2">⚠ Excess KM!</span>
                    )}
                  </div>
                )}
                <div>
                  <Label className="text-xs">Rating (1-5) *</Label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setFeedbackRating(n)}
                        className={`p-1.5 rounded-lg transition-all ${feedbackRating >= n ? "text-yellow-500 bg-yellow-500/10" : "text-muted-foreground/30"}`}>
                        <Star className="h-5 w-5" fill={feedbackRating >= n ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>
                <div><Label className="text-xs">Feedback</Label>
                  <Textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Trip experience..." rows={2} />
                </div>
                <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white gap-2" onClick={() => {
                  const notes = `[TRIP COMPLETE] Rating: ${feedbackRating}/5 - ${feedbackText}. ODO: ${odometerEnd}, Fuel: ${fuelEnd}\n${booking.notes || ""}`;
                  onUpdate({
                    pipeline_stage: "trip_complete",
                    odometer_end: Number(odometerEnd) || null,
                    fuel_level_end: fuelEnd,
                    feedback_rating: feedbackRating,
                    feedback_text: feedbackText,
                    returned_at: new Date().toISOString(),
                    notes,
                  });
                  toast.success("Trip marked complete!");
                  onOpenChange(false);
                }}><Trophy className="h-4 w-4" /> Mark Complete</Button>
              </div>
            )}

            {/* Quick move + Lost */}
            {!booking._targetStage && !["trip_complete"].includes(currentStage) && (
              <div className="space-y-3">
                <div className="border-t pt-3">
                  <p className="text-[10px] text-muted-foreground mb-2">Quick Move</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STAGES.filter(s => s.value !== currentStage).map(s => (
                      <Button key={s.value} variant="outline" size="sm" className={`text-[10px] h-7 ${s.color}`}
                        onClick={() => {
                          if (["trip_complete", "vehicle_handover"].includes(s.value)) {
                            // Stay in modal, just update target stage
                            return;
                          }
                          onUpdate({ pipeline_stage: s.value });
                          toast.success(`Moved to ${s.label}`);
                        }}>{s.label}</Button>
                    ))}
                  </div>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <p className="text-[10px] text-destructive font-medium">Mark as Lost</p>
                  <div className="flex gap-2">
                    <Select value={lostReason} onValueChange={setLostReason}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Select reason..." /></SelectTrigger>
                      <SelectContent>{LOST_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={handleMarkLost}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Lost
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══ DOCUMENTS TAB ═══ */}
          <TabsContent value="documents" className="space-y-3 mt-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><FolderOpen className="h-4 w-4" /> Customer Documents</h3>
            <div className="grid grid-cols-2 gap-3">
              {DOC_TYPES.map(dt => (
                <Card key={dt.key} className={`border ${
                  docs[dt.key] === "verified" ? "border-emerald-300 bg-emerald-50/50" :
                  docs[dt.key] === "uploaded" ? "border-blue-300 bg-blue-50/50" : ""
                }`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{dt.label}</span>
                      <Badge className={`text-[8px] ${
                        docs[dt.key] === "verified" ? "bg-emerald-500/10 text-emerald-600" :
                        docs[dt.key] === "uploaded" ? "bg-blue-500/10 text-blue-600" :
                        "bg-amber-500/10 text-amber-600"
                      }`}>{docs[dt.key] || "pending"}</Badge>
                    </div>
                    {booking[dt.frontKey] && (
                      <div className="text-[10px] text-blue-600 underline cursor-pointer" onClick={() => window.open(booking[dt.frontKey], "_blank")}>
                        View Front
                      </div>
                    )}
                    {dt.backKey && booking[dt.backKey] && (
                      <div className="text-[10px] text-blue-600 underline cursor-pointer" onClick={() => window.open(booking[dt.backKey], "_blank")}>
                        View Back
                      </div>
                    )}
                    <div className="flex gap-1">
                      {docs[dt.key] !== "verified" && (
                        <Button size="sm" variant="outline" className="text-[9px] h-6 gap-1" onClick={() => {
                          const updatedDocs = { ...docs, [dt.key]: "verified" };
                          onUpdate({ documents_status: updatedDocs });
                          toast.success(`${dt.label} verified`);
                        }}><CheckCircle2 className="h-2.5 w-2.5" /> Verify</Button>
                      )}
                      {docs[dt.key] === "verified" && (
                        <span className="text-[9px] text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Verified</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {booking.driver_license_number && (
              <Card className="border">
                <CardContent className="p-3">
                  <span className="text-xs text-muted-foreground">DL Number:</span>
                  <p className="font-mono font-bold text-sm">{booking.driver_license_number}</p>
                </CardContent>
              </Card>
            )}
            <Button size="sm" className="w-full" onClick={() => {
              const allVerified = DOC_TYPES.every(dt => docs[dt.key] === "verified");
              if (!allVerified) { toast.error("Verify all documents first"); return; }
              onUpdate({ kyc_verified: true, kyc_verified_at: new Date().toISOString() });
              toast.success("KYC fully verified ✓");
            }}>
              <UserCheck className="h-4 w-4 mr-2" /> Mark KYC Complete
            </Button>
          </TabsContent>

          {/* ═══ HANDOVER TAB ═══ */}
          <TabsContent value="handover" className="space-y-3 mt-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><PackageCheck className="h-4 w-4" /> Vehicle Handover & Return</h3>
            <div className="grid grid-cols-2 gap-3">
              <Card className="border">
                <CardContent className="p-3">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Handover Details</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Vehicle No:</span><span className="font-medium">{booking.assigned_vehicle_number || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Color:</span><span className="font-medium">{booking.assigned_vehicle_color || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Odometer:</span><span className="font-medium">{booking.odometer_start ? `${booking.odometer_start} KM` : "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Fuel:</span><span className="font-medium">{booking.fuel_level_start || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Handed at:</span><span className="font-medium">{booking.handover_at ? format(new Date(booking.handover_at), "dd MMM HH:mm") : "-"}</span></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-3">
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Return Details</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Odometer:</span><span className="font-medium">{booking.odometer_end ? `${booking.odometer_end} KM` : "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Fuel:</span><span className="font-medium">{booking.fuel_level_end || "-"}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Returned:</span><span className="font-medium">{booking.returned_at ? format(new Date(booking.returned_at), "dd MMM HH:mm") : "-"}</span></div>
                    {booking.odometer_start && booking.odometer_end && (
                      <div className="flex justify-between font-bold"><span>Total KM:</span><span>{booking.odometer_end - booking.odometer_start} KM</span></div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Settlement */}
            <Card className="border bg-muted/30">
              <CardContent className="p-3 space-y-2">
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase">Settlement</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Deposit:</span><p className="font-bold">Rs.{(booking.security_deposit || 0).toLocaleString("en-IN")}</p></div>
                  <div><span className="text-muted-foreground">Extra KM:</span><p className="font-bold text-red-600">Rs.{(booking.extra_km_charges || 0).toLocaleString("en-IN")}</p></div>
                  <div><span className="text-muted-foreground">Damage:</span><p className="font-bold text-red-600">Rs.{(booking.damage_charges || 0).toLocaleString("en-IN")}</p></div>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-xs font-medium">Refund Status:</span>
                  <Badge className={`text-[9px] ${booking.deposit_refund_status === "refunded" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                    {booking.deposit_refund_status || "pending"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ HISTORY TAB ═══ */}
          <TabsContent value="history" className="space-y-3 mt-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Activity & Notes History</h3>
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
            {booking.notes && (
              <ScrollArea className="max-h-60">
                <pre className="text-xs whitespace-pre-wrap text-muted-foreground bg-muted/30 rounded p-3">{booking.notes}</pre>
              </ScrollArea>
            )}
            {!booking.notes && <p className="text-xs text-muted-foreground text-center py-6">No activity yet</p>}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
