import { useState, useMemo, useCallback, useRef } from "react";
import { Calendar } from "@/components/ui/calendar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, Phone, FileText, MessageSquare, Clock, CreditCard,
  CheckCircle2, XCircle, Bell, Search, ChevronRight, Upload,
  PhoneCall, User, Car, Shield, TrendingUp, Eye, Send, Flame,
  MoreVertical, Share2, Plus, ArrowRight, Filter, Download, Database, SlidersHorizontal, X, CalendarIcon, MapPin, Loader2, Save
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { format, differenceInDays, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter } from "date-fns";
import { InsurancePolicyDocumentUploader } from "./InsurancePolicyDocumentUploader";
import { sendWhatsApp } from "@/lib/sendWhatsApp";

// ── 9-Stage Pipeline (STRICT) ──
const PIPELINE_STAGES = [
  { value: "new_lead", label: "New Lead", icon: UserPlus, color: "from-blue-500 to-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500", team: "Executive" },
  { value: "contact_attempted", label: "Contact Attempted", icon: Phone, color: "from-yellow-500 to-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-500", team: "Executive" },
  { value: "requirement_collected", label: "Requirement Collected", icon: FileText, color: "from-violet-500 to-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500", team: "Executive" },
  { value: "quote_shared", label: "Quote Shared", icon: Send, color: "from-cyan-500 to-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30", border: "border-cyan-200 dark:border-cyan-800", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500", team: "Sales" },
  { value: "follow_up", label: "Follow-up", icon: Clock, color: "from-orange-500 to-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500", team: "Sales" },
  { value: "payment_pending", label: "Payment Pending", icon: CreditCard, color: "from-pink-500 to-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30", border: "border-pink-200 dark:border-pink-800", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500", team: "Operations" },
  { value: "policy_issued", label: "Policy Issued (WON)", icon: CheckCircle2, color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", team: "Operations" },
  { value: "lost", label: "Lost", icon: XCircle, color: "from-slate-400 to-slate-500", bg: "bg-slate-50 dark:bg-slate-900/30", border: "border-slate-200 dark:border-slate-700", text: "text-slate-500 dark:text-slate-400", dot: "bg-slate-400", team: "—" },
  { value: "renewal_queue", label: "Renewal Queue", icon: Bell, color: "from-amber-500 to-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500", team: "Renewal" },
];

const LOST_REASONS = [
  "Too expensive", "Existing agent", "No response", "Not renewing", "Competitor offer", "Other"
];

const NEXT_ACTIONS: Record<string, string> = {
  new_lead: "📞 Call lead to introduce & understand insurance needs",
  contact_attempted: "🔄 Retry call (max 3 attempts), then move to Follow-up",
  requirement_collected: "💰 Prepare 2-3 insurance quotes with comparison",
  quote_shared: "📊 Follow up on shared quotes, address objections",
  follow_up: "⏰ Day 1 → Day 3 → Day 5 reminders. No response = Lost",
  payment_pending: "💳 Collect payment & documents from customer",
  policy_issued: "✅ Upload policy document & verify details",
  lost: "🔄 Re-engage after 2 weeks with better offer",
  renewal_queue: "🔔 Auto-reminders at 90/45/15 days before expiry",
};

interface InsurancePipelineBoardProps {
  onNavigate?: (tab: string) => void;
}

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
  policy_expiry_date: string | null;
  current_policy_type: string | null;
  ncb_percentage: number | null;
  previous_claim: boolean | null;
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
  current_premium: number | null;
  current_policy_number: string | null;
  notes: string | null;
  created_at: string;
  booking_date: string | null;
  policy_start_date: string | null;
  updated_at: string | null;
}

// Normalize stage based on lead_status and current_policy_number
function normalizeClientStage(client: Client): string {
  const stage = (client.pipeline_stage || "").toLowerCase();
  const status = (client.lead_status || "").toLowerCase();

  // If client has a policy number assigned, they are policy_issued
  if (client.current_policy_number && client.current_policy_number.trim()) return "policy_issued";
  if (stage === "policy_issued" || status === "won" || status === "converted") return "policy_issued";
  if (stage === "lost" || status === "lost" || status === "not_interested") return "lost";

  // Map known stages
  const STAGE_LOOKUP: Record<string, string> = {
    new_lead: "new_lead", new: "new_lead",
    contact_attempted: "contact_attempted",
    requirement_collected: "requirement_collected",
    smart_calling: "contact_attempted",
    contacted: "contact_attempted",
    in_process: "contact_attempted",
    quote_shared: "quote_shared",
    follow_up: "follow_up",
    interested: "follow_up",
    hot_prospect: "follow_up",
    payment_pending: "payment_pending",
    renewal_queue: "renewal_queue",
    won: "policy_issued",
    converted: "policy_issued",
  };

  return STAGE_LOOKUP[stage] || STAGE_LOOKUP[status] || "new_lead";
}

export function InsurancePipelineBoard({ onNavigate }: InsurancePipelineBoardProps = {}) {
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTarget, setMoveTarget] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [showUploadPolicy, setShowUploadPolicy] = useState(false);
  const [note, setNote] = useState("");
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [filterExecutive, setFilterExecutive] = useState<string>("all");
  const [filterDateRange, setFilterDateRange] = useState<string>("all");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [draggingClient, setDraggingClient] = useState<Client | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["insurance-pipeline-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, email, city, vehicle_number, vehicle_make, vehicle_model, vehicle_year, current_insurer, policy_expiry_date, current_policy_type, ncb_percentage, previous_claim, lead_source, lead_status, assigned_executive, priority, pipeline_stage, contact_attempts, quote_amount, quote_insurer, lost_reason, follow_up_date, current_premium, current_policy_number, notes, created_at, booking_date, policy_start_date, updated_at")
        .eq("is_legacy", false)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return ((data || []).map((client) => ({
        ...client,
        pipeline_stage: normalizeClientStage(client),
      }))) as Client[];
    },
  });

  // Stage counts
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PIPELINE_STAGES.forEach(s => { counts[s.value] = 0; });
    clients.forEach(c => {
      const stage = c.pipeline_stage || "new_lead";
      if (counts[stage] !== undefined) counts[stage]++;
      else counts["new_lead"]++;
    });
    return counts;
  }, [clients]);

  const totalLeads = clients.length;
  const wonCount = stageCounts["policy_issued"] || 0;
  const convRate = totalLeads > 0 ? ((wonCount / totalLeads) * 100).toFixed(1) : "0";

  // Unique filter values
  const uniqueCities = useMemo(() => [...new Set(clients.map(c => c.city).filter(Boolean))].sort() as string[], [clients]);
  const uniqueSources = useMemo(() => [...new Set(clients.map(c => c.lead_source).filter(Boolean))].sort() as string[], [clients]);
  const uniqueExecutives = useMemo(() => [...new Set(clients.map(c => c.assigned_executive).filter(Boolean))].sort() as string[], [clients]);

  const activeFilterCount = [filterPriority, filterSource, filterCity, filterExecutive, filterDateRange, filterMonth].filter(f => f !== "all").length + (customDateFrom ? 1 : 0);

  // Get date cutoff based on filter
  // Get the effective date for a client based on their stage
  const getClientFilterDate = (c: Client) => {
    const stage = c.pipeline_stage || "new_lead";
    // For Won/Policy Issued clients, use booking or policy date
    if (stage === "policy_issued") {
      return c.booking_date || c.policy_start_date || c.updated_at || c.created_at;
    }
    return c.created_at;
  };

  const getDateCutoff = (range: string): Date | null => {
    const now = new Date();
    if (range === "today") { const d = new Date(now); d.setHours(0,0,0,0); return d; }
    if (range === "yesterday") { const d = new Date(now); d.setDate(d.getDate() - 1); d.setHours(0,0,0,0); return d; }
    if (range === "7days") { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    if (range === "30days") { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
    if (range === "90days") { const d = new Date(now); d.setDate(d.getDate() - 90); return d; }
    return null;
  };

  const getDateRange = (range: string): { start: Date; end: Date } | null => {
    const now = new Date();
    if (range === "this_week") return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    if (range === "this_quarter") return { start: startOfQuarter(now), end: endOfQuarter(now) };
    return null;
  };

  // Filter
  const filtered = useMemo(() => {
    let result = selectedStage === "all" ? clients : clients.filter(c => (c.pipeline_stage || "new_lead") === selectedStage);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.customer_name?.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.vehicle_number?.toLowerCase().includes(s) ||
        c.city?.toLowerCase().includes(s)
      );
    }
    if (filterPriority !== "all") result = result.filter(c => c.priority === filterPriority);
    if (filterSource !== "all") result = result.filter(c => c.lead_source === filterSource);
    if (filterCity !== "all") result = result.filter(c => c.city === filterCity);
    if (filterExecutive !== "all") result = result.filter(c => c.assigned_executive === filterExecutive);
    // Date range preset filter
    if (filterDateRange !== "all" && filterDateRange !== "custom") {
      const rangeResult = getDateRange(filterDateRange);
      if (rangeResult) {
        const rs = new Date(rangeResult.start); rs.setHours(0,0,0,0);
        const re = new Date(rangeResult.end); re.setHours(23,59,59,999);
        result = result.filter(c => { const d = new Date(getClientFilterDate(c)); return d >= rs && d <= re; });
      } else {
        const cutoff = getDateCutoff(filterDateRange);
        if (cutoff) {
          if (filterDateRange === "today" || filterDateRange === "yesterday") {
            const eod = new Date(cutoff); eod.setHours(23,59,59,999);
            result = result.filter(c => { const d = new Date(getClientFilterDate(c)); return d >= cutoff && d <= eod; });
          } else {
            result = result.filter(c => new Date(getClientFilterDate(c)) >= cutoff);
          }
        }
      }
    }
    // Custom date range
    if (filterDateRange === "custom" && customDateFrom) {
      const from = new Date(customDateFrom); from.setHours(0,0,0,0);
      result = result.filter(c => new Date(getClientFilterDate(c)) >= from);
      if (customDateTo) {
        const to = new Date(customDateTo); to.setHours(23,59,59,999);
        result = result.filter(c => new Date(getClientFilterDate(c)) <= to);
      }
    }
    // Month filter
    if (filterMonth !== "all") {
      result = result.filter((c) => {
        const rawDate = getClientFilterDate(c);
        if (!rawDate) return false;
        return format(new Date(rawDate), "yyyy-MM") === filterMonth;
      });
    }
    return result;
  }, [clients, selectedStage, search, filterPriority, filterSource, filterCity, filterExecutive, filterDateRange, customDateFrom, customDateTo, filterMonth]);

  const clearAllFilters = () => {
    setFilterPriority("all");
    setFilterSource("all");
    setFilterCity("all");
    setFilterExecutive("all");
    setFilterDateRange("all");
    setFilterMonth("all");
    setCustomDateFrom(undefined);
    setCustomDateTo(undefined);
  };

  // CSV Import handler
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast.error("Empty file"); return; }
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ""; });
        return row;
      });

      const inserts = rows.filter(r => r.customer_name || r.phone).map(r => ({
        customer_name: r.customer_name || r.name || "Unknown",
        phone: r.phone || r.mobile || "",
        email: r.email || null,
        city: r.city || null,
        vehicle_number: r.vehicle_number || r.reg_number || null,
        vehicle_make: r.vehicle_make || r.make || null,
        vehicle_model: r.vehicle_model || r.model || null,
        current_insurer: r.current_insurer || r.insurer || null,
        lead_source: r.lead_source || r.source || "csv_import",
        pipeline_stage: "new_lead",
        priority: r.priority || "cold",
      }));

      if (inserts.length === 0) { toast.error("No valid rows found"); return; }

      const { error } = await supabase.from("insurance_clients").insert(inserts as any);
      if (error) throw error;

      toast.success(`✅ ${inserts.length} leads imported successfully!`);
      queryClient.invalidateQueries({ queryKey: ["insurance-pipeline-clients"] });
      setShowImportDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Export pipeline data
  const handleExport = () => {
    if (filtered.length === 0) { toast.error("No data to export"); return; }
    const headers = ["Name", "Phone", "Email", "City", "Vehicle", "Make", "Model", "Insurer", "Stage", "Priority", "Source", "Created"];
    const csvRows = filtered.map(c => [
      c.customer_name || "", c.phone || "", c.email || "", c.city || "",
      c.vehicle_number || "", c.vehicle_make || "", c.vehicle_model || "",
      c.current_insurer || "", c.pipeline_stage || "new_lead", c.priority || "",
      c.lead_source || "", format(new Date(c.created_at), "yyyy-MM-dd"),
    ].map(v => `"${v}"`).join(","));
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `insurance_pipeline_${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} records`);
  };

  // Move stage
  const moveStage = useMutation({
    mutationFn: async ({ clientId, newStage, reason }: { clientId: string; newStage: string; reason?: string }) => {
      const update: any = { pipeline_stage: newStage };
      if (newStage === "lost" && reason) update.lost_reason = reason;
      if (newStage === "contact_attempted") {
        const client = clients.find(c => c.id === clientId);
        update.contact_attempts = (client?.contact_attempts || 0) + 1;
      }
      const { error } = await supabase.from("insurance_clients").update(update).eq("id", clientId);
      if (error) throw error;
      // Log activity
      const stage = PIPELINE_STAGES.find(s => s.value === newStage);
      await supabase.from("insurance_activity_log").insert({
        client_id: clientId,
        activity_type: "stage_change",
        title: `Pipeline → ${stage?.label}`,
        description: reason ? `Moved to ${stage?.label}. Reason: ${reason}` : `Moved to ${stage?.label}`,
        metadata: { new_stage: newStage, reason } as any,
      });

      // ── Auto-create/replace policy in Policy Book when Won ──
      if (newStage === "policy_issued") {
        try {
          const { data: client, error: clientError } = await supabase
            .from("insurance_clients")
            .select("*")
            .eq("id", clientId)
            .single();

          if (clientError) throw clientError;
          if (!client) throw new Error("Client not found for policy issuance");

          let isRenewalPolicy = false;

          // If same vehicle_number exists, mark old active policies as "renewed"
          if (client.vehicle_number) {
            const normalizedVehicle = client.vehicle_number.trim().toUpperCase();
            const { data: sameVehicleClients, error: vehicleClientErr } = await supabase
              .from("insurance_clients")
              .select("id, vehicle_number")
              .not("vehicle_number", "is", null);

            if (vehicleClientErr) throw vehicleClientErr;

            const sameClientIds = (sameVehicleClients || [])
              .filter(c => (c.vehicle_number || "").trim().toUpperCase() === normalizedVehicle)
              .map(c => c.id);

            if (sameClientIds.length > 0) {
              const { data: existingVehiclePolicies, error: existingVehiclePoliciesErr } = await supabase
                .from("insurance_policies")
                .select("id")
                .in("client_id", sameClientIds)
                .limit(1);

              if (existingVehiclePoliciesErr) throw existingVehiclePoliciesErr;
              isRenewalPolicy = (existingVehiclePolicies?.length || 0) > 0;

              const { error: renewErr } = await supabase
                .from("insurance_policies")
                .update({ status: "renewed", renewal_status: "renewed" })
                .in("client_id", sameClientIds)
                .eq("status", "active");
              if (renewErr) throw renewErr;
            }
          }

          if (!isRenewalPolicy) {
            const { data: existingClientPolicies, error: existingClientPoliciesErr } = await supabase
              .from("insurance_policies")
              .select("id")
              .eq("client_id", clientId)
              .limit(1);

            if (existingClientPoliciesErr) throw existingClientPoliciesErr;
            isRenewalPolicy = (existingClientPolicies?.length || 0) > 0;
          }

          // Calculate dates
          const today = new Date();
          const startDate = client.policy_start_date || today.toISOString().split("T")[0];
          const expiryDate = client.policy_expiry_date || new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split("T")[0];

          // Avoid duplicate active policy record for same client + policy number + start date
          if (client.current_policy_number) {
            const { data: dup } = await supabase
              .from("insurance_policies")
              .select("id")
              .eq("client_id", clientId)
              .eq("policy_number", client.current_policy_number)
              .eq("start_date", startDate)
              .eq("status", "active")
              .maybeSingle();

            if (!dup) {
              const { error: createErr } = await supabase.from("insurance_policies").insert({
                client_id: clientId,
                policy_number: client.current_policy_number,
                policy_type: client.current_policy_type || "comprehensive",
                insurer: client.current_insurer || client.quote_insurer || "Unknown",
                premium_amount: client.quote_amount || client.current_premium || null,
                start_date: startDate,
                expiry_date: expiryDate,
                status: "active",
                is_renewal: isRenewalPolicy,
                issued_date: today.toISOString().split("T")[0],
              });
              if (createErr) throw createErr;
            }
          } else {
            const { error: createErr } = await supabase.from("insurance_policies").insert({
              client_id: clientId,
              policy_number: null,
              policy_type: client.current_policy_type || "comprehensive",
              insurer: client.current_insurer || client.quote_insurer || "Unknown",
              premium_amount: client.quote_amount || client.current_premium || null,
              start_date: startDate,
              expiry_date: expiryDate,
              status: "active",
              is_renewal: isRenewalPolicy,
              issued_date: today.toISOString().split("T")[0],
            });
            if (createErr) throw createErr;
          }

          const { error: markClientErr } = await supabase.from("insurance_clients").update({
            is_active: true,
            lead_status: "won",
          }).eq("id", clientId);
          if (markClientErr) throw markClientErr;

          const { error: logErr } = await supabase.from("insurance_activity_log").insert({
            client_id: clientId,
            activity_type: "policy_created",
            title: "📋 Policy Auto-Created in Policy Book",
            description: `Policy for ${client.vehicle_number || client.vehicle_model || "vehicle"} created. Start: ${startDate}, Expiry: ${expiryDate}`,
            metadata: { start_date: startDate, expiry_date: expiryDate, insurer: client.current_insurer || client.quote_insurer } as any,
          });
          if (logErr) throw logErr;
        } catch (e) {
          console.error("Auto-policy creation failed:", e);
          throw e;
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["insurance-pipeline-clients"] });
      queryClient.invalidateQueries({ queryKey: ["ins-dash-policies"] });
      queryClient.invalidateQueries({ queryKey: ["ins-dash-clients-policy-book"] });
      const stage = PIPELINE_STAGES.find(s => s.value === vars.newStage);
      if (vars.newStage === "policy_issued") {
        toast.success("🎉 Policy issued & added to Policy Book!", { duration: 5000 });
      } else {
        toast.success(`Moved to ${stage?.label}`);
      }
      setShowMoveDialog(false);
      setLostReason("");
      // Auto-navigate based on new stage
      if (vars.newStage === "policy_issued") {
        setShowUploadPolicy(true);
        setTimeout(() => {
          if (onNavigate) onNavigate("policy-book");
        }, 2000);
      } else if (vars.newStage === "lost") {
        setSelectedStage("lost");
      } else if (vars.newStage === "renewal_queue") {
        if (onNavigate) onNavigate("renewals");
      } else {
        setSelectedStage(vars.newStage);
      }
    },
    onError: (error: any) => {
      console.error("Stage update failed:", error);
      toast.error(error?.message || "Failed to update stage / create policy");
    },
  });

  const handleMove = useCallback((client: Client, targetStage: string) => {
    if (targetStage === "lost") {
      setSelectedClient(client);
      setMoveTarget(targetStage);
      setShowMoveDialog(true);
    } else {
      moveStage.mutate({ clientId: client.id, newStage: targetStage });
    }
  }, [moveStage]);

  const confirmLostMove = () => {
    if (!selectedClient || !lostReason) { toast.error("Please select a reason"); return; }
    moveStage.mutate({ clientId: selectedClient.id, newStage: "lost", reason: lostReason });
  };

  const handleCardDragStart = (client: Client) => setDraggingClient(client);
  const handleCardDragEnd = () => {
    setDraggingClient(null);
    setDragOverStage(null);
  };
  const handleStageDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    setDragOverStage(stage);
  };
  const handleStageDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (!draggingClient || (draggingClient.pipeline_stage || "new_lead") === stage) return;
    handleMove(draggingClient, stage);
    setDragOverStage(null);
    setDraggingClient(null);
  };

  const addNote = async () => {
    if (!selectedClient || !note.trim()) return;
    await supabase.from("insurance_activity_log").insert({
      client_id: selectedClient.id,
      activity_type: "note",
      title: "Note added",
      description: note,
    });
    toast.success("Note saved");
    setNote("");
  };

  const displayPhone = (phone: string | null) => (!phone || phone.startsWith("IB_")) ? null : phone;

  const handleWhatsApp = (phone: string | null, name: string) => {
    if (!phone || phone.startsWith("IB_")) return;
    void sendWhatsApp({
      phone,
      message: `Hi ${name}, reaching out regarding your insurance. Contact us for the best deal!`,
      name: name || undefined,
      logEvent: "pipeline_board_whatsapp",
    });
  };

  const getPriorityColor = (p: string | null) => {
    if (p === "hot") return "bg-red-100 text-red-700 border-red-200";
    if (p === "warm") return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  return (
    <div className="space-y-5">
      {/* KPI Header - Rich Gradient Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 p-5 sm:p-6 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" />
        <div className="relative">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            Lead Pipeline
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Leads", value: totalLeads, icon: UserPlus, bgColor: "bg-blue-500/20" },
              { label: "Won (Issued)", value: wonCount, icon: CheckCircle2, bgColor: "bg-emerald-400/20" },
              { label: "Conversion", value: `${convRate}%`, icon: TrendingUp, bgColor: "bg-violet-400/20" },
              { label: "In Pipeline", value: totalLeads - wonCount - (stageCounts["lost"] || 0), icon: Clock, bgColor: "bg-orange-400/20" },
            ].map(kpi => (
              <div key={kpi.label} className={`${kpi.bgColor} backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10`}>
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
        <Button
          size="sm"
          variant={selectedStage === "all" ? "default" : "outline"}
          onClick={() => setSelectedStage("all")}
          className="shrink-0 h-8 text-xs"
        >
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
              onDragOver={(e) => handleStageDragOver(e, stage.value)}
              onDrop={(e) => handleStageDrop(e, stage.value)}
              className={`shrink-0 h-8 text-xs gap-1.5 ${selectedStage === stage.value ? "" : stage.text} ${dragOverStage === stage.value ? 'ring-2 ring-primary/40' : ''}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {stage.label}
              {count > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1">{count}</Badge>}
            </Button>
          );
        })}
      </div>

      {/* Toolbar: Search + Filters + Import/Export */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, phone, vehicle, city..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="h-4 px-1 text-[10px] ml-1">{activeFilterCount}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4 space-y-3" align="end">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Filters</p>
                {activeFilterCount > 0 && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={clearAllFilters}>
                    <X className="h-3 w-3 mr-1" /> Clear all
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="hot">🔥 Hot</SelectItem>
                    <SelectItem value="warm">🟠 Warm</SelectItem>
                    <SelectItem value="cold">❄️ Cold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lead Source</Label>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {uniqueSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">City</Label>
                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Assigned Executive</Label>
                <Select value={filterExecutive} onValueChange={setFilterExecutive}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Executives</SelectItem>
                    {uniqueExecutives.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date Range</Label>
                <Select value={filterDateRange} onValueChange={(v) => { setFilterDateRange(v); if (v !== "custom") { setCustomDateFrom(undefined); setCustomDateTo(undefined); } }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="90days">Last 90 Days</SelectItem>
                    <SelectItem value="this_quarter">This Quarter</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filterDateRange === "custom" && (
                <div className="space-y-2 rounded-md border p-2">
                  <Label className="text-xs">From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-8 text-xs justify-start">
                        <CalendarIcon className="h-3 w-3 mr-2" />
                        {customDateFrom ? format(customDateFrom, "dd MMM yyyy") : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customDateFrom} onSelect={setCustomDateFrom} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <Label className="text-xs">To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-8 text-xs justify-start">
                        <CalendarIcon className="h-3 w-3 mr-2" />
                        {customDateTo ? format(customDateTo, "dd MMM yyyy") : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customDateTo} onSelect={setCustomDateTo} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {(() => {
                      const months: { value: string; label: string }[] = [];
                      const now = new Date();
                      for (let i = 0; i < 12; i++) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        months.push({ value: `${d.getFullYear()}-${d.getMonth()}`, label: format(d, "MMM yyyy") });
                      }
                      return months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>);
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>

          {onNavigate && (
            <Button size="sm" variant="default" className="h-9 gap-1.5 text-xs" onClick={() => onNavigate("smart-calling")}>
              <PhoneCall className="h-3.5 w-3.5" /> Smart Calling
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-muted-foreground">Active:</span>
          {filterPriority !== "all" && (
            <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setFilterPriority("all")}>
              Priority: {filterPriority} <X className="h-3 w-3" />
            </Badge>
          )}
          {filterSource !== "all" && (
            <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setFilterSource("all")}>
              Source: {filterSource} <X className="h-3 w-3" />
            </Badge>
          )}
          {filterCity !== "all" && (
            <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setFilterCity("all")}>
              City: {filterCity} <X className="h-3 w-3" />
            </Badge>
          )}
          {filterExecutive !== "all" && (
            <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setFilterExecutive("all")}>
              Executive: {filterExecutive} <X className="h-3 w-3" />
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-2">{filtered.length} results</span>
        </div>
      )}

      {/* Next Action Hint */}
      {selectedStage !== "all" && (
        <div className="p-3 rounded-lg bg-muted/50 border border-dashed text-sm">
          <span className="font-medium">Next Action: </span>
          {NEXT_ACTIONS[selectedStage] || "—"}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map(client => {
            const stage = PIPELINE_STAGES.find(s => s.value === (client.pipeline_stage || "new_lead")) || PIPELINE_STAGES[0];
            const stageIdx = PIPELINE_STAGES.findIndex(s => s.value === stage.value);
            const phone = displayPhone(client.phone);
            const waLink = null; // wa.me removed, using API
            const daysToExpiry = client.policy_expiry_date ? differenceInDays(new Date(client.policy_expiry_date), new Date()) : null;

            return (
              <motion.div
                key={client.id}
                layout
                draggable
                onDragStart={() => handleCardDragStart(client)}
                onDragEnd={handleCardDragEnd}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`border ${stage.border} hover:shadow-lg transition-all duration-300 group cursor-pointer hover:-translate-y-0.5 overflow-hidden`} onClick={() => setSelectedClient(client)}>
                  <div className={`h-1 bg-gradient-to-r ${stage.color}`} />
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stage.color} flex items-center justify-center shadow-sm`}>
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-sm leading-tight">{client.customer_name || "Unknown"}</p>
                          <p className="text-[11px] text-muted-foreground">{client.city || "—"} • {format(new Date(client.created_at), "dd MMM")}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {client.priority && (
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getPriorityColor(client.priority)}`}>
                            {client.priority === "hot" ? "🔥 Hot" : client.priority === "warm" ? "🟠 Warm" : "❄️ Cold"}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${stage.bg} ${stage.text} border ${stage.border}`}>
                          {stage.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Info Grid */}
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
                      {client.vehicle_model && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Shield className="h-3 w-3 shrink-0" /> {client.vehicle_make} {client.vehicle_model}
                        </div>
                      )}
                      {client.current_insurer && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <FileText className="h-3 w-3 shrink-0" /> {client.current_insurer}
                        </div>
                      )}
                      {daysToExpiry !== null && (
                        <div className={`flex items-center gap-1.5 font-semibold ${daysToExpiry <= 7 ? "text-red-600" : daysToExpiry <= 30 ? "text-orange-600" : "text-muted-foreground"}`}>
                          <Clock className="h-3 w-3 shrink-0" /> {daysToExpiry < 0 ? `Expired ${Math.abs(daysToExpiry)}d ago` : `${daysToExpiry}d to expiry`}
                        </div>
                      )}
                      {client.current_premium && (
                        <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                          <CreditCard className="h-3 w-3 shrink-0" /> ₹{client.current_premium.toLocaleString("en-IN")}
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="flex gap-0.5">
                      {PIPELINE_STAGES.slice(0, 7).map((s, i) => (
                        <div key={s.value} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= stageIdx && stageIdx < 7 ? s.dot : "bg-muted"}`} />
                      ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-all duration-200 pt-1 border-t border-border/30" onClick={e => e.stopPropagation()}>
                      {phone && (
                        <>
                          <a href={`tel:${client.phone}`}>
                            <Button size="icon" variant="ghost" className="h-7 w-7"><PhoneCall className="h-3.5 w-3.5 text-primary" /></Button>
                          </a>
                          {phone && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleWhatsApp(client.phone, client.customer_name || "")}>
                              <MessageSquare className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          )}
                        </>
                      )}
                      {/* Move Stage Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 ml-auto">
                            Move <ChevronRight className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {PIPELINE_STAGES.filter(s => s.value !== (client.pipeline_stage || "new_lead")).map(s => {
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
          <p className="text-sm">No leads in this stage</p>
        </div>
      )}

      {/* Lost Reason Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Why was this lead lost?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {LOST_REASONS.map(r => (
              <Button key={r} variant={lostReason === r ? "default" : "outline"} size="sm" className="mr-2 mb-1" onClick={() => setLostReason(r)}>
                {r}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={confirmLostMove} disabled={!lostReason} className="bg-red-600 hover:bg-red-700">Mark as Lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Detail Sheet */}
      <Dialog open={!!selectedClient && !showMoveDialog} onOpenChange={(o) => {
        if (!o) { setSelectedClient(null); setEditFields({}); }
        else if (selectedClient) {
          setEditFields({
            customer_name: selectedClient.customer_name || "",
            phone: selectedClient.phone || "",
            email: selectedClient.email || "",
            city: selectedClient.city || "",
            vehicle_number: selectedClient.vehicle_number || "",
            vehicle_make: selectedClient.vehicle_make || "",
            vehicle_model: selectedClient.vehicle_model || "",
            vehicle_year: selectedClient.vehicle_year ? String(selectedClient.vehicle_year) : "",
            current_insurer: selectedClient.current_insurer || "",
            current_policy_type: selectedClient.current_policy_type || "",
            current_premium: selectedClient.current_premium ? String(selectedClient.current_premium) : "",
            ncb_percentage: selectedClient.ncb_percentage ? String(selectedClient.ncb_percentage) : "",
          });
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedClient && (() => {
            const stage = PIPELINE_STAGES.find(s => s.value === (selectedClient.pipeline_stage || "new_lead")) || PIPELINE_STAGES[0];
            const phone = displayPhone(selectedClient.phone);

            const initEditIfEmpty = () => {
              if (Object.keys(editFields).length === 0) {
                setEditFields({
                  customer_name: selectedClient.customer_name || "",
                  phone: selectedClient.phone || "",
                  email: selectedClient.email || "",
                  city: selectedClient.city || "",
                  vehicle_number: selectedClient.vehicle_number || "",
                  vehicle_make: selectedClient.vehicle_make || "",
                  vehicle_model: selectedClient.vehicle_model || "",
                  vehicle_year: selectedClient.vehicle_year ? String(selectedClient.vehicle_year) : "",
                  current_insurer: selectedClient.current_insurer || "",
                  current_policy_type: selectedClient.current_policy_type || "",
                  current_premium: selectedClient.current_premium ? String(selectedClient.current_premium) : "",
                  ncb_percentage: selectedClient.ncb_percentage ? String(selectedClient.ncb_percentage) : "",
                });
              }
            };
            initEditIfEmpty();

            const updateField = (key: string, value: string) => setEditFields(f => ({ ...f, [key]: value }));

            const saveEdits = async () => {
              setSavingEdit(true);
              try {
                const normalizedPhone = (editFields.phone || selectedClient.phone || "").replace(/\D/g, "");
                const normalizedVehicleNumber = (editFields.vehicle_number || "")
                  .replace(/[^A-Z0-9]/gi, "")
                  .toUpperCase();

                const updates: Record<string, any> = {
                  customer_name: editFields.customer_name?.trim() || null,
                  phone: normalizedPhone || selectedClient.phone,
                  email: editFields.email?.trim() || null,
                  city: editFields.city?.trim() || null,
                  vehicle_number: normalizedVehicleNumber || null,
                  vehicle_make: editFields.vehicle_make?.trim() || null,
                  vehicle_model: editFields.vehicle_model?.trim() || null,
                  vehicle_year: editFields.vehicle_year ? Number(editFields.vehicle_year) : null,
                  current_insurer: editFields.current_insurer?.trim() || null,
                  current_policy_type: editFields.current_policy_type?.trim() || null,
                  current_premium: editFields.current_premium ? Number(editFields.current_premium) : null,
                  ncb_percentage: editFields.ncb_percentage ? Number(editFields.ncb_percentage) : null,
                };
                const { data, error } = await supabase
                  .from("insurance_clients")
                  .update(updates)
                  .eq("id", selectedClient.id)
                  .select("id, customer_name, phone, email, city, vehicle_number, vehicle_make, vehicle_model, vehicle_year, current_insurer, policy_expiry_date, current_policy_type, ncb_percentage, previous_claim, lead_source, lead_status, assigned_executive, priority, pipeline_stage, contact_attempts, quote_amount, quote_insurer, lost_reason, follow_up_date, current_premium, notes, created_at")
                  .maybeSingle();
                if (error) throw error;
                const refreshedClient = (data ? { ...data, pipeline_stage: data.pipeline_stage || "new_lead" } : { ...selectedClient, ...updates }) as Client;
                toast.success("✅ Lead details updated!");
                queryClient.invalidateQueries({ queryKey: ["insurance-pipeline-clients"] });
                setSelectedClient(refreshedClient);
                setEditFields({
                  customer_name: refreshedClient.customer_name || "",
                  phone: refreshedClient.phone || "",
                  email: refreshedClient.email || "",
                  city: refreshedClient.city || "",
                  vehicle_number: refreshedClient.vehicle_number || "",
                  vehicle_make: refreshedClient.vehicle_make || "",
                  vehicle_model: refreshedClient.vehicle_model || "",
                  vehicle_year: refreshedClient.vehicle_year ? String(refreshedClient.vehicle_year) : "",
                  current_insurer: refreshedClient.current_insurer || "",
                  current_policy_type: refreshedClient.current_policy_type || "",
                  current_premium: refreshedClient.current_premium ? String(refreshedClient.current_premium) : "",
                  ncb_percentage: refreshedClient.ncb_percentage ? String(refreshedClient.ncb_percentage) : "",
                });
              } catch (e: any) {
                toast.error(e.message || "Failed to save");
              } finally {
                setSavingEdit(false);
              }
            };

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${stage.color} flex items-center justify-center`}>
                      <User className="h-4 w-4 text-white" />
                    </div>
                    Insurance Lead
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Stage Badge */}
                  <Badge className={`${stage.bg} ${stage.text} border ${stage.border}`}>{stage.label} — {stage.team} Team</Badge>

                  {/* Next Action */}
                  <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                    <span className="font-medium">👉 Next: </span>
                    {NEXT_ACTIONS[selectedClient.pipeline_stage || "new_lead"]}
                  </div>

                  {/* Editable Customer Details */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Name</Label>
                        <Input value={editFields.customer_name || ""} onChange={e => updateField("customer_name", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Mobile</Label>
                        <Input value={editFields.phone || ""} onChange={e => updateField("phone", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Email</Label>
                        <Input value={editFields.email || ""} onChange={e => updateField("email", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">City</Label>
                        <Input value={editFields.city || ""} onChange={e => updateField("city", e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Editable Vehicle Details */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Vehicle Number</Label>
                        <Input value={editFields.vehicle_number || ""} onChange={e => updateField("vehicle_number", e.target.value.toUpperCase())} placeholder="e.g. DL01AB1234" className="h-8 text-sm font-mono uppercase" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Make</Label>
                        <Input value={editFields.vehicle_make || ""} onChange={e => updateField("vehicle_make", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Model</Label>
                        <Input value={editFields.vehicle_model || ""} onChange={e => updateField("vehicle_model", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Year</Label>
                        <Input type="number" value={editFields.vehicle_year || ""} onChange={e => updateField("vehicle_year", e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Editable Insurance Details */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Insurance</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Insurer</Label>
                        <Input value={editFields.current_insurer || ""} onChange={e => updateField("current_insurer", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Policy Type</Label>
                        <Input value={editFields.current_policy_type || ""} onChange={e => updateField("current_policy_type", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Premium (₹)</Label>
                        <Input type="number" value={editFields.current_premium || ""} onChange={e => updateField("current_premium", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">NCB %</Label>
                        <Input type="number" value={editFields.ncb_percentage || ""} onChange={e => updateField("ncb_percentage", e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button onClick={saveEdits} disabled={savingEdit} className="w-full gap-2">
                    {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </Button>

                  {/* Notes */}
                  {selectedClient.notes && (
                    <div className="p-2 rounded bg-muted/30 text-sm">{selectedClient.notes}</div>
                  )}

                  {/* Add Note */}
                  <div className="flex gap-2">
                    <Textarea placeholder="Add a note..." value={note} onChange={e => setNote(e.target.value)} className="h-16 text-sm" />
                    <Button size="sm" onClick={addNote} disabled={!note.trim()} className="self-end">Save</Button>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2">
                    {phone && (
                      <>
                        <a href={`tel:${selectedClient.phone}`}>
                          <Button size="sm" variant="outline" className="gap-1.5 text-emerald-600 border-emerald-200">
                            <PhoneCall className="h-3.5 w-3.5" /> Call
                          </Button>
                        </a>
                        <Button size="sm" variant="outline" className="gap-1.5 text-emerald-600 border-emerald-200" onClick={() => handleWhatsApp(selectedClient.phone, selectedClient.customer_name || "")}>
                          <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setShowUploadPolicy(true); }}>
                      <Upload className="h-3.5 w-3.5" /> Upload Policy
                    </Button>
                  </div>

                  {/* Move Stage */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Move to Stage</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PIPELINE_STAGES.filter(s => s.value !== (selectedClient.pipeline_stage || "new_lead")).map(s => {
                        const SIcon = s.icon;
                        return (
                          <Button key={s.value} size="sm" variant="outline" className={`text-xs gap-1 ${s.text} border ${s.border}`}
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

      {/* Upload Policy Document Dialog */}
      <Dialog open={showUploadPolicy} onOpenChange={setShowUploadPolicy}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Upload Policy Document</DialogTitle>
          </DialogHeader>
          <InsurancePolicyDocumentUploader defaultClientId={selectedClient?.id || undefined} onDone={() => { setShowUploadPolicy(false); queryClient.invalidateQueries({ queryKey: ["insurance-pipeline-clients"] }); }} />
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Import Insurance Leads
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-dashed bg-muted/30 text-center space-y-3">
              <Database className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Upload CSV File</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Required columns: <span className="font-mono text-[10px]">customer_name, phone</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Optional: <span className="font-mono text-[10px]">email, city, vehicle_number, vehicle_make, vehicle_model, current_insurer, lead_source, priority</span>
                </p>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
              <Button size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                <Upload className="h-3.5 w-3.5" /> Choose CSV File
              </Button>
            </div>
            {onNavigate && (
              <Button variant="outline" className="w-full gap-2 text-sm" onClick={() => { setShowImportDialog(false); onNavigate("services-insurance-import"); }}>
                <Database className="h-4 w-4" /> Advanced Import (Excel/Insurance Data)
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

