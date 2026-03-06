import { useState, useMemo, useCallback, useRef } from "react";
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
import { format, formatDistanceToNow, differenceInHours, differenceInDays } from "date-fns";
import {
  UserPlus, PhoneCall, Car, Send, Star, CheckCircle2, XCircle,
  Phone, MessageSquare, Plus, GripVertical, Clock, AlertTriangle,
  Upload, Image, Video, Users, TrendingUp, X,
  Calendar, Trophy, BarChart3, FileSpreadsheet, Tag, Share2,
  Flame, MessageCircle, Download,
} from "lucide-react";
import jsPDF from "jspdf";
import { LeadImportDialog } from "../shared/LeadImportDialog";
import { StageNotificationBanner } from "../shared/StageNotificationBanner";

// ─── 6-Stage Pipeline Config ────────────────────────────────────────────
const PIPELINE_STAGES = [
  { value: "new_lead", label: "New Lead", icon: UserPlus, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { value: "smart_calling", label: "Smart Call", icon: PhoneCall, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "running_offer", label: "Running Offer", icon: Tag, color: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  { value: "status", label: "Status", icon: BarChart3, color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  { value: "delivery", label: "Delivery", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { value: "after_sales", label: "After Sales", icon: Star, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
];

const STAGE_COLORS: Record<string, string> = {
  new_lead: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  smart_calling: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  running_offer: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  status: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  delivery: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  after_sales: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

const SOURCES = ["Meta", "Google Ads", "Referral", "Walk-in", "WhatsApp", "Website", "Admin Routed", "Manual", "CSV Import"];
const CALL_STATUSES = ["Interested", "Not Interested", "Call Back", "No Answer", "Wrong Number", "Busy", "Follow Up"];
const BUYING_INTENTS = ["Immediate (This Week)", "Within 15 Days", "Within 1 Month", "Exploring Options", "Not Sure"];
const LOST_REASONS = ["Budget constraints", "Bought elsewhere", "Not interested anymore", "Better offer", "Loan rejected", "Changed mind", "Other"];

const STAGE_MAP: Record<string, string> = {
  new_lead: "new_lead", new: "new_lead", contacted: "smart_calling",
  smart_calling: "smart_calling", interested: "running_offer", qualified: "running_offer",
  offer_shared: "running_offer", quoted: "running_offer", booking: "status",
  booked: "status", lost: "status", delivery: "delivery", delivered: "delivery",
  after_sales: "after_sales", converted: "after_sales",
  running_offer: "running_offer", status: "status",
};
const normalizeStage = (s: string | null) => STAGE_MAP[s || "new_lead"] || "new_lead";

// ─── Main Component ─────────────────────────────────────────────────────
export function SalesWorkspace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddLead, setShowAddLead] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingLead, setDraggingLead] = useState<any>(null);

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
  const won = leads.filter((l: any) => l.status_outcome === "won").length;
  const lostCount = leads.filter((l: any) => l.status_outcome === "lost").length;
  const conversion = totalLeads > 0 ? ((won / totalLeads) * 100).toFixed(1) : "0";

  // Notifications
  const salesNotifications = useMemo(() => {
    const items: any[] = [];
    const now = new Date();
    leads.forEach((l: any) => {
      if (l.follow_up_date) {
        const fuDate = new Date(l.follow_up_date);
        const hours = differenceInHours(fuDate, now);
        if (hours <= 24 && hours >= -48) {
          items.push({
            id: `followup-${l.id}`, type: hours < 0 ? "overdue" : "followup",
            title: `${l.customer_name || "Lead"} - follow-up ${hours < 0 ? "overdue" : "today"}`,
            subtitle: l.follow_up_time ? `at ${l.follow_up_time}` : l.phone,
          });
        }
      }
      if (l.last_activity_at) {
        const hours = differenceInHours(now, new Date(l.last_activity_at));
        if (hours > 48 && !["after_sales"].includes(l.pipeline_stage) && l.status_outcome !== "lost") {
          items.push({
            id: `stale-${l.id}`, type: "followup",
            title: `${l.customer_name || "Lead"} - no activity ${Math.floor(hours / 24)}d`,
            subtitle: l.phone,
          });
        }
      }
    });
    return items.sort((a: any, b: any) => {
      const priority: Record<string, number> = { overdue: 0, urgent: 1, followup: 2 };
      return (priority[a.type] || 3) - (priority[b.type] || 3);
    });
  }, [leads]);

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
          pipeline_id: id, action: logAction, remarks: logRemarks || null, performed_by: user?.email,
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
  const handleDragStart = useCallback((e: React.DragEvent, lead: any) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify({ id: lead.id, stage: lead.pipeline_stage }));
    setDraggingLead(lead);
  }, []);

  const handleDragEnd = useCallback(() => { setDraggingLead(null); setDragOverStage(null); }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverStage(stage);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStage(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStage: string) => {
    e.preventDefault(); setDragOverStage(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data.stage === targetStage) return;
      const lead = leads.find((l: any) => l.id === data.id);
      if (!lead) return;

      // Status stage requires modal for won/lost
      if (targetStage === "status") {
        setSelectedLead({ ...lead, _targetStage: "status" });
        setShowDetailModal(true);
        return;
      }
      // After Sales requires feedback
      if (targetStage === "after_sales") {
        setSelectedLead({ ...lead, _targetStage: "after_sales" });
        setShowDetailModal(true);
        return;
      }

      updateLeadMutation.mutate({
        id: data.id,
        updates: { pipeline_stage: targetStage },
        logAction: "stage_change",
        logRemarks: `Moved from ${data.stage} to ${targetStage}`,
      });
      toast.success(`Moved to ${PIPELINE_STAGES.find(s => s.value === targetStage)?.label}`);
    } catch {}
    setDraggingLead(null);
  }, [leads, updateLeadMutation]);

  const handleCardClick = (lead: any) => {
    setSelectedLead(lead);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-4">
      {/* KPI Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Leads", value: totalLeads, icon: Users, color: "text-blue-600", bg: "from-blue-500/10" },
          { label: "In Pipeline", value: totalLeads - won - lostCount, icon: TrendingUp, color: "text-cyan-600", bg: "from-cyan-500/10" },
          { label: "Won", value: won, icon: CheckCircle2, color: "text-emerald-600", bg: "from-emerald-500/10" },
          { label: "Lost", value: lostCount, icon: XCircle, color: "text-red-600", bg: "from-red-500/10" },
          { label: "Conversion", value: `${conversion}%`, icon: BarChart3, color: "text-violet-600", bg: "from-violet-500/10" },
        ].map((kpi, i) => (
          <Card key={kpi.label} className="border overflow-hidden">
            <CardContent className="p-3 relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.bg} to-transparent opacity-50`} />
              <div className="relative flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg bg-background/80 ${kpi.color}`}>
                  <kpi.icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{kpi.value}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notifications */}
      {salesNotifications.length > 0 && <StageNotificationBanner items={salesNotifications} />}

      {/* Import Dialog */}
      <LeadImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        title="Import Sales Leads"
        templateColumns={["name", "phone", "city", "car_brand", "car_model", "source"]}
        onImport={async (importedLeads) => {
          const rows = importedLeads.map(l => ({
            customer_name: l.name || l.customer_name || "Unknown",
            phone: (l.phone || l.mobile || "").replace(/\D/g, ""),
            city: l.city || null,
            car_brand: l.car_brand || null,
            car_model: l.car_model || null,
            source: l.source || "CSV Import",
            pipeline_stage: "smart_calling",
            client_id: `SC-${Date.now().toString(36).toUpperCase()}`,
          }));
          const { error } = await supabase.from("sales_pipeline").insert(rows);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ["sales-pipeline"] });
        }}
      />

      {/* Pipeline Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Sales Pipeline</h2>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{won} Won</Badge>
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">{lostCount} Lost</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowImport(true)} className="gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Import
          </Button>
          <Button size="sm" onClick={() => setShowAddLead(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Drag hint */}
      {draggingLead && (
        <div className="text-xs text-center text-muted-foreground bg-muted/50 rounded-lg py-1.5 border border-dashed border-primary/30 animate-pulse">
          Drop on a stage to move <strong>{draggingLead.customer_name}</strong>
        </div>
      )}

      {/* Kanban Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max">
          {PIPELINE_STAGES.map(stage => {
            const stageLeads = leads.filter((l: any) => l.pipeline_stage === stage.value);
            const isDragOver = dragOverStage === stage.value;
            const showDrop = draggingLead && isDragOver;
            const Icon = stage.icon;

            return (
              <div key={stage.value} className="w-[280px] shrink-0 flex flex-col"
                onDragOver={e => handleDragOver(e, stage.value)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, stage.value)}>
                {/* Column Header */}
                <div className={`rounded-lg border p-2.5 mb-2 transition-all ${stage.color} ${
                  showDrop ? "ring-2 ring-primary scale-[1.02] shadow-lg" : ""}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="font-semibold text-xs">{stage.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] h-5">{stageLeads.length}</Badge>
                  </div>
                </div>

                {/* Cards */}
                <div className={`space-y-2 min-h-[120px] flex-1 rounded-lg transition-all p-1 ${
                  showDrop ? "bg-primary/5 border-2 border-dashed border-primary/30" : ""}`}>
                  {stageLeads.length === 0 && !showDrop && (
                    <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground/40 py-8">No leads</div>
                  )}
                  {showDrop && stageLeads.length === 0 && (
                    <div className="h-full flex items-center justify-center text-[11px] text-primary/60 py-8 font-medium">Drop here</div>
                  )}
                  {stageLeads.map((lead: any) => (
                    <SalesLeadCard key={lead.id} lead={lead}
                      onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                      onClick={handleCardClick} isDragging={draggingLead?.id === lead.id} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Add Lead Modal */}
      <AddLeadModal open={showAddLead} onOpenChange={setShowAddLead} onSubmit={(d: any) => addLeadMutation.mutate(d)} isPending={addLeadMutation.isPending} />

      {/* Lead Detail Modal */}
      {selectedLead && (
        <SalesDetailModal
          open={showDetailModal}
          onOpenChange={v => { setShowDetailModal(v); if (!v) setSelectedLead(null); }}
          lead={selectedLead}
          activities={activities}
          onUpdate={(updates: any, logAction?: string, logRemarks?: string) => {
            updateLeadMutation.mutate({ id: selectedLead.id, updates, logAction, logRemarks });
            setSelectedLead((prev: any) => prev ? { ...prev, ...updates } : null);
          }}
        />
      )}
    </div>
  );
}

// ─── Lead Card ──────────────────────────────────────────────────────────
function SalesLeadCard({ lead, onDragStart, onDragEnd, onClick, isDragging }: any) {
  const sourceColors: Record<string, string> = {
    meta: "bg-blue-500/10 text-blue-600", "google ads": "bg-red-500/10 text-red-600",
    referral: "bg-green-500/10 text-green-600", "walk-in": "bg-amber-500/10 text-amber-600",
    whatsapp: "bg-emerald-500/10 text-emerald-600", website: "bg-purple-500/10 text-purple-600",
    manual: "bg-muted text-muted-foreground", "csv import": "bg-indigo-500/10 text-indigo-600",
  };

  return (
    <Card draggable onDragStart={e => onDragStart(e, lead)} onDragEnd={onDragEnd}
      className={`border-border/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${isDragging ? "opacity-30 scale-95" : ""}`}
      onClick={() => onClick(lead)}>
      <CardContent className="p-2.5 space-y-1.5">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1.5 min-w-0">
            <GripVertical className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0" />
            <span className="font-medium text-xs truncate max-w-[140px]">{lead.customer_name}</span>
          </div>
          {lead.source && (
            <Badge className={`text-[8px] px-1 py-0 ${sourceColors[lead.source.toLowerCase()] || "bg-muted text-muted-foreground"}`}>
              {lead.source}
            </Badge>
          )}
        </div>
        {lead.client_id && (
          <div className="text-[9px] font-mono text-muted-foreground/50 truncate">ID: {lead.client_id}</div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Phone className="h-2.5 w-2.5" />{lead.phone}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={e => { e.stopPropagation(); window.open(`tel:${lead.phone}`); }}>
              <PhoneCall className="h-3 w-3 text-blue-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={e => { e.stopPropagation(); window.open(`https://wa.me/91${lead.phone?.replace(/\D/g, "").slice(-10)}`); }}>
              <MessageCircle className="h-3 w-3 text-green-600" />
            </Button>
          </div>
        </div>
        {lead.car_brand && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Car className="h-2.5 w-2.5" />{lead.car_brand} {lead.car_model}
          </div>
        )}
        {lead.status_outcome === "won" && (
          <Badge className="text-[8px] bg-emerald-500/10 text-emerald-600 border-0">Won</Badge>
        )}
        {lead.status_outcome === "lost" && (
          <Badge className="text-[8px] bg-red-500/10 text-red-600 border-0">Lost</Badge>
        )}
        {lead.feedback_rating && lead.feedback_rating > 0 && (
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} className={`h-2.5 w-2.5 ${lead.feedback_rating >= n ? "text-yellow-500" : "text-muted-foreground/20"}`}
                fill={lead.feedback_rating >= n ? "currentColor" : "none"} />
            ))}
          </div>
        )}
        {lead.follow_up_date && (
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" /> {format(new Date(lead.follow_up_date), "dd MMM")}
          </div>
        )}
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
    if (!form.customer_name.trim() || !form.phone.trim()) { toast.error("Name and phone are required"); return; }
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
          <div><Label>Inquiry Remarks</Label>
            <Textarea value={form.inquiry_remarks} onChange={e => setForm(p => ({ ...p, inquiry_remarks: e.target.value }))} placeholder="What is the customer looking for?" rows={3} />
          </div>
          <Button onClick={handleSubmit} disabled={isPending} className="w-full">{isPending ? "Adding..." : "Add Lead"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sales Detail Modal (Rich, Stage-Specific) ──────────────────────────
function SalesDetailModal({ open, onOpenChange, lead, activities, onUpdate }: any) {
  const [remarks, setRemarks] = useState("");
  const [callStatus, setCallStatus] = useState(lead.call_status || "");
  const [callRemarks, setCallRemarks] = useState("");
  const [buyingIntent, setBuyingIntent] = useState(lead.buying_intent || "");
  const [lostReason, setLostReason] = useState("");
  const [lostRemarks, setLostRemarks] = useState("");
  const [statusOutcome, setStatusOutcome] = useState<string>(lead.status_outcome || "");
  const [feedbackRating, setFeedbackRating] = useState(lead.feedback_rating || 0);
  const [feedbackText, setFeedbackText] = useState(lead.feedback_text || "");
  const [followUpDate, setFollowUpDate] = useState(lead.follow_up_date || "");
  const [followUpTime, setFollowUpTime] = useState(lead.follow_up_time || "");
  const [deliveryDate, setDeliveryDate] = useState(lead.delivery_date || "");
  const [deliveryImages, setDeliveryImages] = useState<string[]>((lead.delivery_images as string[]) || []);
  const [videoUrl, setVideoUrl] = useState(lead.video_url || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendingStage = lead._targetStage;
  const currentStage = pendingStage || lead.pipeline_stage;
  const stageConfig = PIPELINE_STAGES.find(s => s.value === currentStage);

  // ─── Smart Calling Save ─────────────
  const handleCallSave = () => {
    if (!callStatus || !callRemarks.trim()) { toast.error("Status and remarks are mandatory"); return; }
    const nextStage = callStatus === "Interested" ? "running_offer" : lead.pipeline_stage;
    const updates: any = {
      call_status: callStatus, call_remarks: callRemarks, call_attempts: (lead.call_attempts || 0) + 1,
    };
    if (callStatus === "Interested") updates.pipeline_stage = "running_offer";
    if (callStatus === "Not Interested") {
      updates.pipeline_stage = "status";
      updates.status_outcome = "lost";
      updates.lost_reason = "Not interested";
      updates.lost_remarks = callRemarks;
    }
    onUpdate(updates, "call_logged", `Call: ${callStatus} - ${callRemarks}`);
    toast.success("Call logged");
    setCallRemarks("");
  };

  // ─── Status Won/Lost ────────────────
  const handleStatusSave = () => {
    if (!statusOutcome) { toast.error("Select Won or Lost"); return; }
    if (statusOutcome === "lost" && (!lostReason || !lostRemarks.trim())) {
      toast.error("Reason and remarks are mandatory for Lost"); return;
    }
    const updates: any = { pipeline_stage: "status", status_outcome: statusOutcome };
    if (statusOutcome === "lost") {
      updates.lost_reason = lostReason;
      updates.lost_remarks = lostRemarks;
    }
    if (statusOutcome === "won") {
      updates.pipeline_stage = "delivery";
    }
    onUpdate(updates, statusOutcome === "won" ? "marked_won" : "marked_lost",
      statusOutcome === "won" ? "Won - moving to delivery" : `Lost: ${lostReason} - ${lostRemarks}`);
    toast.success(statusOutcome === "won" ? "Marked as Won! Moving to Delivery" : "Marked as Lost");
    onOpenChange(false);
  };

  // ─── After Sales (mandatory rating) ──
  const handleAfterSalesSave = () => {
    if (feedbackRating < 1 || !feedbackText.trim()) {
      toast.error("Rating (1-5) and feedback text are mandatory"); return;
    }
    onUpdate(
      { pipeline_stage: "after_sales", feedback_rating: feedbackRating, feedback_text: feedbackText, incentive_eligible: true },
      "after_sales_closed", `Rating: ${feedbackRating}/5 - ${feedbackText}`
    );
    toast.success("After Sales completed - Incentive Eligible!");
    onOpenChange(false);
  };

  // ─── Remark ────────────────────────
  const handleAddRemark = () => {
    if (!remarks.trim()) return;
    const history = Array.isArray(lead.remarks_history) ? lead.remarks_history : [];
    onUpdate({ remarks_history: [...history, { text: remarks, at: new Date().toISOString(), by: "agent" }] }, "remark_added", remarks);
    toast.success("Remark saved");
    setRemarks("");
  };

  // ─── Follow-up ─────────────────────
  const handleFollowUpSave = () => {
    if (!followUpDate) { toast.error("Select follow-up date"); return; }
    onUpdate({ follow_up_date: followUpDate, follow_up_time: followUpTime }, "follow_up_set", `Follow-up: ${followUpDate} ${followUpTime}`);
    toast.success("Follow-up saved");
  };

  // ─── Delivery image upload ─────────
  const handleImageUpload = async (files: FileList) => {
    const urls: string[] = [...deliveryImages];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `delivery/${lead.id}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage.from("car-assets").upload(path, file, { contentType: file.type, upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("car-assets").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    setDeliveryImages(urls);
    onUpdate({ delivery_images: urls }, "delivery_media_added", `${files.length} image(s) added`);
    toast.success("Images uploaded");
  };

  // ─── Generate Quote PDF ────────────
  const handleGenerateQuote = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, w, 50, "F");
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 45, w, 5, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Car Sales Quotation", w / 2, 22, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("GrabYourCar - Your Trusted Auto Partner", w / 2, 32, { align: "center" });
    doc.text("www.grabyourcar.com", w / 2, 40, { align: "center" });

    let y = 65;
    doc.setTextColor(60, 60, 60);

    const rows = [
      ["Customer Name", lead.customer_name || "-"],
      ["Phone", lead.phone || "-"],
      ["City", lead.city || "-"],
      ["Car", `${lead.car_brand || ""} ${lead.car_model || ""} ${lead.car_variant || ""}`.trim() || "-"],
      ["Source", lead.source || "-"],
      ["Buying Intent", lead.buying_intent || "-"],
      ["Date", format(new Date(), "dd MMM yyyy")],
    ];

    const boxX = 20;
    const boxW = w - 40;

    rows.forEach(([label, value], i) => {
      const rowY = y + i * 12;
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(boxX, rowY - 4, boxW, 12, "F"); }
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(label, boxX + 8, rowY + 4);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(value, boxX + boxW - 8, rowY + 4, { align: "right" });
    });

    y += rows.length * 12 + 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(boxX, y, boxX + boxW, y);
    y += 10;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")} | GrabYourCar`, boxX, y);

    doc.save(`Quote_${lead.customer_name?.replace(/\s/g, "_") || "customer"}.pdf`);
    toast.success("Quotation PDF downloaded!");
  };

  const handleShareQuoteWhatsApp = () => {
    const msg = `*Car Sales Quote - GrabYourCar*\n\nCustomer: ${lead.customer_name}\nCar: ${lead.car_brand || ""} ${lead.car_model || ""} ${lead.car_variant || ""}\nCity: ${lead.city || "-"}\nBuying Intent: ${lead.buying_intent || "-"}\n\n_Contact us for the best offer!_\nwww.grabyourcar.com`;
    window.open(`https://wa.me/91${lead.phone?.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{lead.customer_name}</span>
            {lead.client_id && <Badge variant="outline" className="font-mono text-xs">{lead.client_id}</Badge>}
            <Badge className={stageConfig?.color}>{stageConfig?.label}</Badge>
            {lead.status_outcome === "won" && <Badge className="bg-emerald-500/10 text-emerald-600 border-0">Won</Badge>}
            {lead.status_outcome === "lost" && <Badge className="bg-red-500/10 text-red-600 border-0">Lost</Badge>}
          </DialogTitle>
        </DialogHeader>

        {/* Client Info Card */}
        <Card className="border bg-muted/30">
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
            <div><span className="text-muted-foreground text-xs">Source</span>
              <Badge variant="outline" className="text-xs mt-0.5">{lead.source || "Unknown"}</Badge>
            </div>
            {lead.buying_intent && <div><span className="text-muted-foreground text-xs">Buying Intent</span><p className="font-medium">{lead.buying_intent}</p></div>}
          </CardContent>
        </Card>

        <Separator />

        {/* ─── STAGE: New Lead ─────────────────────────────────────── */}
        {currentStage === "new_lead" && (
          <div className="space-y-3 p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><UserPlus className="h-4 w-4" /> New Lead Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded bg-background border">
                <p className="text-[10px] text-muted-foreground">Source</p>
                <p className="font-medium text-sm">{lead.source || "Unknown"}</p>
              </div>
              <div className="p-2 rounded bg-background border">
                <p className="text-[10px] text-muted-foreground">Created</p>
                <p className="font-medium text-sm">{lead.created_at ? format(new Date(lead.created_at), "dd MMM yyyy, hh:mm a") : "-"}</p>
              </div>
            </div>
            {lead.inquiry_remarks && (
              <div className="p-2 rounded bg-background border">
                <p className="text-[10px] text-muted-foreground">Inquiry Remarks</p>
                <p className="text-sm">{lead.inquiry_remarks}</p>
              </div>
            )}
            <Button size="sm" onClick={() => {
              onUpdate({ pipeline_stage: "smart_calling" }, "stage_change", "Moved to Smart Calling");
              toast.success("Moved to Smart Calling");
            }} className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white">
              <PhoneCall className="h-4 w-4" /> Move to Smart Calling
            </Button>
          </div>
        )}

        {/* ─── STAGE: Smart Calling ───────────────────────────────── */}
        {currentStage === "smart_calling" && (
          <div className="space-y-3 p-4 rounded-lg border bg-amber-500/5 border-amber-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><PhoneCall className="h-4 w-4" /> Smart Calling</h3>
            <div className="flex gap-2">
              <a href={`tel:${lead.phone}`} className="flex-1">
                <Button variant="outline" className="w-full gap-2"><Phone className="h-4 w-4" /> Dial</Button>
              </a>
              <a href={`https://wa.me/91${lead.phone?.replace(/\D/g, "").slice(-10)}`} target="_blank" className="flex-1">
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
              <p className="text-xs text-muted-foreground">Calls: {lead.call_attempts} attempt(s)</p>
            )}
            <Button onClick={handleCallSave} className="w-full bg-amber-600 hover:bg-amber-700 text-white">Save Call Log</Button>
          </div>
        )}

        {/* ─── STAGE: Running Offer / Discount ────────────────────── */}
        {currentStage === "running_offer" && (
          <div className="space-y-3 p-4 rounded-lg border bg-violet-500/5 border-violet-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Tag className="h-4 w-4" /> Running Offer / Discount</h3>

            {/* Chat history / Remarks */}
            {Array.isArray(lead.remarks_history) && lead.remarks_history.length > 0 && (
              <div className="rounded-lg border bg-background p-3 space-y-2 max-h-40 overflow-y-auto">
                <p className="text-[10px] text-muted-foreground font-medium uppercase">Chat History</p>
                {lead.remarks_history.map((r: any, i: number) => (
                  <div key={i} className="text-xs bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground">{r.at ? format(new Date(r.at), "dd MMM, hh:mm a") : ""}</span>
                    <p className="mt-0.5">{r.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Deal share / quote */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerateQuote}>
                <Download className="h-3.5 w-3.5" /> Download Quote PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-emerald-600" onClick={handleShareQuoteWhatsApp}>
                <Share2 className="h-3.5 w-3.5" /> Share on WhatsApp
              </Button>
            </div>

            <div>
              <Label>Buying Intent</Label>
              <Select value={buyingIntent} onValueChange={v => { setBuyingIntent(v); onUpdate({ buying_intent: v }, "intent_updated", `Intent: ${v}`); }}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{BUYING_INTENTS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <Button size="sm" onClick={() => {
              onUpdate({ pipeline_stage: "status" }, "stage_change", "Moved to Status for decision");
              toast.success("Moved to Status");
            }} className="w-full gap-2">
              <BarChart3 className="h-4 w-4" /> Move to Status (Won/Lost)
            </Button>
          </div>
        )}

        {/* ─── STAGE: Status (Won/Lost) ───────────────────────────── */}
        {(currentStage === "status" || pendingStage === "status") && (
          <div className="space-y-3 p-4 rounded-lg border bg-indigo-500/5 border-indigo-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Status - Mark Won or Lost</h3>

            <div className="grid grid-cols-2 gap-3">
              <Button variant={statusOutcome === "won" ? "default" : "outline"}
                className={`h-16 flex-col gap-1 ${statusOutcome === "won" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                onClick={() => setStatusOutcome("won")}>
                <CheckCircle2 className="h-6 w-6" />
                <span className="text-sm font-bold">Won</span>
              </Button>
              <Button variant={statusOutcome === "lost" ? "default" : "outline"}
                className={`h-16 flex-col gap-1 ${statusOutcome === "lost" ? "bg-red-600 hover:bg-red-700" : ""}`}
                onClick={() => setStatusOutcome("lost")}>
                <XCircle className="h-6 w-6" />
                <span className="text-sm font-bold">Lost</span>
              </Button>
            </div>

            {statusOutcome === "lost" && (
              <>
                <div>
                  <Label>Lost Reason * (mandatory)</Label>
                  <Select value={lostReason} onValueChange={setLostReason}>
                    <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
                    <SelectContent>{LOST_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Remarks * (mandatory)</Label>
                  <Textarea value={lostRemarks} onChange={e => setLostRemarks(e.target.value)} placeholder="Detailed remarks..." rows={3} />
                </div>
              </>
            )}

            <Button onClick={handleStatusSave} disabled={!statusOutcome}
              className={`w-full ${statusOutcome === "won" ? "bg-emerald-600 hover:bg-emerald-700" : statusOutcome === "lost" ? "bg-red-600 hover:bg-red-700" : ""}`}>
              {statusOutcome === "won" ? "Mark Won & Move to Delivery" : statusOutcome === "lost" ? "Mark as Lost" : "Select Won or Lost"}
            </Button>
          </div>
        )}

        {/* ─── STAGE: Delivery ────────────────────────────────────── */}
        {currentStage === "delivery" && (
          <div className="space-y-3 p-4 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Delivery - Photos, Deal & Dealership</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Delivery Date</Label>
                <Input type="date" value={deliveryDate} onChange={e => {
                  setDeliveryDate(e.target.value);
                  onUpdate({ delivery_date: e.target.value }, "delivery_date_set", `Delivery: ${e.target.value}`);
                }} />
              </div>
              <div>
                <Label>Dealership</Label>
                <Input value={lead.dealership || ""} onChange={e => onUpdate({ dealership: e.target.value })} placeholder="Dealership name" />
              </div>
            </div>

            {/* Deal details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded bg-background border">
                <p className="text-[10px] text-muted-foreground">Car</p>
                <p className="font-medium text-sm">{lead.car_brand || ""} {lead.car_model || ""} {lead.car_variant || ""}</p>
              </div>
              <div className="p-2 rounded bg-background border">
                <p className="text-[10px] text-muted-foreground">Source</p>
                <p className="font-medium text-sm">{lead.source || "-"}</p>
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <Label className="flex items-center gap-2 mb-2"><Image className="h-4 w-4" /> Delivery Photos</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {deliveryImages.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                    <img src={url} alt={`Delivery ${i + 1}`} className="w-full h-full object-cover" />
                    <button className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      onClick={() => {
                        const updated = deliveryImages.filter((_, idx) => idx !== i);
                        setDeliveryImages(updated);
                        onUpdate({ delivery_images: updated });
                      }}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground/50" />
                  <span className="text-[9px] text-muted-foreground">Add</span>
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => { if (e.target.files?.length) handleImageUpload(e.target.files); e.target.value = ""; }} />
            </div>

            {/* Video URL */}
            <div>
              <Label className="flex items-center gap-2"><Video className="h-4 w-4" /> Video URL</Label>
              <Input value={videoUrl} onChange={e => {
                setVideoUrl(e.target.value);
                onUpdate({ video_url: e.target.value }, "video_added", "Video URL added");
              }} placeholder="YouTube / Drive link" />
            </div>

            <Button size="sm" onClick={() => {
              onUpdate({ pipeline_stage: "after_sales" }, "stage_change", "Moved to After Sales");
              toast.success("Moved to After Sales");
            }} className="w-full gap-2 bg-yellow-600 hover:bg-yellow-700 text-white">
              <Star className="h-4 w-4" /> Move to After Sales
            </Button>
          </div>
        )}

        {/* ─── STAGE: After Sales (pending) ───────────────────────── */}
        {(currentStage === "after_sales" || pendingStage === "after_sales") && (
          <div className="space-y-3 p-4 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4" /> After Sales - Mandatory Feedback
            </h3>
            <p className="text-xs text-muted-foreground">Customer feedback is <strong>mandatory</strong> to mark this sale as incentive-eligible.</p>

            {lead.incentive_eligible ? (
              <div className="space-y-2">
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Incentive Eligible</Badge>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={`h-5 w-5 ${lead.feedback_rating >= n ? "text-yellow-500" : "text-muted-foreground/30"}`}
                      fill={lead.feedback_rating >= n ? "currentColor" : "none"} />
                  ))}
                  <span className="text-sm ml-2">{lead.feedback_text}</span>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <Label>Customer Rating * (1-5 Stars)</Label>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setFeedbackRating(n)}
                        className={`p-1.5 rounded-lg transition-all ${feedbackRating >= n ? "text-yellow-500 bg-yellow-500/10" : "text-muted-foreground/30 hover:text-yellow-400"}`}>
                        <Star className="h-6 w-6" fill={feedbackRating >= n ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Customer Feedback * (mandatory)</Label>
                  <Textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                    placeholder="How was the buying experience? Feedback, suggestions..." rows={3} />
                </div>
                <Button onClick={handleAfterSalesSave} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white gap-2">
                  <Trophy className="h-4 w-4" /> Complete & Mark Incentive Eligible
                </Button>
              </>
            )}
          </div>
        )}

        {/* ─── Universal: Follow-up, Remarks, Activity History ──── */}
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

        {/* Quick Move Buttons */}
        {!pendingStage && currentStage !== "after_sales" && (
          <div className="border-t pt-3">
            <p className="text-[10px] text-muted-foreground mb-2">Quick Move to Stage</p>
            <div className="flex flex-wrap gap-1.5">
              {PIPELINE_STAGES.filter(s => s.value !== currentStage).map(s => (
                <Button key={s.value} variant="outline" size="sm" className={`text-[10px] h-7 ${s.color}`}
                  onClick={() => {
                    if (s.value === "status" || s.value === "after_sales") {
                      // These require modal interaction, handled via drag/drop
                      return;
                    } else {
                      onUpdate({ pipeline_stage: s.value }, "stage_change", `Moved to ${s.label}`);
                      toast.success(`Moved to ${s.label}`);
                    }
                  }}>
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Activity History */}
        <Separator />
        <div>
          <h4 className="font-semibold text-sm mb-2">Activity & Chat History</h4>
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
      </DialogContent>
    </Dialog>
  );
}
