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
import { getClientIdentityKey, normalizePolicyNumber } from "@/lib/insuranceIdentity";
import {
  CALL_STATUSES,
  getInsuranceStageDefinition,
  INSURANCE_ALL_STAGES,
  INSURANCE_VISIBLE_PIPELINE_STAGES,
  LEAD_SOURCES,
  LOST_REASONS,
  normalizeInsuranceStage,
  type InsuranceStage,
} from "@/lib/insuranceStages";
import {
  differenceInDays,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  formatDistanceToNow,
  isValid,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  UserPlus, Phone, FileText, Clock, CheckCircle2, XCircle, Search,
  PhoneCall, User, Shield, Send, MessageSquare, CalendarIcon, Bell, Plus,
  ChevronRight, Upload, RefreshCw, Target, Filter, X
} from "lucide-react";
import { addDays, subDays as subDaysFn, isBefore, isAfter } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LeadForwardDialog, ForwardedBadge } from "../shared/LeadForwardDialog";
import InsuranceQuoteModal from "./InsuranceQuoteModal";
import { InsurancePolicyDocumentUploader } from "./InsurancePolicyDocumentUploader";
import { ClientQuoteHistory } from "./ClientQuoteHistory";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";

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
  picked_up_by: string | null;
  picked_up_at: string | null;
  booking_date: string | null;
  booked_by: string | null;
  overdue_reason: string | null;
  overdue_custom_reason: string | null;
  overdue_marked_at: string | null;
  duplicate_count: number | null;
  is_duplicate: boolean | null;
  updated_at: string;
  created_at: string;
};

type StagePresentation = {
  icon: typeof UserPlus;
  color: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
};

const STAGE_PRESENTATION: Record<InsuranceStage, StagePresentation> = {
  new_lead: { icon: UserPlus, color: "from-blue-500 to-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  smart_calling: { icon: PhoneCall, color: "from-amber-500 to-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  quote_shared: { icon: Send, color: "from-cyan-500 to-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30", border: "border-cyan-200 dark:border-cyan-800", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
  follow_up: { icon: Clock, color: "from-orange-500 to-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  won: { icon: CheckCircle2, color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  policy_issued: { icon: Shield, color: "from-emerald-600 to-emerald-800", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-600" },
  lost: { icon: XCircle, color: "from-slate-400 to-slate-500", bg: "bg-slate-50 dark:bg-slate-900/30", border: "border-slate-200 dark:border-slate-700", text: "text-slate-500 dark:text-slate-400", dot: "bg-slate-400" },
};

const buildStageViewModel = (value: InsuranceStage) => ({
  value,
  label: getInsuranceStageDefinition(value).label,
  ...STAGE_PRESENTATION[value],
});

export const PIPELINE_STAGES = INSURANCE_VISIBLE_PIPELINE_STAGES.map(buildStageViewModel);
const ALL_STAGES = INSURANCE_ALL_STAGES.map(buildStageViewModel);

export const normalizeStage = (
  stage: string | null,
  leadStatus?: string | null,
  _client?: Pick<Client, "current_policy_number"> | null,
) => normalizeInsuranceStage(stage, leadStatus);

export { LEAD_SOURCES };

const normalizeLeadSourceLabel = (source: string | null): string => {
  if (!source) return "Unknown";
  const normalized = source.toLowerCase().trim();

  if (
    normalized.includes("insurebook") ||
    normalized.includes("rollover") ||
    normalized.includes("csv_import") ||
    normalized.includes("csv import") ||
    source.startsWith("IB_")
  ) {
    return "Rollover";
  }

  if (normalized.includes("whatsapp")) return "WhatsApp Lead";
  if (normalized.includes("walk")) return "Walk-in Lead";
  if (normalized.includes("google")) return "Google Lead";
  if (normalized.includes("meta") || normalized.includes("facebook") || normalized.includes("instagram")) return "Meta Lead";
  if (normalized.includes("website") || normalized.includes("hero") || normalized.includes("form")) return "Website Lead";
  if (normalized.includes("referral")) return "Referral";
  if (normalized.includes("manual")) return "Manual";

  return source.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const SOURCE_COLORS: Record<string, string> = {
  "Meta Lead": "bg-blue-100 text-blue-700 border-blue-200",
  "Google Lead": "bg-red-100 text-red-700 border-red-200",
  Referral: "bg-purple-100 text-purple-700 border-purple-200",
  "Walk-in Lead": "bg-green-100 text-green-700 border-green-200",
  "WhatsApp Lead": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Website Lead": "bg-indigo-100 text-indigo-700 border-indigo-200",
  Manual: "bg-gray-100 text-gray-700 border-gray-200",
  Rollover: "bg-violet-100 text-violet-700 border-violet-200",
};

export function formatSource(source: string | null, createdAt: string): string {
  const label = normalizeLeadSourceLabel(source);
  if (label === "Unknown") return label;
  if (label === "Rollover") {
    const date = formatDateValue(createdAt, "dd MMM yyyy", null);
    if (!date) return label;
    return `Rollover • ${date}`;
  }
  return label;
}

const displayPhone = (phone: string | null) => (!phone || phone.startsWith("IB_")) ? null : phone;
const isLegacyClientId = (id: string) => id.startsWith("legacy-");
const getSourceColor = (src: string | null) => SOURCE_COLORS[normalizeLeadSourceLabel(src)] || "bg-muted text-muted-foreground border-border";
const ACTIVE_PIPELINE_VALUES = new Set<InsuranceStage>(["new_lead", "smart_calling", "quote_shared", "follow_up"]);

const parseDateValue = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return isValid(date) ? date : null;
};

const getSafeTimestamp = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    const date = parseDateValue(value);
    if (date) return date.getTime();
  }
  return 0;
};

const formatDateValue = (value: string | null | undefined, pattern: string, fallback: string | null = "—") => {
  const date = parseDateValue(value);
  return date ? format(date, pattern) : fallback;
};

const formatRelativeDateValue = (value: string | null | undefined, fallback = "—") => {
  const date = parseDateValue(value);
  return date ? formatDistanceToNow(date, { addSuffix: true }) : fallback;
};

const getPipelineClientScore = (client: Client) => {
  const normalizedStage = normalizeStage(client.pipeline_stage, client.lead_status, client);
  let score = getSafeTimestamp(client.updated_at, client.created_at) / 1e13;

  if (ACTIVE_PIPELINE_VALUES.has(normalizedStage)) score += 200;
  if (normalizedStage === "quote_shared") score += 40;
  if (normalizedStage === "follow_up") score += 30;
  if (normalizedStage === "smart_calling") score += 20;
  if (normalizedStage === "won") score += 80;
  if (normalizedStage === "lost") score -= 30;
  if (client.journey_last_event === "quote_shared") score += 20;
  if (client.quote_amount || client.current_premium) score += 5;

  return score;
};

// ── Journey Breadcrumb Component ──
const JourneyBreadcrumb = ({ clientId }: { clientId: string }) => {
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
                ({formatDateValue(ev.created_at, "dd MMM")})
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
};

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
  const [saving, setSaving] = useState(false);

  const buildExpiryDate = (start: Date) => {
    const next = new Date(start);
    next.setFullYear(next.getFullYear() + 1);
    next.setHours(0, 0, 0, 0);
    next.setDate(next.getDate() - 1);
    return next;
  };

  const expiryDate = useMemo(() => (startDate ? buildExpiryDate(startDate) : undefined), [startDate]);

  useEffect(() => {
    if (!open || !client) return;

    const startBase = parseDateValue(client.policy_start_date)
      || parseDateValue(client.booking_date)
      || new Date();

    // Don't pre-fill old policy number — user must enter the NEW policy number
    setPolicyNumber("");
    setInsurer(client.current_insurer || client.quote_insurer || "");
    setPremium(client.current_premium ? String(client.current_premium) : client.quote_amount ? String(client.quote_amount) : "");
    setStartDate(startBase);
  }, [open, client]);

  const handleSave = async () => {
    if (!client || !policyNumber.trim() || !insurer.trim() || !startDate || !expiryDate) {
      toast.error("Fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const nextPolicyNumber = normalizePolicyNumber(policyNumber);
      const nextStartDate = format(startDate, "yyyy-MM-dd");
      const nextExpiryDate = format(expiryDate, "yyyy-MM-dd");
      const nextBookingDate = nextStartDate;

      const { data: existingPolicyByNumber } = await supabase
        .from("insurance_policies")
        .select("id, client_id, policy_number")
        .eq("policy_number", nextPolicyNumber)
        .eq("status", "active")
        .neq("client_id", client.id)
        .limit(1);

      if (existingPolicyByNumber && existingPolicyByNumber.length > 0) {
        toast.error("This policy number already exists for another client");
        return;
      }

      // Check by vehicle registration number across ALL clients for renewal detection
      let hasExistingVehiclePolicy = false;
      const vehicleNumber = client.vehicle_number?.trim();
      if (vehicleNumber) {
        const normalizedVehicle = vehicleNumber.replace(/\s+/g, '').toUpperCase();
        // Find any active policies for this vehicle across all clients
        const { data: vehiclePolicies } = await supabase
          .from("insurance_policies")
          .select("id, client_id, insurance_clients!inner(vehicle_number)")
          .eq("status", "active")
          .neq("client_id", client.id);

        const matchingVehiclePolicies = (vehiclePolicies || []).filter((p: any) => {
          const vn = p.insurance_clients?.vehicle_number?.replace(/\s+/g, '').toUpperCase();
          return vn === normalizedVehicle;
        });

        if (matchingVehiclePolicies.length > 0) {
          hasExistingVehiclePolicy = true;
          // Mark other clients' active policies for this vehicle as renewed
          await supabase
            .from("insurance_policies")
            .update({ status: "renewed", renewal_status: "renewed" })
            .in("id", matchingVehiclePolicies.map((p: any) => p.id));
        }
      }

      // Also check current client's active policies
      const { data: activePolicies, error: activePoliciesError } = await supabase
        .from("insurance_policies")
        .select("id, renewal_count, policy_number")
        .eq("client_id", client.id)
        .eq("status", "active")
        .order("updated_at", { ascending: false });

      if (activePoliciesError) throw activePoliciesError;

      const hasOwnActivePolicies = (activePolicies || []).length > 0;
      const isRenewal = hasExistingVehiclePolicy || hasOwnActivePolicies;
      const previousPolicy = activePolicies?.[0] || null;

      // Mark all current client's active policies as renewed
      if (activePolicies && activePolicies.length > 0) {
        await supabase
          .from("insurance_policies")
          .update({ status: "renewed", renewal_status: "renewed" })
          .in("id", activePolicies.map((p) => p.id));
      }

      // Always INSERT a new policy (never update old one with new data)
      const policyPayload = {
        client_id: client.id,
        policy_number: nextPolicyNumber,
        insurer: insurer.trim(),
        premium_amount: premium ? parseFloat(premium) : null,
        start_date: nextStartDate,
        expiry_date: nextExpiryDate,
        booking_date: nextBookingDate,
        status: "active",
        is_renewal: isRenewal,
        previous_policy_id: previousPolicy?.id || null,
        issued_date: nextBookingDate,
        source_label: isRenewal ? "Won (Renewal)" : "Won (New)",
        renewal_count: previousPolicy ? (previousPolicy.renewal_count || 0) + 1 : 0,
        policy_type: client.current_policy_type || "comprehensive",
      } as any;

      const { error: savePolicyError } = await supabase.from("insurance_policies").insert(policyPayload);

      if (savePolicyError) throw savePolicyError;

      const { error: clientUpdateError } = await supabase.from("insurance_clients").update({
        pipeline_stage: "policy_issued",
        lead_status: "won",
        booking_date: nextBookingDate,
        current_policy_number: nextPolicyNumber,
        current_insurer: insurer.trim(),
        current_premium: premium ? parseFloat(premium) : null,
        policy_expiry_date: nextExpiryDate,
        policy_start_date: nextStartDate,
        renewal_reminder_set: true,
        renewal_reminder_date: nextExpiryDate,
        incentive_eligible: true,
        retarget_status: "none",
        retargeting_enabled: false,
        journey_last_event: isRenewal ? "renewal_policy_issued" : "policy_issued",
        journey_last_event_at: new Date().toISOString(),
      } as any).eq("id", client.id);

      if (clientUpdateError) throw clientUpdateError;

      await supabase.from("insurance_activity_log").insert({
        client_id: client.id,
        activity_type: "stage_change",
        title: previousPolicy ? "Pipeline → Won (Renewal)" : "Pipeline → Won",
        description: `Policy ${nextPolicyNumber} issued by ${insurer.trim()}`,
        metadata: {
          new_stage: "policy_issued",
          policy_number: nextPolicyNumber,
          insurer: insurer.trim(),
          premium,
          start_date: nextStartDate,
          expiry_date: nextExpiryDate,
          previous_policy_id: previousPolicy?.id || null,
        } as any,
      });

      toast.success("Policy issued! Now upload the policy document.", { duration: 5000 });
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
                <Label className="text-xs">Start Date *</Label>
                <SmartDatePicker date={startDate} onSelect={setStartDate} placeholder="Pick start date" yearRange={[new Date().getFullYear() - 1, new Date().getFullYear() + 2]} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expiry Date</Label>
                <Input value={expiryDate ? format(expiryDate, "dd MMM yyyy") : ""} readOnly className="h-9 text-sm bg-muted/40" />
                <p className="text-[10px] text-muted-foreground">Auto-set to one day before same date next year</p>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !policyNumber.trim() || !insurer.trim() || !startDate} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
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
  const [showFilters, setShowFilters] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [expiryPreset, setExpiryPreset] = useState("all");
  const [expiryFrom, setExpiryFrom] = useState<Date | undefined>();
  const [expiryTo, setExpiryTo] = useState<Date | undefined>();
  const [executiveFilter, setExecutiveFilter] = useState("all");
  const [wonDatePreset, setWonDatePreset] = useState<string>("all");
  const [wonDateFrom, setWonDateFrom] = useState<Date | undefined>();
  const [wonDateTo, setWonDateTo] = useState<Date | undefined>();
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
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [forwardClient, setForwardClient] = useState<Client | null>(null);

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
      policy_expiry_date: selectedClient.policy_expiry_date || "",
      follow_up_date: selectedClient.follow_up_date || "",
      follow_up_time: selectedClient.follow_up_time || "",
      pipeline_stage: normalizeStage(selectedClient.pipeline_stage, selectedClient.lead_status, selectedClient),
      priority: selectedClient.priority || "medium",
      lead_source: selectedClient.lead_source || "",
      assigned_executive: selectedClient.assigned_executive || "",
    });
  }, [selectedClient]);

  // Filter - exclude won/policy_issued leads from pipeline and deduplicate same lead/vehicle
  const pipelineClients = useMemo(() => {
    // First pass: identify all keys that have a won, policy_issued, or lost record
    const terminalKeys = new Map<string, string>(); // key -> stage
    for (const client of clients) {
      const stage = normalizeStage(client.pipeline_stage, client.lead_status, client);
      if (stage === "policy_issued" || stage === "won" || stage === "lost") {
        const key = getClientIdentityKey(client);
        const existing = terminalKeys.get(key);
        // won/policy_issued take precedence over lost
        if (!existing || stage === "policy_issued" || stage === "won") {
          terminalKeys.set(key, stage);
        }
      }
    }

    const uniqueLeads = new Map<string, Client>();

    for (const client of clients) {
      const stage = normalizeStage(client.pipeline_stage, client.lead_status, client);
      // Visibility is determined ONLY by pipeline_stage — no expired-date filtering

      if (stage === "policy_issued" || stage === "won") continue;

      const dedupeKey = getClientIdentityKey(client);

      // If another record with the same vehicle/policy is already won/policy_issued, skip entirely
      const terminalStage = terminalKeys.get(dedupeKey);
      if (terminalStage === "policy_issued" || terminalStage === "won") continue;

      // If this lead is NOT lost but there's a lost terminal record, this active one wins (skip the terminal check)
      // If this lead IS lost and the terminal is lost, keep it (it belongs in lost section)

      const existing = uniqueLeads.get(dedupeKey);
      if (!existing) {
        uniqueLeads.set(dedupeKey, client);
        continue;
      }

      // STRICT RULE: Always prefer the most recently updated record
      // This ensures that when a user moves a lead to a new stage, the latest update wins
      const existingTime = getSafeTimestamp(existing.updated_at, existing.created_at);
      const candidateTime = getSafeTimestamp(client.updated_at, client.created_at);

      if (candidateTime > existingTime) {
        uniqueLeads.set(dedupeKey, client);
      }
    }

    return Array.from(uniqueLeads.values());
  }, [clients]);

  const wonClients = useMemo(() => {
    const uniqueWonLeads = new Map<string, Client>();

    for (const client of clients) {
      const stage = normalizeStage(client.pipeline_stage, client.lead_status, client);
      if (stage !== "won" && stage !== "policy_issued") continue;

      const dedupeKey = getClientIdentityKey(client);
      const existing = uniqueWonLeads.get(dedupeKey);
      if (!existing) {
        uniqueWonLeads.set(dedupeKey, client);
        continue;
      }

      const existingTime = getSafeTimestamp(existing.updated_at, existing.created_at);
      const candidateTime = getSafeTimestamp(client.updated_at, client.created_at);

      if (candidateTime > existingTime) {
        uniqueWonLeads.set(dedupeKey, client);
      }
    }

    return Array.from(uniqueWonLeads.values());
  }, [clients]);

  const getWonEffectiveDate = useCallback((client: Client) => {
    return client.booking_date || client.policy_start_date || client.updated_at || client.created_at;
  }, []);

  const getWonDateBounds = useCallback((preset: string) => {
    const now = new Date();

    switch (preset) {
      case "day":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "week":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "quarter":
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case "six_months":
        return { start: startOfDay(subMonths(now, 6)), end: endOfDay(now) };
      case "year":
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return null;
    }
  }, []);

  // Counts
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PIPELINE_STAGES.forEach(s => { counts[s.value] = 0; });
    pipelineClients.forEach(c => {
      const stage = normalizeStage(c.pipeline_stage, c.lead_status, c);
      if (stage === "lost" && c.retarget_status === "scheduled") return;
      if (counts[stage] !== undefined) counts[stage]++;
    });
    counts.won = wonClients.length;
    return counts;
  }, [pipelineClients, wonClients]);

  // Filter
  const uniqueExecutives = useMemo(() => {
    const execs = new Set<string>();
    clients.forEach(c => { if (c.assigned_executive) execs.add(c.assigned_executive); });
    return Array.from(execs).sort();
  }, [clients]);

  const applyExpiryFilter = useCallback((expiryDateStr: string | null | undefined, preset: string, from?: Date, to?: Date) => {
    if (preset === "all") return true;
    const expiry = parseDateValue(expiryDateStr);
    if (!expiry) return preset === "no_expiry";
    if (preset === "no_expiry") return false;
    const now = new Date();
    switch (preset) {
      case "expired": return isBefore(expiry, startOfDay(now));
      case "this_week": return expiry >= startOfDay(now) && expiry <= endOfDay(addDays(now, 7));
      case "this_month": return expiry >= startOfDay(now) && expiry <= endOfMonth(now);
      case "next_30": return expiry >= startOfDay(now) && expiry <= endOfDay(addDays(now, 30));
      case "next_90": return expiry >= startOfDay(now) && expiry <= endOfDay(addDays(now, 90));
      case "custom": {
        if (from && isBefore(expiry, startOfDay(from))) return false;
        if (to && isAfter(expiry, endOfDay(to))) return false;
        return true;
      }
      default: return true;
    }
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (sourceFilter !== "all") count++;
    if (priorityFilter !== "all") count++;
    if (expiryPreset !== "all") count++;
    if (executiveFilter !== "all") count++;
    return count;
  }, [sourceFilter, priorityFilter, expiryPreset, executiveFilter]);

  const clearAllFilters = useCallback(() => {
    setSourceFilter("all");
    setPriorityFilter("all");
    setExpiryPreset("all");
    setExpiryFrom(undefined);
    setExpiryTo(undefined);
    setExecutiveFilter("all");
  }, []);

  const filtered = useMemo(() => {
    let result = selectedStage === "all"
      ? pipelineClients
      : selectedStage === "retarget"
        ? pipelineClients.filter(c => c.retarget_status === "scheduled")
        : selectedStage === "won"
          ? wonClients
        : selectedStage === "lost"
          ? pipelineClients.filter(c => normalizeStage(c.pipeline_stage, c.lead_status, c) === "lost" && c.retarget_status !== "scheduled")
          : pipelineClients.filter(c => normalizeStage(c.pipeline_stage, c.lead_status, c) === selectedStage);
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

    // Advanced filters
    if (sourceFilter !== "all") {
      result = result.filter(c => normalizeLeadSourceLabel(c.lead_source) === sourceFilter);
    }
    if (priorityFilter !== "all") {
      result = result.filter(c => (c.priority || "").toLowerCase() === priorityFilter);
    }
    if (expiryPreset !== "all") {
      result = result.filter(c => applyExpiryFilter(c.policy_expiry_date, expiryPreset, expiryFrom, expiryTo));
    }
    if (executiveFilter !== "all") {
      result = result.filter(c => c.assigned_executive === executiveFilter);
    }

    if (selectedStage === "won") {
      if (wonDatePreset !== "all" && wonDatePreset !== "custom") {
        const bounds = getWonDateBounds(wonDatePreset);

        if (bounds) {
          result = result.filter((client) => {
            const effectiveDate = getWonEffectiveDate(client);
            if (!effectiveDate) return false;

            const clientDate = parseDateValue(effectiveDate);
            if (!clientDate) return false;
            return clientDate >= bounds.start && clientDate <= bounds.end;
          });
        }
      }

      if (wonDatePreset === "custom" && (wonDateFrom || wonDateTo)) {
        const customFrom = wonDateFrom ? startOfDay(wonDateFrom) : null;
        const customTo = wonDateTo ? endOfDay(wonDateTo) : null;

        result = result.filter((client) => {
          const effectiveDate = getWonEffectiveDate(client);
          if (!effectiveDate) return false;

          const clientDate = parseDateValue(effectiveDate);
          if (!clientDate) return false;
          if (customFrom && clientDate < customFrom) return false;
          if (customTo && clientDate > customTo) return false;
          return true;
        });
      }
    }

    return [...result].sort((a, b) => {
      const aTime = getSafeTimestamp(a.updated_at, a.created_at);
      const bTime = getSafeTimestamp(b.updated_at, b.created_at);
      return bTime - aTime;
    });
  }, [pipelineClients, wonClients, selectedStage, search, sourceFilter, priorityFilter, expiryPreset, expiryFrom, expiryTo, executiveFilter, wonDatePreset, wonDateFrom, wonDateTo, getWonDateBounds, getWonEffectiveDate, applyExpiryFilter]);

  const retargetCount = useMemo(() => pipelineClients.filter(c => c.retarget_status === "scheduled").length, [pipelineClients]);

  // Move mutation
  const moveStage = useMutation({
    mutationFn: async ({ clientId, newStage, extras }: { clientId: string; newStage: string; extras?: Record<string, any> }) => {
      if (isLegacyClientId(clientId)) {
        throw new Error("This lead is still syncing. Please refresh and try again.");
      }

      const update: any = { pipeline_stage: newStage, ...extras };
      // Sync lead_status for terminal stages
      if (newStage === "lost") {
        update.lead_status = "lost";
      } else if (newStage === "won" || newStage === "policy_issued") {
        update.lead_status = "won";
      } else if (newStage !== "smart_calling") {
        // For non-terminal, non-calling stages, keep lead_status in sync
        update.lead_status = newStage;
      }
      if (newStage === "smart_calling") {
        const client = clients.find(c => c.id === clientId);
        update.contact_attempts = (client?.contact_attempts || 0) + 1;
        update.last_contacted_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("insurance_clients")
        .update(update)
        .eq("id", clientId)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Lead was not found in the CRM database. Please refresh once.");

      const stage = ALL_STAGES.find(s => s.value === newStage);
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
      const stage = ALL_STAGES.find(s => s.value === vars.newStage);
      toast.success(`Moved to ${stage?.label}`);

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
        lead_status: "lost",
        lost_reason: lostReason,
        notes: lostRemarks || undefined,
        retarget_status: retargetNextYear ? "scheduled" : "none",
        retargeting_enabled: retargetNextYear,
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
          All ({pipelineClients.length})
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

      {/* Won Summary Bar */}
      {selectedStage === "won" && (() => {
        const wonTotal = stageCounts["won"] || 0;
        const totalAll = pipelineClients.length;
        const convPct = totalAll > 0 ? ((wonTotal / totalAll) * 100).toFixed(1) : "0";
        const wonPremium = filtered.reduce((s, c) => s + (c.current_premium || 0), 0);
        return (
          <div className="flex items-center gap-4 p-3 rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-1.5">
              <Target className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold">Conversion: <span className="text-emerald-700 dark:text-emerald-400">{convPct}%</span></span>
            </div>
            <div className="h-4 w-px bg-emerald-300 dark:bg-emerald-700" />
            <span className="text-xs">Won: <strong>{wonTotal}</strong> / {totalAll} leads</span>
            <div className="h-4 w-px bg-emerald-300 dark:bg-emerald-700" />
            <span className="text-xs">Premium: <strong>₹{wonPremium.toLocaleString("en-IN")}</strong></span>
          </div>
        );
      })()}

      {/* Search + Filter Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, phone, vehicle, city, policy no..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          className="h-9 gap-1.5 shrink-0"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-0.5">{activeFilterCount}</Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-9 text-xs gap-1 text-destructive" onClick={clearAllFilters}>
            <X className="h-3.5 w-3.5" /> Clear all
          </Button>
        )}
      </div>

      {/* Advanced Filters Bar */}
      {showFilters && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-end">
          {/* Lead Source */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Lead Source</Label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="h-9 w-[160px] text-xs">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {LEAD_SOURCES.map(src => (
                  <SelectItem key={src} value={src}>{src}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Priority</Label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="hot">🔥 Hot</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expiry Date */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Expiry Date</Label>
            <Select value={expiryPreset} onValueChange={(v) => { setExpiryPreset(v); if (v !== "custom") { setExpiryFrom(undefined); setExpiryTo(undefined); } }}>
              <SelectTrigger className="h-9 w-[160px] text-xs">
                <SelectValue placeholder="All expiry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="next_30">Next 30 Days</SelectItem>
                <SelectItem value="next_90">Next 90 Days</SelectItem>
                <SelectItem value="no_expiry">No Expiry Set</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {expiryPreset === "custom" && (
            <>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Expiry From</Label>
                <Input type="date" value={expiryFrom ? format(expiryFrom, "yyyy-MM-dd") : ""} onChange={e => setExpiryFrom(e.target.value ? new Date(e.target.value) : undefined)} className="h-9 w-[150px] text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Expiry To</Label>
                <Input type="date" value={expiryTo ? format(expiryTo, "yyyy-MM-dd") : ""} onChange={e => setExpiryTo(e.target.value ? new Date(e.target.value) : undefined)} className="h-9 w-[150px] text-xs" />
              </div>
            </>
          )}

          {/* Assigned Executive */}
          {uniqueExecutives.length > 0 && (
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Executive</Label>
              <Select value={executiveFilter} onValueChange={setExecutiveFilter}>
                <SelectTrigger className="h-9 w-[160px] text-xs">
                  <SelectValue placeholder="All executives" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Executives</SelectItem>
                  {uniqueExecutives.map(exec => (
                    <SelectItem key={exec} value={exec}>{exec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {selectedStage === "won" && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Won date filter</Label>
            <Select
              value={wonDatePreset}
              onValueChange={(value) => {
                setWonDatePreset(value);
                if (value !== "custom") {
                  setWonDateFrom(undefined);
                  setWonDateTo(undefined);
                }
              }}
            >
              <SelectTrigger className="h-9 w-[180px] text-xs">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="day">Day wise</SelectItem>
                <SelectItem value="week">Week wise</SelectItem>
                <SelectItem value="month">Month wise</SelectItem>
                <SelectItem value="quarter">Quarter wise</SelectItem>
                <SelectItem value="six_months">6 months</SelectItem>
                <SelectItem value="year">Year wise</SelectItem>
                <SelectItem value="custom">Custom date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {wonDatePreset === "custom" && (
            <>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">From</Label>
                <SmartDatePicker
                  date={wonDateFrom}
                  onSelect={setWonDateFrom}
                  placeholder="Start date"
                  className="w-[170px]"
                  yearRange={[new Date().getFullYear() - 3, new Date().getFullYear() + 1]}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">To</Label>
                <SmartDatePicker
                  date={wonDateTo}
                  onSelect={setWonDateTo}
                  placeholder="End date"
                  className="w-[170px]"
                  yearRange={[new Date().getFullYear() - 3, new Date().getFullYear() + 1]}
                />
              </div>

              {(wonDateFrom || wonDateTo) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => {
                    setWonDateFrom(undefined);
                    setWonDateTo(undefined);
                  }}
                >
                  Clear dates
                </Button>
              )}
            </>
          )}
        </div>
      )}

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
                  {/* Stage column removed - inline select in Name cell */}
                  <TableHead className="text-[10px] font-bold uppercase">Picked Up</TableHead>
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
                  const normStage = normalizeStage(client.pipeline_stage, client.lead_status, client);
                  const stage = ALL_STAGES.find(s => s.value === normStage) || PIPELINE_STAGES[0];
                  const phone = displayPhone(client.phone);
                  const expiryDate = parseDateValue(client.policy_expiry_date);
                  const followUpDateValue = parseDateValue(client.follow_up_date);
                  const daysToExpiry = expiryDate ? differenceInDays(expiryDate, new Date()) : null;

                  return (
                    <TableRow key={client.id} draggable onDragStart={() => handleDragStart(client)} onDragEnd={handleDragEnd}
                      className="cursor-pointer text-xs hover:bg-muted/30 transition-colors" onClick={() => setSelectedClient(client)}>
                      <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0", stage.color)}>
                            <User className="h-3 w-3 text-white" />
                          </div>
                          <div className="min-w-0 flex flex-col gap-0.5">
                            <p className="font-semibold text-xs leading-tight truncate flex items-center gap-1">
                              {client.customer_name || "Unknown"}
                              {(client.duplicate_count ?? 0) > 0 && (
                                <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-[8px] px-1 py-0 h-3.5 shrink-0">
                                  Dup {(client.duplicate_count ?? 0) + 1}
                                </Badge>
                              )}
                            </p>
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <Select
                                value={normStage}
                                onValueChange={(val) => handleMove(client, val)}
                              >
                                <SelectTrigger className={cn("h-5 text-[9px] px-1.5 py-0 w-auto min-w-[90px] max-w-[120px] border rounded-full gap-0.5", stage.bg, stage.text, stage.border)}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PIPELINE_STAGES.map(s => {
                                    const SIcon = s.icon;
                                    return (
                                      <SelectItem key={s.value} value={s.value} className="text-xs">
                                        {s.label}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
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
                      {/* Stage column removed - inline in Name */}
                      <TableCell onClick={e => e.stopPropagation()}>
                        {client.picked_up_by ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] px-1.5">
                              ✅ {client.picked_up_by}
                            </Badge>
                            {client.picked_up_at && (
                              <span className="text-[8px] text-muted-foreground">
                                {formatRelativeDateValue(client.picked_up_at)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] gap-1 px-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            onClick={async () => {
                              const { data: { user } } = await supabase.auth.getUser();
                              const userName = user?.email?.split("@")[0] || "Unknown";
                              const { error } = await supabase
                                .from("insurance_clients")
                                .update({ picked_up_by: userName, picked_up_at: new Date().toISOString() })
                                .eq("id", client.id);
                              if (error) { toast.error("Failed to pick up"); return; }
                              await supabase.from("insurance_activity_log").insert({
                                client_id: client.id,
                                activity_type: "picked_up",
                                title: `Picked up by ${userName}`,
                                description: `Lead claimed by ${userName}`,
                              });
                              queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
                              toast.success(`Lead picked up by ${userName}`);
                            }}
                          >
                            <UserPlus className="h-2.5 w-2.5" /> Pick Up
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[9px]", getSourceColor(client.lead_source))}>
                          {formatSource(client.lead_source, client.created_at)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatRelativeDateValue(client.created_at)}
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
                            <p className="text-[9px] text-muted-foreground">{formatDateValue(client.policy_expiry_date, "dd MMM yy")}</p>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-[10px]">
                        {followUpDateValue ? (
                          <span className={cn("font-medium", differenceInDays(followUpDateValue, new Date()) < 0 ? "text-red-600" : "text-orange-600")}>
                            {format(followUpDateValue, "dd MMM")}
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
                          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 px-1.5 border-primary/30 text-primary" onClick={() => { setForwardClient(client); setShowForwardDialog(true); }}>
                            <Send className="h-2.5 w-2.5" /> Forward
                          </Button>
                          <ForwardedBadge leadId={client.id} />
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
              <span>{stageCounts["won"] || 0} won • {stageCounts["lost"] || 0} lost</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── CLIENT DETAIL DIALOG ── */}
      <Dialog open={!!selectedClient && !showLostDialog && !showCallingDialog && !showFollowUpDialog && !showQuoteModal && !showUploadPolicy && !showWonDialog} onOpenChange={(o) => { if (!o) setSelectedClient(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          {selectedClient && (() => {
            const normStage = normalizeStage(selectedClient.pipeline_stage, selectedClient.lead_status);
            const stage = ALL_STAGES.find(s => s.value === normStage) || PIPELINE_STAGES[0];
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
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
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
                    {(selectedClient.duplicate_count ?? 0) > 0 && (
                      <Badge className="bg-orange-100 text-orange-700 border-orange-300">⚠️ Duplicate Entry #{(selectedClient.duplicate_count ?? 0) + 1}</Badge>
                    )}
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

                    {/* Stage, Priority, Expiry, Follow-Up, Source, Executive */}
                    <p className="text-xs font-semibold text-muted-foreground uppercase pt-2">Pipeline & Scheduling</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Pipeline Stage</Label>
                        <Select value={editFields.pipeline_stage || "new_lead"} onValueChange={v => setEditFields(f => ({ ...f, pipeline_stage: v }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ALL_STAGES.map(s => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Priority</Label>
                        <Select value={editFields.priority || "medium"} onValueChange={v => setEditFields(f => ({ ...f, priority: v }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hot">🔥 Hot</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Policy Expiry Date</Label>
                        <Input type="date" value={editFields.policy_expiry_date || ""} onChange={e => setEditFields(f => ({ ...f, policy_expiry_date: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Follow-Up Date</Label>
                        <Input type="date" value={editFields.follow_up_date || ""} onChange={e => setEditFields(f => ({ ...f, follow_up_date: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Follow-Up Time</Label>
                        <Input type="time" value={editFields.follow_up_time || ""} onChange={e => setEditFields(f => ({ ...f, follow_up_time: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Lead Source</Label>
                        <Select value={editFields.lead_source || ""} onValueChange={v => setEditFields(f => ({ ...f, lead_source: v }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {LEAD_SOURCES.map(src => (
                              <SelectItem key={src} value={src}>{src}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-[11px] text-muted-foreground">Assigned Executive</Label>
                        <Input value={editFields.assigned_executive || ""} onChange={e => setEditFields(f => ({ ...f, assigned_executive: e.target.value }))} placeholder="Executive name" className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Notes</Label>
                      <Textarea value={editFields.notes || ""} onChange={e => setEditFields(f => ({ ...f, notes: e.target.value }))} className="min-h-20 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="sticky bottom-0 bg-background border-t pt-3 pb-1 space-y-3 -mx-6 px-6 shadow-[0_-4px_12px_-4px_hsl(var(--foreground)/0.08)]">
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={savingEdit}
                    onClick={async () => {
                      if (!selectedClient) return;
                      if (isLegacyClientId(selectedClient.id)) {
                        toast.error("This lead is still syncing. Please refresh and try again.");
                        return;
                      }
                      setSavingEdit(true);
                      try {
                        const normalizedStage = normalizeStage(selectedClient.pipeline_stage, selectedClient.lead_status);
                        const fallbackBookingDate =
                          selectedClient.booking_date ||
                          selectedClient.policy_start_date ||
                          selectedClient.updated_at?.split("T")[0] ||
                          selectedClient.created_at?.split("T")[0] ||
                          new Date().toISOString().split("T")[0];

                        let newStage = editFields.pipeline_stage || normalizedStage;
                        const followUpDateSet = !!editFields.follow_up_date;
                        const followUpDateCleared = !editFields.follow_up_date && selectedClient.follow_up_date;

                        // Auto-promote to follow_up when follow-up date is set
                        const earlyStages = ["new_lead", "smart_calling", "quote_shared"];
                        if (followUpDateSet && earlyStages.includes(newStage)) {
                          newStage = "follow_up";
                        }
                        // Demote from follow_up when follow-up date is cleared (only if user didn't explicitly pick a stage)
                        if (followUpDateCleared && newStage === "follow_up" && !editFields.pipeline_stage) {
                          newStage = "quote_shared";
                        }

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
                          policy_expiry_date: editFields.policy_expiry_date || null,
                          follow_up_date: editFields.follow_up_date || null,
                          follow_up_time: editFields.follow_up_time || null,
                          pipeline_stage: newStage,
                          priority: editFields.priority || "medium",
                          lead_source: editFields.lead_source || null,
                          assigned_executive: editFields.assigned_executive?.trim() || null,
                        };

                        if (newStage === "lost") {
                          updates.lead_status = "lost";
                        } else if (newStage === "won" || newStage === "policy_issued") {
                          updates.lead_status = "won";
                        } else {
                          updates.lead_status = newStage;
                        }

                        // Set journey tracking for follow-up auto-promotion
                        if (followUpDateSet && earlyStages.includes(normalizedStage)) {
                          updates.journey_last_event = "follow_up";
                          updates.journey_last_event_at = new Date().toISOString();
                        }

                        if (newStage === "won" || newStage === "policy_issued") {
                          updates.lead_status = "won";
                          updates.pipeline_stage = "policy_issued";
                          updates.booking_date = selectedClient.booking_date || fallbackBookingDate;
                          updates.journey_last_event = selectedClient.journey_last_event || "policy_issued";
                          updates.journey_last_event_at = selectedClient.journey_last_event_at || new Date().toISOString();
                        }

                        const { data, error } = await supabase
                          .from("insurance_clients")
                          .update(updates)
                          .eq("id", selectedClient.id)
                          .select("id, customer_name, phone, email, city, vehicle_number, vehicle_make, vehicle_model, vehicle_year, current_insurer, current_policy_type, current_premium, ncb_percentage, previous_claim, policy_expiry_date, policy_start_date, current_policy_number, lead_source, lead_status, assigned_executive, priority, pipeline_stage, contact_attempts, quote_amount, quote_insurer, lost_reason, follow_up_date, follow_up_time, call_status, call_remarks, renewal_reminder_set, renewal_reminder_date, incentive_eligible, notes, retarget_status, journey_last_event, journey_last_event_at, picked_up_by, picked_up_at, booking_date, booked_by, updated_at, created_at")
                          .maybeSingle();
                        if (error) throw error;
                        if (!data) throw new Error("Lead was not found in the CRM database. Please refresh once.");

                        setSelectedClient(data as Client);
                        queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
                        queryClient.invalidateQueries({ queryKey: ["ins-policies-book"] });
                        toast.success("Lead updated");

                        // Log activity when auto-promoted to follow_up
                        if (followUpDateSet && earlyStages.includes(normalizedStage)) {
                          supabase.from("insurance_activity_log").insert({
                            client_id: selectedClient.id,
                            activity_type: "stage_change",
                            title: "Pipeline → Follow-Up",
                            description: `Auto-promoted to Follow-Up • Follow-up set for ${editFields.follow_up_date}${editFields.follow_up_time ? ` at ${editFields.follow_up_time}` : ""}`,
                            metadata: {
                              previous_stage: normalizedStage,
                              new_stage: "follow_up",
                              follow_up_date: editFields.follow_up_date,
                              follow_up_time: editFields.follow_up_time || null,
                            },
                          }).then(({ error: logErr }) => {
                            if (logErr) console.warn("Follow-up activity log failed:", logErr.message);
                          });
                        }

                        if (newStage === "won" || newStage === "policy_issued") {
                          setTimeout(() => {
                            setShowUploadPolicy(true);
                            toast.info("📄 Please upload the policy document now", { duration: 5000 });
                          }, 500);
                        }
                      } catch (e: any) {
                        toast.error(e.message || "Failed to save");
                      } finally {
                        setSavingEdit(false);
                      }
                    }}
                  >
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </Button>
                  <div className="flex flex-wrap gap-2">
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
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setPendingMoveClient(selectedClient); setShowWonDialog(true); }}><CheckCircle2 className="h-3.5 w-3.5" /> Create / Fix Policy</Button>
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
        onOpenChange={(open) => {
          setShowWonDialog(open);
          if (!open) setPendingMoveClient(null);
        }}
        client={pendingMoveClient || selectedClient}
        onSuccess={() => {
          const targetClient = pendingMoveClient || selectedClient;
          queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
          queryClient.invalidateQueries({ queryKey: ["ins-policies-book"] });
          setShowWonDialog(false);
          setPendingMoveClient(null);
          if (targetClient) {
            // Use a short delay to let the WonDialog fully close before opening upload prompt
            setTimeout(() => {
              setSelectedClient(targetClient);
              setShowUploadPolicy(true);
            }, 400);
          } else {
            setSelectedClient(null);
          }
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
            <InsurancePolicyDocumentUploader
              defaultClientId={selectedClient.id}
              onDone={() => {
                setShowUploadPolicy(false);
                queryClient.invalidateQueries({ queryKey: ["ins-policies-book"] });
                queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {forwardClient && (
        <LeadForwardDialog
          open={showForwardDialog}
          onOpenChange={(o) => { setShowForwardDialog(o); if (!o) setForwardClient(null); }}
          leadId={forwardClient.id}
          leadTable="insurance_clients"
          leadName={forwardClient.customer_name || "Unknown"}
          leadPhone={forwardClient.phone}
        />
      )}
    </>
  );
}
