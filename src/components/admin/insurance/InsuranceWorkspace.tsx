import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import {
  UserPlus, Phone, FileText, Clock, CheckCircle2, XCircle,
  Search, PhoneCall, User, Car, Shield, TrendingUp, Send,
  MessageSquare, CalendarIcon, Bell, Plus, X,
  ChevronRight, CreditCard, Upload, RefreshCw, FileSpreadsheet, BookOpen, CalendarClock
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import InsuranceQuoteModal from "./InsuranceQuoteModal";
import { InsurancePolicyDocumentUploader } from "./InsurancePolicyDocumentUploader";
import { LeadImportDialog } from "../shared/LeadImportDialog";
import { StageNotificationBanner, buildInsuranceNotifications } from "../shared/StageNotificationBanner";

// ── 6+1 Pipeline Stages ──
const PIPELINE_STAGES = [
  { value: "new_lead", label: "New Lead", icon: UserPlus, color: "from-blue-500 to-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  { value: "smart_calling", label: "Smart Calling", icon: PhoneCall, color: "from-amber-500 to-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  { value: "quote_shared", label: "Quote Shared", icon: Send, color: "from-cyan-500 to-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30", border: "border-cyan-200 dark:border-cyan-800", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
  { value: "follow_up", label: "Follow-Up", icon: Clock, color: "from-orange-500 to-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  { value: "won", label: "Won", icon: CheckCircle2, color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  { value: "lost", label: "Lost", icon: XCircle, color: "from-slate-400 to-slate-500", bg: "bg-slate-50 dark:bg-slate-900/30", border: "border-slate-200 dark:border-slate-700", text: "text-slate-500 dark:text-slate-400", dot: "bg-slate-400" },
  { value: "policy_issued", label: "Policy Issued", icon: Shield, color: "from-emerald-600 to-emerald-800", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-600" },
];

// Map old stages to new ones
const STAGE_MAP: Record<string, string> = {
  new_lead: "new_lead",
  contact_attempted: "smart_calling",
  requirement_collected: "smart_calling",
  quote_shared: "quote_shared",
  follow_up: "follow_up",
  won: "won",
  lost: "lost",
  policy_issued: "policy_issued",
  smart_calling: "smart_calling",
};

const normalizeStage = (stage: string | null): string => STAGE_MAP[stage || "new_lead"] || "new_lead";

const CALL_STATUSES = ["Interested", "Not Interested", "Call Back", "No Answer", "Wrong Number"];
const LOST_REASONS = ["Too expensive", "Existing agent", "No response", "Not renewing", "Competitor offer", "Other"];
const LEAD_SOURCES = ["Meta", "Google Ads", "Referral", "Walk-in", "WhatsApp Broadcast", "Website", "Manual"];

const SOURCE_COLORS: Record<string, string> = {
  Meta: "bg-blue-100 text-blue-700 border-blue-200",
  "Google Ads": "bg-red-100 text-red-700 border-red-200",
  Referral: "bg-purple-100 text-purple-700 border-purple-200",
  "Walk-in": "bg-green-100 text-green-700 border-green-200",
  "WhatsApp Broadcast": "bg-emerald-100 text-emerald-700 border-emerald-200",
  Website: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Manual: "bg-gray-100 text-gray-700 border-gray-200",
};

interface Client {
  id: string;
  customer_name: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  vehicle_number: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  current_insurer: string | null;
  current_policy_type: string | null;
  current_premium: number | null;
  ncb_percentage: number | null;
  previous_claim: boolean | null;
  policy_expiry_date: string | null;
  policy_start_date: string | null;
  current_policy_number: string | null;
  lead_source: string | null;
  lead_status: string | null;
  assigned_executive: string | null;
  priority: string | null;
  pipeline_stage: string | null;
  contact_attempts: number | null;
  quote_amount: number | null;
  quote_insurer: string | null;
  lost_reason: string | null;
  follow_up_date: string | null;
  follow_up_time: string | null;
  call_status: string | null;
  call_remarks: string | null;
  renewal_reminder_set: boolean | null;
  renewal_reminder_date: string | null;
  incentive_eligible: boolean | null;
  notes: string | null;
  created_at: string;
}

export function InsuranceWorkspace() {
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [draggingClient, setDraggingClient] = useState<Client | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Modals
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [lostRemarks, setLostRemarks] = useState("");
  const [pendingMoveClient, setPendingMoveClient] = useState<Client | null>(null);

  const [showCallingDialog, setShowCallingDialog] = useState(false);
  const [callStatus, setCallStatus] = useState("");
  const [callRemarks, setCallRemarks] = useState("");

  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>();
  const [followUpTime, setFollowUpTime] = useState("10:00");
  const [followUpRemarks, setFollowUpRemarks] = useState("");

  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showUploadPolicy, setShowUploadPolicy] = useState(false);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [renewalDate, setRenewalDate] = useState<Date | undefined>();

  // Add Lead
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ customer_name: "", phone: "", email: "", city: "", vehicle_number: "", vehicle_make: "", vehicle_model: "", lead_source: "Manual", notes: "" });

  // Data
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["ins-workspace-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, email, city, vehicle_number, vehicle_make, vehicle_model, vehicle_year, current_insurer, current_policy_type, current_premium, ncb_percentage, previous_claim, policy_expiry_date, policy_start_date, current_policy_number, lead_source, lead_status, assigned_executive, priority, pipeline_stage, contact_attempts, quote_amount, quote_insurer, lost_reason, follow_up_date, follow_up_time, call_status, call_remarks, renewal_reminder_set, renewal_reminder_date, incentive_eligible, notes, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as Client[];
    },
  });

  // Counts using normalized stages
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PIPELINE_STAGES.forEach(s => { counts[s.value] = 0; });
    clients.forEach(c => {
      const stage = normalizeStage(c.pipeline_stage);
      if (counts[stage] !== undefined) counts[stage]++;
    });
    return counts;
  }, [clients]);

  const totalLeads = clients.length;
  const wonCount = stageCounts["won"] || 0;
  const policyCount = stageCounts["policy_issued"] || 0;
  const lostCount = stageCounts["lost"] || 0;
  const convRate = totalLeads > 0 ? (((wonCount + policyCount) / totalLeads) * 100).toFixed(1) : "0";

  // Filter using normalized stages
  const filtered = useMemo(() => {
    let result = selectedStage === "all" ? clients : clients.filter(c => normalizeStage(c.pipeline_stage) === selectedStage);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.customer_name?.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.vehicle_number?.toLowerCase().includes(s) ||
        c.city?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [clients, selectedStage, search]);

  const displayPhone = (phone: string | null) => (!phone || phone.startsWith("IB_")) ? null : phone;
  const getWhatsAppLink = (phone: string | null) => {
    if (!phone || phone.startsWith("IB_")) return null;
    const clean = phone.replace(/\D/g, "");
    return `https://wa.me/${clean.startsWith("91") ? clean : `91${clean}`}`;
  };

  // Move mutation
  const moveStage = useMutation({
    mutationFn: async ({ clientId, newStage, extras }: { clientId: string; newStage: string; extras?: Record<string, any> }) => {
      const update: any = { pipeline_stage: newStage, ...extras };
      if (newStage === "smart_calling") {
        const client = clients.find(c => c.id === clientId);
        update.contact_attempts = (client?.contact_attempts || 0) + 1;
        update.last_contacted_at = new Date().toISOString();
      }
      const { error } = await supabase.from("insurance_clients").update(update).eq("id", clientId);
      if (error) throw error;

      const stage = PIPELINE_STAGES.find(s => s.value === newStage);
      await supabase.from("insurance_activity_log").insert({
        client_id: clientId,
        activity_type: "stage_change",
        title: `Pipeline → ${stage?.label}`,
        description: extras?.lost_reason ? `Lost: ${extras.lost_reason}` : `Moved to ${stage?.label}`,
        metadata: { new_stage: newStage, ...extras } as any,
      });

      if (newStage === "won") {
        const { data: client } = await supabase.from("insurance_clients").select("*").eq("id", clientId).single();
        if (client) {
          const today = new Date();
          await supabase.from("insurance_policies").insert({
            client_id: clientId,
            policy_number: (client as any).current_policy_number || null,
            policy_type: (client as any).current_policy_type || "comprehensive",
            insurer: (client as any).current_insurer || (client as any).quote_insurer || "Unknown",
            premium_amount: (client as any).quote_amount || (client as any).current_premium || null,
            start_date: (client as any).policy_start_date || today.toISOString().split("T")[0],
            expiry_date: (client as any).policy_expiry_date || new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split("T")[0],
            status: "active",
            is_renewal: false,
            issued_date: today.toISOString().split("T")[0],
          });
          await supabase.from("insurance_clients").update({ is_active: true, lead_status: "won" }).eq("id", clientId);
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
      const stage = PIPELINE_STAGES.find(s => s.value === vars.newStage);
      if (vars.newStage === "won") {
        toast.success("🎉 Won! Policy created in Policy Book", { duration: 4000 });
      } else {
        toast.success(`Moved to ${stage?.label}`);
      }
      setSelectedClient(null);
      setShowLostDialog(false);
      setShowCallingDialog(false);
      setShowFollowUpDialog(false);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update"),
  });

  // Add Lead mutation
  const addLeadMutation = useMutation({
    mutationFn: async () => {
      if (!newLead.phone.trim()) throw new Error("Phone is required");
      if (!newLead.customer_name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("insurance_clients").insert({
        customer_name: newLead.customer_name.trim(),
        phone: newLead.phone.trim(),
        email: newLead.email.trim() || null,
        city: newLead.city.trim() || null,
        vehicle_number: newLead.vehicle_number.trim() || null,
        vehicle_make: newLead.vehicle_make.trim() || null,
        vehicle_model: newLead.vehicle_model.trim() || null,
        lead_source: newLead.lead_source || "Manual",
        notes: newLead.notes.trim() || null,
        pipeline_stage: "new_lead",
        lead_status: "new",
        priority: "medium",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("✅ New lead added!");
      queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
      setShowAddLead(false);
      setNewLead({ customer_name: "", phone: "", email: "", city: "", vehicle_number: "", vehicle_make: "", vehicle_model: "", lead_source: "Manual", notes: "" });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to add lead"),
  });

  const handleMove = useCallback((client: Client, targetStage: string) => {
    const currentStage = normalizeStage(client.pipeline_stage);
    if (currentStage === targetStage) return;

    if (targetStage === "lost") {
      setPendingMoveClient(client); setLostReason(""); setLostRemarks(""); setShowLostDialog(true);
    } else if (targetStage === "smart_calling") {
      setPendingMoveClient(client); setCallStatus(""); setCallRemarks(""); setShowCallingDialog(true);
    } else if (targetStage === "follow_up") {
      setPendingMoveClient(client); setFollowUpDate(undefined); setFollowUpTime("10:00"); setFollowUpRemarks(""); setShowFollowUpDialog(true);
    } else {
      moveStage.mutate({ clientId: client.id, newStage: targetStage });
    }
  }, [moveStage, clients]);

  const confirmLost = () => {
    if (!pendingMoveClient || !lostReason) { toast.error("Select a reason"); return; }
    moveStage.mutate({ clientId: pendingMoveClient.id, newStage: "lost", extras: { lost_reason: lostReason, notes: lostRemarks || undefined } });
  };

  const confirmCalling = () => {
    if (!pendingMoveClient || !callStatus) { toast.error("Select call status"); return; }
    if (!callRemarks.trim()) { toast.error("Add remarks"); return; }
    moveStage.mutate({ clientId: pendingMoveClient.id, newStage: "smart_calling", extras: { call_status: callStatus, call_remarks: callRemarks } });
  };

  const confirmFollowUp = () => {
    if (!pendingMoveClient || !followUpDate) { toast.error("Pick a date"); return; }
    moveStage.mutate({ clientId: pendingMoveClient.id, newStage: "follow_up", extras: { follow_up_date: format(followUpDate, "yyyy-MM-dd"), follow_up_time: followUpTime, notes: followUpRemarks || undefined } });
  };

  const setRenewalReminder = async () => {
    if (!selectedClient || !renewalDate) { toast.error("Pick a date"); return; }
    const { error } = await supabase.from("insurance_clients").update({
      renewal_reminder_set: true,
      renewal_reminder_date: format(renewalDate, "yyyy-MM-dd"),
      incentive_eligible: true,
      pipeline_stage: "policy_issued",
    }).eq("id", selectedClient.id);
    if (error) { toast.error("Failed"); return; }
    toast.success("✅ Renewal reminder set — incentive eligible!");
    queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
    setShowRenewalDialog(false);
    setSelectedClient(null);
  };

  // Drag handlers
  const handleDragStart = (client: Client) => setDraggingClient(client);
  const handleDragEnd = () => { setDraggingClient(null); setDragOverStage(null); };
  const handleDragOver = (e: React.DragEvent, stage: string) => { e.preventDefault(); setDragOverStage(stage); };
  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (draggingClient && normalizeStage(draggingClient.pipeline_stage) !== stage) {
      handleMove(draggingClient, stage);
    }
    setDragOverStage(null);
    setDraggingClient(null);
  };

  const getSourceColor = (src: string | null) => SOURCE_COLORS[src || ""] || "bg-muted text-muted-foreground border-border";

  return (
    <div className="space-y-5">
      {/* KPI Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 p-5 sm:p-6 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              Insurance Workspace
            </h2>
            <Button size="sm" onClick={() => setShowAddLead(true)} className="gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/20">
              <Plus className="h-4 w-4" /> Add Lead
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total Leads", value: totalLeads, icon: UserPlus, bgc: "bg-blue-500/20" },
              { label: "In Pipeline", value: totalLeads - wonCount - policyCount - lostCount, icon: Clock, bgc: "bg-orange-400/20" },
              { label: "Won", value: wonCount + policyCount, icon: CheckCircle2, bgc: "bg-emerald-400/20" },
              { label: "Lost", value: lostCount, icon: XCircle, bgc: "bg-slate-400/20" },
              { label: "Conversion", value: `${convRate}%`, icon: TrendingUp, bgc: "bg-violet-400/20" },
            ].map(kpi => (
              <div key={kpi.label} className={`${kpi.bgc} backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10`}>
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className="h-4 w-4 text-white/70" />
                  <span className="text-[10px] uppercase tracking-wider text-white/70">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stage Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Button size="sm" variant={selectedStage === "all" ? "default" : "outline"} onClick={() => setSelectedStage("all")} className="shrink-0 h-8 text-xs">
          All ({totalLeads})
        </Button>
        {PIPELINE_STAGES.map(stage => {
          const count = stageCounts[stage.value] || 0;
          const Icon = stage.icon;
          return (
            <Button
              key={stage.value}
              size="sm"
              variant={selectedStage === stage.value ? "default" : "outline"}
              onClick={() => setSelectedStage(stage.value)}
              onDragOver={(e) => handleDragOver(e, stage.value)}
              onDrop={(e) => handleDrop(e, stage.value)}
              className={cn(
                "shrink-0 h-8 text-xs gap-1.5",
                selectedStage !== stage.value && stage.text,
                dragOverStage === stage.value && "ring-2 ring-primary/40 scale-105"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {stage.label}
              {count > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1">{count}</Badge>}
            </Button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search name, phone, vehicle, city..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
      </div>

      {/* Lead Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map(client => {
            const normStage = normalizeStage(client.pipeline_stage);
            const stage = PIPELINE_STAGES.find(s => s.value === normStage) || PIPELINE_STAGES[0];
            const stageIdx = PIPELINE_STAGES.findIndex(s => s.value === stage.value);
            const phone = displayPhone(client.phone);
            const waLink = getWhatsAppLink(client.phone);
            const daysToExpiry = client.policy_expiry_date ? differenceInDays(new Date(client.policy_expiry_date), new Date()) : null;

            return (
              <motion.div
                key={client.id}
                layout
                draggable
                onDragStart={() => handleDragStart(client)}
                onDragEnd={handleDragEnd}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={cn("border hover:shadow-lg transition-all duration-300 group cursor-pointer hover:-translate-y-0.5 overflow-hidden", stage.border)}
                  onClick={() => setSelectedClient(client)}
                >
                  <div className={`h-1 bg-gradient-to-r ${stage.color}`} />
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm", stage.color)}>
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-sm leading-tight">{client.customer_name || "Unknown"}</p>
                          <p className="text-[11px] text-muted-foreground">{client.city || "—"} • {format(new Date(client.created_at), "dd MMM")}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {client.lead_source && (
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", getSourceColor(client.lead_source))}>
                            {client.lead_source}
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", stage.bg, stage.text, "border", stage.border)}>
                          {stage.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                      {phone && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" /> <span className="font-mono">{phone}</span>
                        </div>
                      )}
                      {client.vehicle_number && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Car className="h-3 w-3 shrink-0" /> <span className="font-mono font-medium">{client.vehicle_number}</span>
                        </div>
                      )}
                      {client.current_insurer && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Shield className="h-3 w-3 shrink-0" /> {client.current_insurer}
                        </div>
                      )}
                      {daysToExpiry !== null && (
                        <div className={cn("flex items-center gap-1.5 font-semibold", daysToExpiry <= 7 ? "text-red-600" : daysToExpiry <= 30 ? "text-orange-600" : "text-muted-foreground")}>
                          <Clock className="h-3 w-3 shrink-0" /> {daysToExpiry < 0 ? `Expired ${Math.abs(daysToExpiry)}d ago` : `${daysToExpiry}d to expiry`}
                        </div>
                      )}
                      {client.current_premium && (
                        <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                          <CreditCard className="h-3 w-3 shrink-0" /> Rs.{client.current_premium.toLocaleString("en-IN")}
                        </div>
                      )}
                      {client.call_status && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <PhoneCall className="h-3 w-3 shrink-0" /> {client.call_status}
                        </div>
                      )}
                    </div>

                    {/* Stage progress */}
                    <div className="flex gap-0.5">
                      {PIPELINE_STAGES.slice(0, 5).map((s, i) => (
                        <div key={s.value} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= stageIdx && stageIdx < 5 ? s.dot : "bg-muted")} />
                      ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-all duration-200 pt-1 border-t border-border/30" onClick={e => e.stopPropagation()}>
                      {phone && (
                        <>
                          <a href={`tel:${client.phone}`}>
                            <Button size="icon" variant="ghost" className="h-7 w-7"><PhoneCall className="h-3.5 w-3.5 text-primary" /></Button>
                          </a>
                          {waLink && (
                            <a href={waLink} target="_blank" rel="noopener noreferrer">
                              <Button size="icon" variant="ghost" className="h-7 w-7"><MessageSquare className="h-3.5 w-3.5 text-green-600" /></Button>
                            </a>
                          )}
                        </>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 ml-auto">
                            Move <ChevronRight className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {PIPELINE_STAGES.filter(s => s.value !== normStage).map(s => {
                            const SIcon = s.icon;
                            return (
                              <DropdownMenuItem key={s.value} onClick={() => handleMove(client, s.value)} className="gap-2 text-xs">
                                <SIcon className="h-3.5 w-3.5" /> {s.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-16 text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No leads found</p>
          <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setShowAddLead(true)}>
            <Plus className="h-3.5 w-3.5" /> Add First Lead
          </Button>
        </div>
      )}

      {/* ── CLIENT DETAIL DIALOG ── */}
      <Dialog open={!!selectedClient && !showLostDialog && !showCallingDialog && !showFollowUpDialog && !showQuoteModal && !showUploadPolicy && !showRenewalDialog} onOpenChange={(o) => { if (!o) setSelectedClient(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedClient && (() => {
            const normStage = normalizeStage(selectedClient.pipeline_stage);
            const stage = PIPELINE_STAGES.find(s => s.value === normStage) || PIPELINE_STAGES[0];
            const phone = displayPhone(selectedClient.phone);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center", stage.color)}>
                      <User className="h-4 w-4 text-white" />
                    </div>
                    {selectedClient.customer_name || "Unknown"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Badges */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={cn(stage.bg, stage.text, "border", stage.border)}>{stage.label}</Badge>
                    {selectedClient.lead_source && <Badge variant="outline" className={getSourceColor(selectedClient.lead_source)}>{selectedClient.lead_source}</Badge>}
                    {selectedClient.renewal_reminder_set && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">✅ Renewal Set</Badge>}
                    {selectedClient.incentive_eligible && <Badge className="bg-amber-100 text-amber-700 border-amber-200">⭐ Incentive Eligible</Badge>}
                  </div>

                  {/* Customer */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Mobile:</span> {phone || "—"}</div>
                      <div><span className="text-muted-foreground">Email:</span> {selectedClient.email || "—"}</div>
                      <div><span className="text-muted-foreground">City:</span> {selectedClient.city || "—"}</div>
                      <div><span className="text-muted-foreground">Attempts:</span> {selectedClient.contact_attempts || 0}</div>
                    </div>
                  </div>

                  {/* Vehicle */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Number:</span> {selectedClient.vehicle_number || "—"}</div>
                      <div><span className="text-muted-foreground">Model:</span> {[selectedClient.vehicle_make, selectedClient.vehicle_model].filter(Boolean).join(" ") || "—"}</div>
                      <div><span className="text-muted-foreground">Year:</span> {selectedClient.vehicle_year || "—"}</div>
                      <div><span className="text-muted-foreground">Insurer:</span> {selectedClient.current_insurer || "—"}</div>
                    </div>
                  </div>

                  {/* Activity */}
                  {(selectedClient.call_status || selectedClient.follow_up_date || selectedClient.lost_reason) && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {selectedClient.call_status && <div><span className="text-muted-foreground">Call:</span> {selectedClient.call_status}</div>}
                        {selectedClient.call_remarks && <div className="col-span-2"><span className="text-muted-foreground">Remarks:</span> {selectedClient.call_remarks}</div>}
                        {selectedClient.follow_up_date && <div><span className="text-muted-foreground">Follow-up:</span> {format(new Date(selectedClient.follow_up_date), "dd MMM yyyy")} {selectedClient.follow_up_time || ""}</div>}
                        {selectedClient.lost_reason && <div className="col-span-2"><span className="text-muted-foreground">Lost Reason:</span> {selectedClient.lost_reason}</div>}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</p>
                    <div className="flex flex-wrap gap-2">
                      {phone && (
                        <>
                          <a href={`tel:${selectedClient.phone}`}>
                            <Button size="sm" variant="outline" className="gap-1.5"><PhoneCall className="h-3.5 w-3.5" /> Call</Button>
                          </a>
                          <a href={getWhatsAppLink(selectedClient.phone) || "#"} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="gap-1.5 text-green-600 border-green-200"><MessageSquare className="h-3.5 w-3.5" /> WhatsApp</Button>
                          </a>
                        </>
                      )}
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowQuoteModal(true)}>
                        <FileText className="h-3.5 w-3.5" /> Generate Quote
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowUploadPolicy(true)}>
                        <Upload className="h-3.5 w-3.5" /> Upload Policy
                      </Button>
                      {(normStage === "won" || normStage === "policy_issued") && (
                        <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setRenewalDate(undefined); setShowRenewalDialog(true); }}>
                          <Bell className="h-3.5 w-3.5" /> Set Renewal Reminder
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Move to Stage */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Move to Stage</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PIPELINE_STAGES.filter(s => s.value !== normStage).map(s => {
                        const SIcon = s.icon;
                        return (
                          <Button key={s.value} size="sm" variant="outline" className={cn("text-xs gap-1", s.text, "border", s.border)}
                            onClick={() => handleMove(selectedClient, s.value)}>
                            <SIcon className="h-3 w-3" /> {s.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── ADD LEAD DIALOG ── */}
      <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Add New Lead</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input placeholder="Customer name" value={newLead.customer_name} onChange={e => setNewLead(p => ({ ...p, customer_name: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone *</Label>
                <Input placeholder="Mobile number" value={newLead.phone} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input placeholder="Email" value={newLead.email} onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">City</Label>
                <Input placeholder="City" value={newLead.city} onChange={e => setNewLead(p => ({ ...p, city: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Vehicle Number</Label>
                <Input placeholder="e.g. PB10AB1234" value={newLead.vehicle_number} onChange={e => setNewLead(p => ({ ...p, vehicle_number: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lead Source *</Label>
                <Select value={newLead.lead_source} onValueChange={v => setNewLead(p => ({ ...p, lead_source: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Vehicle Make</Label>
                <Input placeholder="e.g. Maruti" value={newLead.vehicle_make} onChange={e => setNewLead(p => ({ ...p, vehicle_make: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vehicle Model</Label>
                <Input placeholder="e.g. Swift" value={newLead.vehicle_model} onChange={e => setNewLead(p => ({ ...p, vehicle_model: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea placeholder="Any additional notes..." value={newLead.notes} onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))} className="h-16" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLead(false)}>Cancel</Button>
            <Button onClick={() => addLeadMutation.mutate()} disabled={addLeadMutation.isPending || !newLead.customer_name.trim() || !newLead.phone.trim()} className="gap-1.5">
              {addLeadMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── LOST DIALOG ── */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Why was this lead lost?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {LOST_REASONS.map(r => (
                <Button key={r} variant={lostReason === r ? "default" : "outline"} size="sm" onClick={() => setLostReason(r)}>{r}</Button>
              ))}
            </div>
            <Textarea placeholder="Additional remarks..." value={lostRemarks} onChange={e => setLostRemarks(e.target.value)} className="h-20" />
          </div>
          <DialogFooter>
            <Button onClick={confirmLost} disabled={!lostReason} className="bg-red-600 hover:bg-red-700 text-white">Mark as Lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── SMART CALLING DIALOG ── */}
      <Dialog open={showCallingDialog} onOpenChange={setShowCallingDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PhoneCall className="h-5 w-5 text-amber-600" /> Smart Calling</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {pendingMoveClient && displayPhone(pendingMoveClient.phone) && (
              <div className="flex gap-2">
                <a href={`tel:${pendingMoveClient.phone}`} className="flex-1">
                  <Button className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Phone className="h-4 w-4" /> Dial {displayPhone(pendingMoveClient.phone)}
                  </Button>
                </a>
                <a href={getWhatsAppLink(pendingMoveClient.phone) || "#"} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-1.5 text-green-600 border-green-200"><MessageSquare className="h-4 w-4" /></Button>
                </a>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Call Outcome *</Label>
              <Select value={callStatus} onValueChange={setCallStatus}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {CALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Remarks *</Label>
              <Textarea placeholder="Call notes..." value={callRemarks} onChange={e => setCallRemarks(e.target.value)} className="h-20" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmCalling} disabled={!callStatus || !callRemarks.trim()} className="bg-amber-600 hover:bg-amber-700 text-white">Save & Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── FOLLOW-UP DIALOG ── */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-orange-600" /> Schedule Follow-Up</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Follow-Up Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left h-9">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {followUpDate ? format(followUpDate, "dd MMM yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={followUpDate} onSelect={setFollowUpDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Time</Label>
              <Input type="time" value={followUpTime} onChange={e => setFollowUpTime(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Remarks</Label>
              <Textarea placeholder="Follow-up notes..." value={followUpRemarks} onChange={e => setFollowUpRemarks(e.target.value)} className="h-16" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmFollowUp} disabled={!followUpDate} className="bg-orange-600 hover:bg-orange-700 text-white">Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RENEWAL REMINDER DIALOG ── */}
      <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-emerald-600" /> Set Renewal Reminder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Set reminder date for next year's renewal. This marks the sale as incentive-eligible.</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left h-9">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {renewalDate ? format(renewalDate, "dd MMM yyyy") : "Pick renewal date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={renewalDate} onSelect={setRenewalDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button onClick={setRenewalReminder} disabled={!renewalDate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Set Reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QUOTE MODAL ── */}
      {showQuoteModal && selectedClient && (
        <InsuranceQuoteModal
          open={showQuoteModal}
          onOpenChange={(o) => { setShowQuoteModal(o); if (!o) setSelectedClient(null); }}
          client={{
            customer_name: selectedClient.customer_name || "Customer",
            phone: selectedClient.phone,
            email: selectedClient.email,
            city: selectedClient.city,
            vehicle_make: selectedClient.vehicle_make,
            vehicle_model: selectedClient.vehicle_model,
            vehicle_number: selectedClient.vehicle_number,
            vehicle_year: selectedClient.vehicle_year,
            current_insurer: selectedClient.current_insurer,
            current_policy_type: selectedClient.current_policy_type,
            ncb_percentage: selectedClient.ncb_percentage,
            current_premium: selectedClient.current_premium,
          }}
        />
      )}

      {/* ── UPLOAD POLICY ── */}
      <Dialog open={showUploadPolicy} onOpenChange={setShowUploadPolicy}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Upload Policy Document</DialogTitle></DialogHeader>
          <InsurancePolicyDocumentUploader defaultClientId={selectedClient?.id || undefined} onDone={() => { setShowUploadPolicy(false); queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] }); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
