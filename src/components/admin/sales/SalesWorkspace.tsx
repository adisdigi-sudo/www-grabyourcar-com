import { useState, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInHours, differenceInDays } from "date-fns";
import {
  UserPlus, PhoneCall, Car, Send, FileText, Star, CheckCircle2, XCircle,
  Phone, MessageSquare, Plus, Search, GripVertical, Clock, AlertTriangle,
  Upload, Image, Video, ArrowRight, Banknote, Users, TrendingUp, X,
  ChevronDown, Calendar, Trophy, BarChart3, FileSpreadsheet,
} from "lucide-react";
import { LeadImportDialog } from "../shared/LeadImportDialog";
import { StageNotificationBanner } from "../shared/StageNotificationBanner";

// ─── Pipeline Stage Config ──────────────────────────────────────────────
const PIPELINE_STAGES = [
  { value: "new_lead", label: "New Lead", icon: UserPlus, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { value: "smart_calling", label: "Smart Calling", icon: PhoneCall, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "interested", label: "Interested", icon: Car, color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  { value: "offer_shared", label: "Offer Shared", icon: Send, color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  { value: "booking", label: "Booking", icon: FileText, color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  { value: "lost", label: "Lost", icon: XCircle, color: "bg-red-500/10 text-red-600 border-red-500/20" },
  { value: "delivery", label: "Delivery", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { value: "after_sales", label: "After Sales", icon: Star, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
];

const SOURCES = ["Meta", "Google Ads", "Referral", "Walk-in", "WhatsApp", "Website", "Admin Routed", "Manual"];
const CALL_STATUSES = ["Interested", "Not Interested", "Call Back", "No Answer", "Wrong Number", "Busy"];
const BUYING_INTENTS = ["Immediate (This Week)", "Within 15 Days", "Within 1 Month", "Exploring Options", "Not Sure"];
const LOST_REASONS = ["Budget constraints", "Bought elsewhere", "Not interested anymore", "Better offer", "Loan rejected", "Changed mind", "Other"];
const BOOKING_STATUSES = ["Car Loan Proceeding", "Booked", "Going to Book", "Discussion Ongoing", "Waiting for Approval"];

const STAGE_MAP: Record<string, string> = {
  new_lead: "new_lead", new: "new_lead", contacted: "smart_calling",
  smart_calling: "smart_calling", interested: "interested", qualified: "interested",
  offer_shared: "offer_shared", quoted: "offer_shared", booking: "booking",
  booked: "booking", lost: "lost", delivery: "delivery", delivered: "delivery",
  after_sales: "after_sales", converted: "after_sales",
};
const normalizeStage = (s: string | null) => STAGE_MAP[s || "new_lead"] || "new_lead";

// ─── Main Component ─────────────────────────────────────────────────────
export function SalesWorkspace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeStage, setActiveStage] = useState("new_lead");
  const [search, setSearch] = useState("");
  const [showAddLead, setShowAddLead] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  // Fetch all pipeline data
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["sales-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales_pipeline")
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((l: any) => ({ ...l, pipeline_stage: normalizeStage(l.pipeline_stage) }));
    },
  });

  // Activity log query
  const { data: activities = [] } = useQuery({
    queryKey: ["sales-activity", selectedLead?.id],
    enabled: !!selectedLead,
    queryFn: async () => {
      const { data } = await supabase.from("sales_activity_log")
        .select("*").eq("pipeline_id", selectedLead.id).order("created_at", { ascending: false });
      return data || [];
    },
  });

  // KPI calculations
  const stageCounts = PIPELINE_STAGES.reduce((acc, s) => {
    acc[s.value] = leads.filter((l: any) => l.pipeline_stage === s.value).length;
    return acc;
  }, {} as Record<string, number>);

  const totalLeads = leads.length;
  const won = stageCounts["after_sales"] || 0;
  const lostCount = stageCounts["lost"] || 0;
  const conversion = totalLeads > 0 ? ((won / totalLeads) * 100).toFixed(1) : "0";

  // Build notifications
  const salesNotifications = useMemo(() => {
    const items: any[] = [];
    const now = new Date();
    leads.forEach((l: any) => {
      if (l.follow_up_date) {
        const fuDate = new Date(l.follow_up_date);
        const hours = differenceInHours(fuDate, now);
        if (hours <= 24 && hours >= -48) {
          items.push({
            id: `followup-${l.id}`,
            type: hours < 0 ? "overdue" : "followup",
            title: `${l.customer_name || "Lead"} - follow-up ${hours < 0 ? "overdue" : "today"}`,
            subtitle: l.follow_up_time ? `at ${l.follow_up_time}` : l.phone,
          });
        }
      }
      if (l.last_activity_at) {
        const hours = differenceInHours(now, new Date(l.last_activity_at));
        if (hours > 48 && !["after_sales", "lost"].includes(l.pipeline_stage)) {
          items.push({
            id: `stale-${l.id}`,
            type: "followup",
            title: `${l.customer_name || "Lead"} - no activity ${Math.floor(hours / 24)}d`,
            subtitle: l.phone,
          });
        }
      }
      if (l.pipeline_stage === "booking" && l.last_activity_at) {
        const days = differenceInDays(now, new Date(l.last_activity_at));
        if (days > 3) {
          items.push({
            id: `booking-stale-${l.id}`,
            type: "urgent",
            title: `${l.customer_name} - booking pending ${days}d`,
            subtitle: l.car_brand ? `${l.car_brand} ${l.car_model}` : l.phone,
          });
        }
      }
    });
    return items.sort((a: any, b: any) => {
      const priority: Record<string, number> = { overdue: 0, urgent: 1, followup: 2, renewal: 3 };
      return (priority[a.type] || 3) - (priority[b.type] || 3);
    });
  }, [leads]);

  // Filter leads for active stage
  const stageLeads = leads.filter((l: any) =>
    l.pipeline_stage === activeStage &&
    (!search || l.customer_name?.toLowerCase().includes(search.toLowerCase()) || l.phone?.includes(search))
  );

  // ─── Mutations ──────────────────────────────────────────────────────
  const addLeadMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("sales_pipeline").insert({
        ...data,
        pipeline_stage: "new_lead",
        client_id: `SC-${Date.now().toString(36).toUpperCase()}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-pipeline"] });
      toast.success("Lead added successfully");
      setShowAddLead(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, updates, logAction, logRemarks }: any) => {
      const { error } = await supabase.from("sales_pipeline")
        .update({ ...updates, updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (logAction) {
        await supabase.from("sales_activity_log").insert({
          pipeline_id: id,
          action: logAction,
          remarks: logRemarks || null,
          performed_by: user?.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["sales-activity"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Drag & Drop ───────────────────────────────────────────────────
  const handleDragStart = (id: string) => setDragId(id);

  const handleDrop = (targetStage: string) => {
    if (!dragId) return;
    const lead = leads.find((l: any) => l.id === dragId);
    if (!lead || lead.pipeline_stage === targetStage) { setDragId(null); return; }

    // Lost requires remarks - open modal instead
    if (targetStage === "lost") {
      setSelectedLead({ ...lead, _pendingStage: "lost" });
      setDragId(null);
      return;
    }
    // After Sales requires feedback
    if (targetStage === "after_sales") {
      setSelectedLead({ ...lead, _pendingStage: "after_sales" });
      setDragId(null);
      return;
    }

    updateLeadMutation.mutate({
      id: dragId,
      updates: { pipeline_stage: targetStage },
      logAction: "stage_change",
      logRemarks: `Moved from ${lead.pipeline_stage} to ${targetStage}`,
    });
    toast.success(`Moved to ${PIPELINE_STAGES.find(s => s.value === targetStage)?.label}`);
    setDragId(null);
  };

  return (
    <div className="space-y-4">
      {/* KPI Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Leads", value: totalLeads, icon: Users, color: "text-blue-600" },
          { label: "In Pipeline", value: totalLeads - won - lostCount, icon: TrendingUp, color: "text-cyan-600" },
          { label: "Won / Delivered", value: won, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Lost", value: lostCount, icon: XCircle, color: "text-red-600" },
          { label: "Conversion", value: `${conversion}%`, icon: BarChart3, color: "text-violet-600" },
        ].map(kpi => (
          <Card key={kpi.label} className="border">
            <CardContent className="p-3 flex items-center gap-3">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-bold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stage Tabs */}
      <div className="flex items-center gap-2">
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg min-w-max">
            {PIPELINE_STAGES.map(stage => {
              const Icon = stage.icon;
              const count = stageCounts[stage.value] || 0;
              return (
                <Button
                  key={stage.value}
                  variant={activeStage === stage.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveStage(stage.value)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(stage.value)}
                  className="gap-1.5 text-xs h-8 shrink-0"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {stage.label}
                  {count > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">{count}</Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
        <Button size="sm" onClick={() => setShowAddLead(true)} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" /> Add Lead
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9" />
      </div>

      {/* Lead Cards */}
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : stageLeads.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground">
            No leads in this stage
          </CardContent></Card>
        ) : (
          stageLeads.map((lead: any) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onSelect={() => setSelectedLead(lead)}
              onDragStart={() => handleDragStart(lead.id)}
            />
          ))
        )}
      </div>

      {/* Add Lead Modal */}
      <AddLeadModal open={showAddLead} onOpenChange={setShowAddLead} onSubmit={(d: any) => addLeadMutation.mutate(d)} isPending={addLeadMutation.isPending} />

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          activities={activities}
          onClose={() => setSelectedLead(null)}
          onUpdate={(updates: any, logAction?: string, logRemarks?: string) => {
            updateLeadMutation.mutate({ id: selectedLead.id, updates, logAction, logRemarks });
            setSelectedLead((prev: any) => prev ? { ...prev, ...updates } : null);
          }}
          activeStage={activeStage}
        />
      )}
    </div>
  );
}

// ─── Lead Card ──────────────────────────────────────────────────────────
function LeadCard({ lead, onSelect, onDragStart }: { lead: any; onSelect: () => void; onDragStart: () => void }) {
  const stageConfig = PIPELINE_STAGES.find(s => s.value === lead.pipeline_stage);
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      className="cursor-pointer hover:shadow-md transition-shadow border"
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground mt-1 shrink-0 cursor-grab" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h4 className="font-semibold text-sm truncate">{lead.customer_name}</h4>
                {lead.client_id && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0 font-mono">
                    {lead.client_id}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {lead.source && (
                  <Badge className="text-[10px] h-5 bg-primary/10 text-primary border-0">{lead.source}</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>
              {lead.car_brand && <span className="flex items-center gap-1"><Car className="h-3 w-3" />{lead.car_brand} {lead.car_model}</span>}
              {lead.city && <span>{lead.city}</span>}
            </div>
            {lead.inquiry_remarks && (
              <p className="text-xs text-muted-foreground mt-1 truncate">📝 {lead.inquiry_remarks}</p>
            )}
            {lead.follow_up_date && (
              <p className="text-xs mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Follow-up: {format(new Date(lead.follow_up_date), "dd MMM")}
                {lead.follow_up_time && ` at ${lead.follow_up_time}`}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Add Lead Modal ─────────────────────────────────────────────────────
function AddLeadModal({ open, onOpenChange, onSubmit, isPending }: any) {
  const [form, setForm] = useState({
    customer_name: "", phone: "", email: "", city: "", car_brand: "", car_model: "",
    car_variant: "", source: "Manual", inquiry_remarks: "",
  });

  const handleSubmit = () => {
    if (!form.customer_name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    onSubmit(form);
    setForm({ customer_name: "", phone: "", email: "", city: "", car_brand: "", car_model: "", car_variant: "", source: "Manual", inquiry_remarks: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add New Sales Lead</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name *</Label><Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
            <div><Label>Phone *</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Brand</Label><Input value={form.car_brand} onChange={e => setForm(p => ({ ...p, car_brand: e.target.value }))} placeholder="e.g. Maruti" /></div>
            <div><Label>Model</Label><Input value={form.car_model} onChange={e => setForm(p => ({ ...p, car_model: e.target.value }))} placeholder="e.g. Brezza" /></div>
            <div><Label>Variant</Label><Input value={form.car_variant} onChange={e => setForm(p => ({ ...p, car_variant: e.target.value }))} /></div>
          </div>
          <div>
            <Label>Lead Source</Label>
            <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Inquiry Remarks</Label>
            <Textarea value={form.inquiry_remarks} onChange={e => setForm(p => ({ ...p, inquiry_remarks: e.target.value }))}
              placeholder="What is the customer looking for? Budget, timeline, preferences..." rows={3} />
          </div>
          <Button onClick={handleSubmit} disabled={isPending} className="w-full">
            {isPending ? "Adding..." : "Add Lead"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Lead Detail Modal ──────────────────────────────────────────────────
function LeadDetailModal({ lead, activities, onClose, onUpdate, activeStage }: any) {
  const [remarks, setRemarks] = useState("");
  const [callStatus, setCallStatus] = useState(lead.call_status || "");
  const [callRemarks, setCallRemarks] = useState("");
  const [buyingIntent, setBuyingIntent] = useState(lead.buying_intent || "");
  const [lostReason, setLostReason] = useState("");
  const [lostRemarks, setLostRemarks] = useState("");
  const [bookingStatus, setBookingStatus] = useState(lead.booking_status || "");
  const [feedbackRating, setFeedbackRating] = useState(lead.feedback_rating || 0);
  const [feedbackText, setFeedbackText] = useState(lead.feedback_text || "");
  const [followUpDate, setFollowUpDate] = useState(lead.follow_up_date || "");
  const [followUpTime, setFollowUpTime] = useState(lead.follow_up_time || "");

  const pendingStage = lead._pendingStage;
  const stageConfig = PIPELINE_STAGES.find(s => s.value === (pendingStage || lead.pipeline_stage));

  // Smart Calling save
  const handleCallSave = () => {
    if (!callStatus || !callRemarks.trim()) {
      toast.error("Status and remarks are mandatory"); return;
    }
    onUpdate(
      { call_status: callStatus, call_remarks: callRemarks, call_attempts: (lead.call_attempts || 0) + 1 },
      "call_logged", `Call: ${callStatus} — ${callRemarks}`
    );
    toast.success("Call logged");
    setCallRemarks("");
  };

  // Lost save (mandatory)
  const handleLostSave = () => {
    if (!lostReason || !lostRemarks.trim()) {
      toast.error("Reason and remarks are mandatory for Lost"); return;
    }
    onUpdate(
      { pipeline_stage: "lost", lost_reason: lostReason, lost_remarks: lostRemarks },
      "marked_lost", `Lost: ${lostReason} — ${lostRemarks}`
    );
    toast.success("Marked as Lost");
    onClose();
  };

  // After Sales / feedback save (mandatory)
  const handleAfterSalesSave = () => {
    if (!feedbackText.trim() || feedbackRating < 1) {
      toast.error("Feedback and rating are mandatory for After Sales"); return;
    }
    onUpdate(
      { pipeline_stage: "after_sales", feedback_rating: feedbackRating, feedback_text: feedbackText, incentive_eligible: true },
      "after_sales_closed", `Rating: ${feedbackRating}/5 — ${feedbackText}`
    );
    toast.success("After Sales completed — Incentive Eligible ✅");
    onClose();
  };

  // General remark save
  const handleAddRemark = () => {
    if (!remarks.trim()) return;
    const history = Array.isArray(lead.remarks_history) ? lead.remarks_history : [];
    onUpdate(
      { remarks_history: [...history, { text: remarks, at: new Date().toISOString() }] },
      "remark_added", remarks
    );
    toast.success("Remark saved");
    setRemarks("");
  };

  // Booking update
  const handleBookingUpdate = () => {
    if (!bookingStatus) { toast.error("Select booking status"); return; }
    onUpdate(
      { booking_status: bookingStatus },
      "booking_updated", `Booking: ${bookingStatus}`
    );
    toast.success("Booking updated");
  };

  // Follow up save
  const handleFollowUpSave = () => {
    if (!followUpDate) { toast.error("Select follow-up date"); return; }
    onUpdate(
      { follow_up_date: followUpDate, follow_up_time: followUpTime },
      "follow_up_set", `Follow-up: ${followUpDate} ${followUpTime}`
    );
    toast.success("Follow-up saved");
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{lead.customer_name}</span>
            {lead.client_id && (
              <Badge variant="outline" className="font-mono text-xs">{lead.client_id}</Badge>
            )}
            <Badge className={stageConfig?.color}>{stageConfig?.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Client Info Card */}
        <Card className="border">
          <CardContent className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div><span className="text-muted-foreground text-xs">Phone</span>
              <div className="flex items-center gap-2 font-medium">
                {lead.phone}
                <a href={`tel:${lead.phone}`} className="text-primary"><Phone className="h-3.5 w-3.5" /></a>
                <a href={`https://wa.me/91${lead.phone?.replace(/\D/g, "")}`} target="_blank" className="text-emerald-600"><MessageSquare className="h-3.5 w-3.5" /></a>
              </div>
            </div>
            {lead.email && <div><span className="text-muted-foreground text-xs">Email</span><p className="font-medium truncate">{lead.email}</p></div>}
            {lead.city && <div><span className="text-muted-foreground text-xs">City</span><p className="font-medium">{lead.city}</p></div>}
            {lead.car_brand && <div><span className="text-muted-foreground text-xs">Car</span><p className="font-medium">{lead.car_brand} {lead.car_model} {lead.car_variant}</p></div>}
            {lead.source && <div><span className="text-muted-foreground text-xs">Source</span><p className="font-medium">{lead.source}</p></div>}
            {lead.buying_intent && <div><span className="text-muted-foreground text-xs">Buying Intent</span><p className="font-medium">{lead.buying_intent}</p></div>}
          </CardContent>
        </Card>

        <Separator />

        {/* ─── STAGE: Lost (pending or current) ──────────────────── */}
        {pendingStage === "lost" && (
          <div className="space-y-3 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-2 text-red-600 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" /> Mandatory: Provide reason for Lost
            </div>
            <Select value={lostReason} onValueChange={setLostReason}>
              <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
              <SelectContent>{LOST_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea value={lostRemarks} onChange={e => setLostRemarks(e.target.value)} placeholder="Detailed remarks..." rows={3} />
            <Button variant="destructive" onClick={handleLostSave} className="w-full">Mark as Lost</Button>
          </div>
        )}

        {/* ─── STAGE: After Sales (pending) ──────────────────────── */}
        {pendingStage === "after_sales" && (
          <div className="space-y-3 p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-center gap-2 text-yellow-700 text-sm font-semibold">
              <Star className="h-4 w-4" /> Mandatory: Collect feedback to close & earn incentive
            </div>
            <div>
              <Label>Rating *</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setFeedbackRating(n)} className={`p-1 rounded ${feedbackRating >= n ? "text-yellow-500" : "text-muted-foreground"}`}>
                    <Star className="h-5 w-5" fill={feedbackRating >= n ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>
            <div><Label>Experience & Feedback *</Label>
              <Textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Customer experience, feedback, suggestions..." rows={3} />
            </div>
            <Button onClick={handleAfterSalesSave} className="w-full bg-yellow-600 hover:bg-yellow-700">
              <Trophy className="h-4 w-4 mr-2" /> Close & Mark Incentive Eligible
            </Button>
          </div>
        )}

        {/* ─── STAGE: Smart Calling ──────────────────────────────── */}
        {!pendingStage && lead.pipeline_stage === "smart_calling" && (
          <div className="space-y-3 p-4 rounded-lg border bg-amber-500/5 border-amber-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><PhoneCall className="h-4 w-4" /> Call Logger</h3>
            <div className="flex gap-2">
              <a href={`tel:${lead.phone}`} className="flex-1">
                <Button variant="outline" className="w-full gap-2"><Phone className="h-4 w-4" /> Dial</Button>
              </a>
              <a href={`https://wa.me/91${lead.phone?.replace(/\D/g, "")}`} target="_blank" className="flex-1">
                <Button variant="outline" className="w-full gap-2 text-emerald-600"><MessageSquare className="h-4 w-4" /> WhatsApp</Button>
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Call Status *</Label>
                <Select value={callStatus} onValueChange={setCallStatus}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{CALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Buying Intent</Label>
                <Select value={buyingIntent} onValueChange={v => { setBuyingIntent(v); onUpdate({ buying_intent: v }, "intent_set", `Intent: ${v}`); }}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{BUYING_INTENTS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Call Remarks *</Label>
              <Textarea value={callRemarks} onChange={e => setCallRemarks(e.target.value)} placeholder="Discussion summary..." rows={2} />
            </div>
            {lead.call_attempts > 0 && (
              <p className="text-xs text-muted-foreground">📞 {lead.call_attempts} call attempt(s) logged</p>
            )}
            <Button onClick={handleCallSave} className="w-full">Save Call Log</Button>
          </div>
        )}

        {/* ─── STAGE: Interested ─────────────────────────────────── */}
        {!pendingStage && lead.pipeline_stage === "interested" && (
          <div className="space-y-3 p-4 rounded-lg border bg-cyan-500/5 border-cyan-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Car className="h-4 w-4" /> Interested — Discussion & Quotes</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Buying Intent</Label>
                <Select value={buyingIntent} onValueChange={v => { setBuyingIntent(v); onUpdate({ buying_intent: v }, "intent_updated", `Intent: ${v}`); }}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{BUYING_INTENTS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Follow-up Date</Label>
                <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* ─── STAGE: Offer Shared ───────────────────────────────── */}
        {!pendingStage && lead.pipeline_stage === "offer_shared" && (
          <div className="space-y-3 p-4 rounded-lg border bg-violet-500/5 border-violet-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Send className="h-4 w-4" /> Offer Shared — Quote & EMI Details</h3>
            <p className="text-xs text-muted-foreground">Track shared quotes, EMI plans, and discussions with this client.</p>
          </div>
        )}

        {/* ─── STAGE: Booking ────────────────────────────────────── */}
        {!pendingStage && lead.pipeline_stage === "booking" && (
          <div className="space-y-3 p-4 rounded-lg border bg-indigo-500/5 border-indigo-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Booking Status</h3>
            <Select value={bookingStatus} onValueChange={setBookingStatus}>
              <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
              <SelectContent>{BOOKING_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" onClick={handleBookingUpdate}>Update Booking</Button>
            {lead.loan_status && (
              <Badge variant="outline">{lead.loan_status === "approved" ? "✅ Loan Approved" : lead.loan_status === "rejected" ? "❌ Loan Rejected" : lead.loan_status}</Badge>
            )}
          </div>
        )}

        {/* ─── STAGE: Delivery ───────────────────────────────────── */}
        {!pendingStage && lead.pipeline_stage === "delivery" && (
          <div className="space-y-3 p-4 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Delivery — Upload Photos & Documents</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Delivery Date</Label>
                <Input type="date" value={lead.delivery_date || ""} onChange={e => onUpdate({ delivery_date: e.target.value }, "delivery_date_set", `Delivery: ${e.target.value}`)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">📸 Add delivery photos, customer handover docs, and share feedback links from the remarks below.</p>
          </div>
        )}

        {/* ─── STAGE: After Sales (already in) ───────────────────── */}
        {!pendingStage && lead.pipeline_stage === "after_sales" && (
          <div className="space-y-3 p-4 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Trophy className="h-4 w-4" /> After Sales — Closed</h3>
            {lead.feedback_rating && (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star key={n} className={`h-4 w-4 ${lead.feedback_rating >= n ? "text-yellow-500" : "text-muted-foreground"}`} fill={lead.feedback_rating >= n ? "currentColor" : "none"} />
                ))}
                <span className="text-sm ml-2">{lead.feedback_text}</span>
              </div>
            )}
            {lead.incentive_eligible && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✅ Incentive Eligible</Badge>
            )}
          </div>
        )}

        {/* ─── Follow-up & Remarks (universal) ───────────────────── */}
        {!pendingStage && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className="w-36" />
                <Input type="time" value={followUpTime} onChange={e => setFollowUpTime(e.target.value)} className="w-28" />
                <Button size="sm" variant="outline" onClick={handleFollowUpSave}><Calendar className="h-3.5 w-3.5 mr-1" /> Set Follow-up</Button>
              </div>

              <div className="flex gap-2">
                <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add remark / note..." rows={2} className="flex-1" />
                <Button size="sm" onClick={handleAddRemark} className="self-end">Save</Button>
              </div>
            </div>

            {/* Activity / Chat History */}
            <Separator />
            <div>
              <h4 className="font-semibold text-sm mb-2">📋 Activity & Remarks History</h4>
              <ScrollArea className="max-h-48">
                {activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {activities.map((a: any) => (
                      <div key={a.id} className="flex gap-2 text-xs border rounded p-2">
                        <Badge variant="outline" className="text-[10px] h-4 shrink-0">{a.action?.replace(/_/g, " ")}</Badge>
                        <span className="flex-1 text-muted-foreground">{a.remarks}</span>
                        <span className="text-muted-foreground shrink-0">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
