import { useState, useMemo, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { SmartDatePicker } from "@/components/ui/smart-date-picker";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  UserPlus, Phone, FileText, Clock, CheckCircle2, XCircle, Search,
  PhoneCall, User, Shield, Send, MessageSquare, CalendarIcon, Bell, Plus,
  ChevronRight, Upload, RefreshCw
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import InsuranceQuoteModal from "./InsuranceQuoteModal";
import { InsurancePolicyDocumentUploader } from "./InsurancePolicyDocumentUploader";
import { useQuery } from "@tanstack/react-query";

// ── Types ──
export type Client = {
  id: string;
  customer_name: string;
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
  retarget_status: string | null;
  journey_last_event: string | null;
  journey_last_event_at: string | null;
  created_at: string;
};

export const PIPELINE_STAGES = [
  { value: "new_lead", label: "New Lead", icon: UserPlus, color: "from-blue-500 to-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  { value: "smart_calling", label: "Calling", icon: PhoneCall, color: "from-amber-500 to-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  { value: "quote_shared", label: "Quote Shared", icon: Send, color: "from-cyan-500 to-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30", border: "border-cyan-200 dark:border-cyan-800", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
  { value: "follow_up", label: "Follow-Up", icon: Clock, color: "from-orange-500 to-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  { value: "won", label: "Won", icon: CheckCircle2, color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  { value: "lost", label: "Lost", icon: XCircle, color: "from-slate-400 to-slate-500", bg: "bg-slate-50 dark:bg-slate-900/30", border: "border-slate-200 dark:border-slate-700", text: "text-slate-500 dark:text-slate-400", dot: "bg-slate-400" },
  { value: "policy_issued", label: "Policy Issued", icon: Shield, color: "from-emerald-600 to-emerald-800", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-600" },
];

const STAGE_MAP: Record<string, string> = {
  new_lead: "new_lead",
  new: "new_lead",
  contact_attempted: "smart_calling",
  requirement_collected: "smart_calling",
  smart_calling: "smart_calling",
  contacted: "smart_calling",
  in_process: "smart_calling",
  quote_shared: "quote_shared",
  follow_up: "follow_up",
  interested: "follow_up",
  hot_prospect: "follow_up",
  won: "won",
  converted: "won",
  policy_issued: "policy_issued",
  lost: "lost",
  not_interested: "lost",
};

export const normalizeStage = (stage: string | null, leadStatus?: string | null): string => {
  const normalizedStage = stage ? STAGE_MAP[stage] : undefined;
  if (normalizedStage) return normalizedStage;

  const normalizedLeadStatus = leadStatus ? STAGE_MAP[leadStatus] : undefined;
  if (normalizedLeadStatus) return normalizedLeadStatus;

  return "new_lead";
};

const CALL_STATUSES = ["Interested", "Not Interested", "Call Back", "No Answer", "Wrong Number"];
const LOST_REASONS = ["Too expensive", "Existing agent", "No response", "Not renewing", "Competitor offer", "Other"];
export const LEAD_SOURCES = ["Meta", "Google Ads", "Referral", "Walk-in", "WhatsApp Broadcast", "Website", "Manual", "Rollover"];

const SOURCE_COLORS: Record<string, string> = {
  Meta: "bg-blue-100 text-blue-700 border-blue-200",
  "Google Ads": "bg-red-100 text-red-700 border-red-200",
  Referral: "bg-purple-100 text-purple-700 border-purple-200",
  "Walk-in": "bg-green-100 text-green-700 border-green-200",
  "WhatsApp Broadcast": "bg-emerald-100 text-emerald-700 border-emerald-200",
  Website: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Manual: "bg-gray-100 text-gray-700 border-gray-200",
  Rollover: "bg-violet-100 text-violet-700 border-violet-200",
  rollover: "bg-violet-100 text-violet-700 border-violet-200",
  "CSV Import": "bg-violet-100 text-violet-700 border-violet-200",
  csv_import: "bg-violet-100 text-violet-700 border-violet-200",
};

export function formatSource(source: string | null, createdAt: string): string {
  if (!source) return "Unknown";
  const normalized = source.toLowerCase();
  const date = format(new Date(createdAt), "dd MMM yyyy");
  if (["csv_import", "csv import", "rollover", "rollover_data"].includes(normalized)) return `Rollover • ${date}`;
  if (source.startsWith("IB_") || normalized.includes("insurebook")) return `Rollover • ${date}`;
  return source;
}

const displayPhone = (phone: string | null) => (!phone || phone.startsWith("IB_")) ? null : phone;
const getSourceColor = (src: string | null) => SOURCE_COLORS[src || ""] || "bg-muted text-muted-foreground border-border";

// ── Journey Breadcrumb Component ──
function JourneyBreadcrumb({ clientId }: { clientId: string }) {
  const { data: events = [] } = useQuery({
    queryKey: ["ins-journey", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_activity_log")
        .select("activity_type, title, created_at")
        .eq("client_id", clientId)
        .eq("activity_type", "stage_change")
        .order("created_at", { ascending: true })
        .limit(6);
      return data || [];
    },
    staleTime: 30000,
  });

  if (events.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {events.map((ev, i) => {
        const label = (ev.title || "").replace("Pipeline → ", "");
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/50" />}
            <span className="text-[9px] text-muted-foreground">
              {label}
              <span className="text-[8px] ml-0.5 opacity-60">
                ({format(new Date(ev.created_at), "dd MMM")})
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

// ── Won Policy Dialog ──
function WonPolicyDialog({ 
  open, onOpenChange, client, onSuccess 
}: { 
  open: boolean; 
  onOpenChange: (o: boolean) => void; 
  client: Client | null;
  onSuccess: () => void;
}) {
  const [policyNumber, setPolicyNumber] = useState("");
  const [insurer, setInsurer] = useState("");
  const [premium, setPremium] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!client || !policyNumber.trim() || !insurer.trim() || !expiryDate) {
      toast.error("Fill all required fields");
      return;
    }
    setSaving(true);
    try {
      // Create policy
      await supabase.from("insurance_policies").insert({
        client_id: client.id,
        policy_number: policyNumber.trim().toUpperCase(),
        insurer: insurer.trim(),
        premium_amount: premium ? parseFloat(premium) : null,
        start_date: startDate ? format(startDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        expiry_date: format(expiryDate, "yyyy-MM-dd"),
        status: "active",
        is_renewal: false,
        issued_date: format(new Date(), "yyyy-MM-dd"),
        source_label: "Won (New)",
        renewal_count: 0,
        policy_type: client.current_policy_type || "comprehensive",
      } as any);

      // Update client
      await supabase.from("insurance_clients").update({
        pipeline_stage: "policy_issued",
        lead_status: "won",
        current_policy_number: policyNumber.trim().toUpperCase(),
        current_insurer: insurer.trim(),
        current_premium: premium ? parseFloat(premium) : null,
        policy_expiry_date: format(expiryDate, "yyyy-MM-dd"),
        policy_start_date: startDate ? format(startDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        renewal_reminder_set: true,
        renewal_reminder_date: format(expiryDate, "yyyy-MM-dd"),
        incentive_eligible: true,
      }).eq("id", client.id);

      // Log activity
      await supabase.from("insurance_activity_log").insert({
        client_id: client.id,
        activity_type: "stage_change",
        title: "Pipeline → Won",
        description: `Policy ${policyNumber} issued by ${insurer}`,
        metadata: { new_stage: "won", policy_number: policyNumber, insurer, premium } as any,
      });

      toast.success("🎉 Policy issued! Added to Policy Book");
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create policy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Won — Issue Policy
          </DialogTitle>
        </DialogHeader>
        {client && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong>{client.customer_name}</strong> • {client.vehicle_number || client.vehicle_make || ""}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Policy Number *</Label>
                <Input value={policyNumber} onChange={e => setPolicyNumber(e.target.value.toUpperCase())} placeholder="e.g. OG-23-1234-5678" className="h-9 text-sm font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Insurer *</Label>
                <Input value={insurer} onChange={e => setInsurer(e.target.value)} placeholder="e.g. ICICI Lombard" className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Premium (₹)</Label>
              <Input type="number" value={premium} onChange={e => setPremium(e.target.value)} placeholder="e.g. 12500" className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Start Date</Label>
                <SmartDatePicker date={startDate} onSelect={setStartDate} placeholder="Pick date" yearRange={[new Date().getFullYear() - 1, new Date().getFullYear() + 2]} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expiry Date *</Label>
                <SmartDatePicker date={expiryDate} onSelect={setExpiryDate} placeholder="Pick date" yearRange={[new Date().getFullYear(), new Date().getFullYear() + 3]} />
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !policyNumber.trim() || !insurer.trim() || !expiryDate} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Issue Policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface InsuranceLeadPipelineProps {
  clients: Client[];
  isLoading: boolean;
}

export function InsuranceLeadPipeline({ clients, isLoading }: InsuranceLeadPipelineProps) {
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [draggingClient, setDraggingClient] = useState<Client | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Dialogs
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [lostRemarks, setLostRemarks] = useState("");
  const [retargetNextYear, setRetargetNextYear] = useState(true);
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
  const [showWonDialog, setShowWonDialog] = useState(false);

  useEffect(() => {
    if (!selectedClient) {
      setEditFields({});
      return;
    }

    setEditFields({
      customer_name: selectedClient.customer_name || "",
      phone: displayPhone(selectedClient.phone) || "",
      email: selectedClient.email || "",
      city: selectedClient.city || "",
      vehicle_number: selectedClient.vehicle_number || "",
      vehicle_make: selectedClient.vehicle_make || "",
      vehicle_model: selectedClient.vehicle_model || "",
      vehicle_year: selectedClient.vehicle_year ? String(selectedClient.vehicle_year) : "",
      current_insurer: selectedClient.current_insurer || "",
      current_policy_number: selectedClient.current_policy_number || "",
      current_premium: selectedClient.current_premium ? String(selectedClient.current_premium) : "",
      notes: selectedClient.notes || "",
    });
  }, [selectedClient]);

  // Counts
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PIPELINE_STAGES.forEach(s => { counts[s.value] = 0; });
    clients.forEach(c => {
      const stage = normalizeStage(c.pipeline_stage, c.lead_status);
      if (counts[stage] !== undefined) counts[stage]++;
    });
    return counts;
  }, [clients]);

  // Filter
  const filtered = useMemo(() => {
    let result = selectedStage === "all"
      ? clients
      : selectedStage === "retarget"
        ? clients.filter(c => c.retarget_status === "scheduled")
        : clients.filter(c => normalizeStage(c.pipeline_stage, c.lead_status) === selectedStage);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.customer_name?.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.vehicle_number?.toLowerCase().includes(s) ||
        c.vehicle_make?.toLowerCase().includes(s) ||
        c.vehicle_model?.toLowerCase().includes(s) ||
        c.current_policy_number?.toLowerCase().includes(s) ||
        c.current_insurer?.toLowerCase().includes(s) ||
        c.city?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [clients, selectedStage, search]);

  const retargetCount = useMemo(() => clients.filter(c => c.retarget_status === "scheduled").length, [clients]);

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
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
      const stage = PIPELINE_STAGES.find(s => s.value === vars.newStage);
      toast.success(`Moved to ${stage?.label}`);

      // Auto-prompt next action
      const movedClient = clients.find(c => c.id === vars.clientId);
      if (movedClient) {
        const nextClient = { ...movedClient, pipeline_stage: vars.newStage };
        setTimeout(() => {
          if (vars.newStage === "smart_calling") {
            setSelectedClient(nextClient as Client);
          } else if (vars.newStage === "quote_shared") {
            setPendingMoveClient(nextClient as Client);
            setFollowUpDate(undefined);
            setFollowUpTime("10:00");
            setFollowUpRemarks("");
            setShowFollowUpDialog(true);
          } else {
            setSelectedClient(null);
          }
        }, 400);
      }
      setShowLostDialog(false);
      setShowCallingDialog(false);
      setShowFollowUpDialog(false);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update"),
  });

  const handleMove = useCallback((client: Client, targetStage: string) => {
    const currentStage = normalizeStage(client.pipeline_stage, client.lead_status);
    if (currentStage === targetStage) return;
    if (targetStage === "won") {
      setPendingMoveClient(client);
      setShowWonDialog(true);
      return;
    }
    if (targetStage === "lost") {
      setPendingMoveClient(client);
      setLostReason("");
      setLostRemarks("");
      setRetargetNextYear(true);
      setShowLostDialog(true);
    } else if (targetStage === "smart_calling") {
      setPendingMoveClient(client);
      setCallStatus("");
      setCallRemarks("");
      setShowCallingDialog(true);
    } else if (targetStage === "follow_up") {
      setPendingMoveClient(client);
      setFollowUpDate(undefined);
      setFollowUpTime("10:00");
      setFollowUpRemarks("");
      setShowFollowUpDialog(true);
    } else {
      moveStage.mutate({ clientId: client.id, newStage: targetStage });
    }
  }, [moveStage, clients]);

  const confirmLost = () => {
    if (!pendingMoveClient || !lostReason) { toast.error("Select a reason"); return; }
    moveStage.mutate({
      clientId: pendingMoveClient.id,
      newStage: "lost",
      extras: {
        lost_reason: lostReason,
        notes: lostRemarks || undefined,
        retarget_status: retargetNextYear ? "scheduled" : null,
      },
    });
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

  // Drag handlers
  const handleDragStart = (client: Client) => setDraggingClient(client);
  const handleDragEnd = () => { setDraggingClient(null); setDragOverStage(null); };
  const handleDragOver = (e: React.DragEvent, stage: string) => { e.preventDefault(); setDragOverStage(stage); };
  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (draggingClient && normalizeStage(draggingClient.pipeline_stage, draggingClient.lead_status) !== stage) handleMove(draggingClient, stage);
    setDragOverStage(null);
    setDraggingClient(null);
  };

  return (
    <>
      {/* Stage Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Button size="sm" variant={selectedStage === "all" ? "default" : "outline"} onClick={() => setSelectedStage("all")} className="shrink-0 h-8 text-xs">
          All ({clients.length})
        </Button>
        {PIPELINE_STAGES.map(stage => {
          const count = stageCounts[stage.value] || 0;
          const Icon = stage.icon;
          return (
            <Button key={stage.value} size="sm" variant={selectedStage === stage.value ? "default" : "outline"}
              onClick={() => setSelectedStage(stage.value)}
              onDragOver={(e) => handleDragOver(e, stage.value)}
              onDrop={(e) => handleDrop(e, stage.value)}
              className={cn("shrink-0 h-8 text-xs gap-1", selectedStage !== stage.value && stage.text, dragOverStage === stage.value && "ring-2 ring-primary/40 scale-105")}>
              <Icon className="h-3.5 w-3.5" />
              {stage.label}
              {count > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">{count}</Badge>}
            </Button>
          );
        })}
        {retargetCount > 0 && (
          <Button size="sm" variant={selectedStage === "retarget" ? "default" : "outline"}
            onClick={() => setSelectedStage("retarget")}
            className="shrink-0 h-8 text-xs gap-1 text-violet-700 dark:text-violet-300">
            <RefreshCw className="h-3.5 w-3.5" /> Retarget ({retargetCount})
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search name, phone, vehicle, city, policy no..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
      </div>

      {/* Lead Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[10px] font-bold uppercase w-8">#</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Customer</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Phone</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Vehicle</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Insurer</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Stage</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Source</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Lead Time</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Expiry</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Follow-Up</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase w-36">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No leads found</p>
                  </TableCell></TableRow>
                ) : filtered.map((client, idx) => {
                  const normStage = normalizeStage(client.pipeline_stage, client.lead_status);
                  const stage = PIPELINE_STAGES.find(s => s.value === normStage) || PIPELINE_STAGES[0];
                  const phone = displayPhone(client.phone);
                  const daysToExpiry = client.policy_expiry_date ? differenceInDays(new Date(client.policy_expiry_date), new Date()) : null;

                  return (
                    <TableRow key={client.id} draggable onDragStart={() => handleDragStart(client)} onDragEnd={handleDragEnd}
                      className="cursor-pointer text-xs hover:bg-muted/30 transition-colors" onClick={() => setSelectedClient(client)}>
                      <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0", stage.color)}>
                            <User className="h-3 w-3 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs leading-tight truncate">{client.customer_name || "Unknown"}</p>
                            <p className="text-[10px] text-muted-foreground">{client.city || "—"}</p>
                            <JourneyBreadcrumb clientId={client.id} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{phone || "—"}</TableCell>
                      <TableCell>
                        <div>
                          {client.vehicle_number && <p className="font-mono font-semibold text-xs">{client.vehicle_number}</p>}
                          <p className="text-[10px] text-muted-foreground">{[client.vehicle_make, client.vehicle_model].filter(Boolean).join(" ") || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{client.current_insurer || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="outline" className={cn("text-[9px] px-1.5", stage.bg, stage.text, "border", stage.border)}>
                            {stage.label}
                          </Badge>
                          {client.retarget_status === "scheduled" && (
                            <Badge variant="outline" className="text-[8px] px-1 bg-violet-50 text-violet-600 border-violet-200">🔄 Retarget</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[9px]", getSourceColor(client.lead_source))}>
                          {formatSource(client.lead_source, client.created_at)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.policy_expiry_date ? (
                          <div>
                            <span className={cn("text-xs font-semibold",
                              daysToExpiry !== null && daysToExpiry < 0 ? "text-red-600" : daysToExpiry !== null && daysToExpiry <= 7 ? "text-red-600" : daysToExpiry !== null && daysToExpiry <= 30 ? "text-orange-600" : "text-muted-foreground"
                            )}>
                              {daysToExpiry !== null ? (daysToExpiry < 0 ? `Exp ${Math.abs(daysToExpiry)}d` : `${daysToExpiry}d`) : "—"}
                            </span>
                            <p className="text-[9px] text-muted-foreground">{format(new Date(client.policy_expiry_date), "dd MMM yy")}</p>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-[10px]">
                        {client.follow_up_date ? (
                          <span className={cn("font-medium", differenceInDays(new Date(client.follow_up_date), new Date()) < 0 ? "text-red-600" : "text-orange-600")}>
                            {format(new Date(client.follow_up_date), "dd MMM")}
                            {client.follow_up_time ? ` ${client.follow_up_time}` : ""}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex gap-0.5 items-center flex-wrap">
                          {phone && (
                            <>
                              <a href={`tel:${client.phone}`}><Button variant="ghost" size="icon" className="h-6 w-6"><PhoneCall className="h-3 w-3 text-primary" /></Button></a>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                const clean = client.phone.replace(/\D/g, "");
                                window.open(`https://wa.me/${clean.startsWith("91") ? clean : `91${clean}`}`, "_blank");
                              }}><MessageSquare className="h-3 w-3 text-green-600" /></Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 px-1.5 text-emerald-600 border-emerald-200" onClick={() => { setSelectedClient(client); setShowQuoteModal(true); }}>
                            <FileText className="h-2.5 w-2.5" /> Quote
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 px-1.5">Move <ChevronRight className="h-2.5 w-2.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {PIPELINE_STAGES.filter(s => s.value !== normStage).map(s => {
                                const SIcon = s.icon;
                                return (
                                  <DropdownMenuItem key={s.value} onClick={() => handleMove(client, s.value)} className="gap-2 text-xs">
                                    <SIcon className="h-3 w-3" /> {s.label}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground bg-muted/20">
              <span>Showing {filtered.length} leads</span>
              <span>{stageCounts["won"] + stageCounts["policy_issued"]} won • {stageCounts["lost"]} lost</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── CLIENT DETAIL DIALOG ── */}
      <Dialog open={!!selectedClient && !showLostDialog && !showCallingDialog && !showFollowUpDialog && !showQuoteModal && !showUploadPolicy && !showWonDialog} onOpenChange={(o) => { if (!o) setSelectedClient(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedClient && (() => {
            const normStage = normalizeStage(selectedClient.pipeline_stage, selectedClient.lead_status);
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
                  {/* Journey Breadcrumb */}
                  <div className="p-2 bg-muted/30 rounded-lg border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Journey</p>
                    <JourneyBreadcrumb clientId={selectedClient.id} />
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={cn(stage.bg, stage.text, "border", stage.border)}>{stage.label}</Badge>
                    <Badge variant="outline" className={getSourceColor(selectedClient.lead_source)}>
                      {formatSource(selectedClient.lead_source, selectedClient.created_at)}
                    </Badge>
                    {selectedClient.retarget_status === "scheduled" && (
                      <Badge className="bg-violet-100 text-violet-700 border-violet-200">🔄 Retarget Next Year</Badge>
                    )}
                    {selectedClient.incentive_eligible && <Badge className="bg-amber-100 text-amber-700 border-amber-200">⭐ Incentive</Badge>}
                  </div>

                  {/* Editable Lead Details */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Lead Details</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Name</Label>
                        <Input value={editFields.customer_name || ""} onChange={e => setEditFields(f => ({ ...f, customer_name: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Mobile</Label>
                        <Input value={editFields.phone || ""} onChange={e => setEditFields(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Email</Label>
                        <Input value={editFields.email || ""} onChange={e => setEditFields(f => ({ ...f, email: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">City</Label>
                        <Input value={editFields.city || ""} onChange={e => setEditFields(f => ({ ...f, city: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Vehicle Number</Label>
                        <Input value={editFields.vehicle_number || ""} onChange={e => setEditFields(f => ({ ...f, vehicle_number: e.target.value.replace(/[^A-Z0-9]/gi, "").toUpperCase() }))} className="h-8 text-sm font-mono uppercase" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Vehicle Make</Label>
                        <Input value={editFields.vehicle_make || ""} onChange={e => setEditFields(f => ({ ...f, vehicle_make: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Vehicle Model</Label>
                        <Input value={editFields.vehicle_model || ""} onChange={e => setEditFields(f => ({ ...f, vehicle_model: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Vehicle Year</Label>
                        <Input type="number" value={editFields.vehicle_year || ""} onChange={e => setEditFields(f => ({ ...f, vehicle_year: e.target.value.replace(/\D/g, "").slice(0, 4) }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Insurer</Label>
                        <Input value={editFields.current_insurer || ""} onChange={e => setEditFields(f => ({ ...f, current_insurer: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Policy No</Label>
                        <Input value={editFields.current_policy_number || ""} onChange={e => setEditFields(f => ({ ...f, current_policy_number: e.target.value.toUpperCase() }))} className="h-8 text-sm font-mono uppercase" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Premium</Label>
                        <Input type="number" value={editFields.current_premium || ""} onChange={e => setEditFields(f => ({ ...f, current_premium: e.target.value.replace(/[^\d.]/g, "") }))} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Notes</Label>
                      <Textarea value={editFields.notes || ""} onChange={e => setEditFields(f => ({ ...f, notes: e.target.value }))} className="min-h-20 text-sm" />
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={savingEdit}
                      onClick={async () => {
                        if (!selectedClient) return;
                        setSavingEdit(true);
                        try {
                          const updates: Record<string, any> = {
                            customer_name: editFields.customer_name?.trim() || null,
                            phone: editFields.phone || selectedClient.phone,
                            email: editFields.email?.trim() || null,
                            city: editFields.city?.trim() || null,
                            vehicle_number: editFields.vehicle_number?.trim() || null,
                            vehicle_make: editFields.vehicle_make?.trim() || null,
                            vehicle_model: editFields.vehicle_model?.trim() || null,
                            vehicle_year: editFields.vehicle_year ? Number(editFields.vehicle_year) : null,
                            current_insurer: editFields.current_insurer?.trim() || null,
                            current_policy_number: editFields.current_policy_number?.trim() || null,
                            current_premium: editFields.current_premium ? Number(editFields.current_premium) : null,
                            notes: editFields.notes?.trim() || null,
                          };

                          const { data, error } = await supabase
                            .from("insurance_clients")
                            .update(updates)
                            .eq("id", selectedClient.id)
                            .select("id, customer_name, phone, email, city, vehicle_number, vehicle_make, vehicle_model, vehicle_year, current_insurer, current_policy_type, current_premium, ncb_percentage, previous_claim, policy_expiry_date, policy_start_date, current_policy_number, lead_source, lead_status, assigned_executive, priority, pipeline_stage, contact_attempts, quote_amount, quote_insurer, lost_reason, follow_up_date, follow_up_time, call_status, call_remarks, renewal_reminder_set, renewal_reminder_date, incentive_eligible, notes, retarget_status, journey_last_event, journey_last_event_at, created_at")
                            .maybeSingle();
                          if (error) throw error;

                          const refreshedClient = (data || { ...selectedClient, ...updates }) as Client;
                          setSelectedClient(refreshedClient);
                          queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
                          toast.success("Lead updated");
                        } catch (e: any) {
                          toast.error(e.message || "Failed to save");
                        } finally {
                          setSavingEdit(false);
                        }
                      }}
                    >
                      {savingEdit ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {phone && (
                      <>
                        <a href={`tel:${selectedClient.phone}`}><Button size="sm" variant="outline" className="gap-1.5"><PhoneCall className="h-3.5 w-3.5" /> Call</Button></a>
                        <Button size="sm" variant="outline" className="gap-1.5 text-green-600 border-green-200" onClick={() => {
                          const clean = selectedClient.phone.replace(/\D/g, "");
                          window.open(`https://wa.me/${clean.startsWith("91") ? clean : `91${clean}`}`, "_blank");
                        }}><MessageSquare className="h-3.5 w-3.5" /> WhatsApp</Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowQuoteModal(true)}><FileText className="h-3.5 w-3.5" /> Quote</Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowUploadPolicy(true)}><Upload className="h-3.5 w-3.5" /> Upload Policy</Button>
                  </div>

                  {/* Move to Stage */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Move to Stage</p>
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

      {/* ── WON POLICY DIALOG ── */}
      <WonPolicyDialog
        open={showWonDialog}
        onOpenChange={setShowWonDialog}
        client={pendingMoveClient}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
          queryClient.invalidateQueries({ queryKey: ["ins-policies-book"] });
          setShowWonDialog(false);
          setSelectedClient(null);
        }}
      />

      {/* ── LOST DIALOG with Retarget Toggle ── */}
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
            <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-950/20 rounded-lg border border-violet-200 dark:border-violet-800">
              <div>
                <p className="text-sm font-medium">🔄 Retarget Next Year?</p>
                <p className="text-[10px] text-muted-foreground">Auto-follow up when their policy is due next year</p>
              </div>
              <Switch checked={retargetNextYear} onCheckedChange={setRetargetNextYear} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmLost} disabled={!lostReason} className="bg-red-600 hover:bg-red-700 text-white">Mark as Lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CALLING DIALOG ── */}
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
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Call Outcome *</Label>
              <Select value={callStatus} onValueChange={setCallStatus}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>{CALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
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
              <SmartDatePicker date={followUpDate} onSelect={setFollowUpDate} placeholder="Pick a date" yearRange={[new Date().getFullYear(), new Date().getFullYear() + 2]} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Time</Label>
              <Input type="time" value={followUpTime} onChange={e => setFollowUpTime(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea placeholder="Follow-up notes..." value={followUpRemarks} onChange={e => setFollowUpRemarks(e.target.value)} className="h-16" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmFollowUp} disabled={!followUpDate} className="bg-orange-600 hover:bg-orange-700 text-white">Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote Modal */}
      {showQuoteModal && selectedClient && (
        <InsuranceQuoteModal open={showQuoteModal} onOpenChange={setShowQuoteModal} client={selectedClient} />
      )}

      {/* Upload Policy */}
      {showUploadPolicy && selectedClient && (
        <Dialog open={showUploadPolicy} onOpenChange={setShowUploadPolicy}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Upload Policy Document</DialogTitle></DialogHeader>
            <InsurancePolicyDocumentUploader defaultClientId={selectedClient.id} onDone={() => setShowUploadPolicy(false)} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
