import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, PhoneCall, ChevronLeft, ChevronRight, User, Car, Shield, Download,
  FileText, Plus, Upload, SkipForward, Shuffle, Search, Clock,
  CheckCircle2, XCircle, ArrowRight, Eye, Edit, Save, Loader2, PhoneOff,
  MapPin, Mail, Hash, CalendarDays, AlertTriangle, PhoneForwarded, Ban, HelpCircle,
  Zap, Activity, Target, Headphones, BarChart3, Flame, Sparkles, Send, RefreshCw,
  MessageCircle, Copy, ExternalLink, CheckSquare, Square, Users
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import InsuranceQuoteModal from "./InsuranceQuoteModal";
import { generateRenewalReminderPdf } from "@/lib/generateRenewalReminderPdf";
import { generateInsuranceQuotePdf } from "@/lib/generateInsuranceQuotePdf";
import { Checkbox } from "@/components/ui/checkbox";
import { SharePdfDialog } from "./SharePdfDialog";

interface SmartCallingClient {
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
  assigned_executive: string | null;
  priority: string | null;
  pipeline_stage: string | null;
  contact_attempts: number | null;
  current_premium: number | null;
  notes: string | null;
  created_at: string;
}

interface PolicyData {
  id: string;
  policy_number: string | null;
  insurer: string | null;
  premium_amount: number | null;
  start_date: string | null;
  expiry_date: string | null;
  policy_type: string | null;
  status: string | null;
  idv: number | null;
  ncb_discount: number | null;
  addons: string[] | null;
}

const ALL_CALLABLE_STAGES = [
  "new_lead", "contact_attempted", "requirement_collected",
  "quote_shared", "renewal_shared", "follow_up", "payment_pending", "lost"
];

const IN_PROGRESS_STAGES = [
  "new_lead", "contact_attempted", "requirement_collected",
  "quote_shared", "renewal_shared", "follow_up", "payment_pending"
];

const STAGE_FILTER_TAGS = [
  { value: "all_active", label: "All Active", icon: Target, color: "bg-emerald-500" },
  { value: "new_lead", label: "New Leads", icon: Sparkles, color: "bg-blue-500" },
  { value: "contact_attempted", label: "Contacted", icon: Phone, color: "bg-yellow-500" },
  { value: "requirement_collected", label: "Interested", icon: PhoneForwarded, color: "bg-violet-500" },
  { value: "quote_shared", label: "Quote Shared", icon: FileText, color: "bg-cyan-500" },
  { value: "renewal_shared", label: "Renewal Shared", icon: RefreshCw, color: "bg-teal-500" },
  { value: "follow_up", label: "Follow-up", icon: Clock, color: "bg-orange-500" },
  { value: "payment_pending", label: "Payment Pending", icon: Zap, color: "bg-pink-500" },
  { value: "lost", label: "Lost / Not Interested", icon: XCircle, color: "bg-red-500" },
];

const CALL_OUTCOMES = [
  { value: "connected", label: "Connected", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800", activeBg: "bg-emerald-100 dark:bg-emerald-900/50 ring-emerald-500" },
  { value: "interested", label: "Interested", icon: PhoneForwarded, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800", activeBg: "bg-blue-100 dark:bg-blue-900/50 ring-blue-500" },
  { value: "quote_requested", label: "Quote Req.", icon: FileText, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800", activeBg: "bg-violet-100 dark:bg-violet-900/50 ring-violet-500" },
  { value: "quote_shared", label: "Quote Shared", icon: Send, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800", activeBg: "bg-cyan-100 dark:bg-cyan-900/50 ring-cyan-500", prominent: true },
  { value: "renewal_shared", label: "Renewal Shared", icon: RefreshCw, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800", activeBg: "bg-teal-100 dark:bg-teal-900/50 ring-teal-500", prominent: true },
  { value: "follow_up", label: "Follow-up", icon: Clock, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800", activeBg: "bg-orange-100 dark:bg-orange-900/50 ring-orange-500" },
  { value: "no_answer", label: "No Answer", icon: PhoneOff, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800", activeBg: "bg-amber-100 dark:bg-amber-900/50 ring-amber-500" },
  { value: "not_interested", label: "Not Interested", icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800", activeBg: "bg-red-100 dark:bg-red-900/50 ring-red-500" },
  { value: "wrong_number", label: "Wrong No.", icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-800", activeBg: "bg-yellow-100 dark:bg-yellow-900/50 ring-yellow-500" },
];

function DetailRow({ label, value, icon: Icon, missing }: { label: string; value: string | number | null | undefined; icon?: any; missing?: boolean }) {
  const isMissing = missing !== false && !value;
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/20 last:border-0 group">
      <span className="text-muted-foreground text-[13px] flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 opacity-50" />}
        {label}
      </span>
      <span className={`font-medium text-[13px] text-right max-w-[60%] truncate ${isMissing ? "text-orange-500 italic text-xs flex items-center gap-1" : ""}`}>
        {isMissing ? (
          <><AlertTriangle className="h-3 w-3" /> Missing</>
        ) : value}
      </span>
    </div>
  );
}

function StatChip({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-card border border-border/50 shadow-sm">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

export function InsuranceSmartCalling() {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [callMode, setCallMode] = useState<"in_progress" | "random">("in_progress");
  const [callNote, setCallNote] = useState("");
  const [callOutcome, setCallOutcome] = useState<string>("");
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [dialedNumbers, setDialedNumbers] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stageFilter, setStageFilter] = useState<string>("all_active");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [executiveFilter, setExecutiveFilter] = useState<string>("all");
  const [outcomeMarked, setOutcomeMarked] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_make: "", vehicle_model: "", vehicle_number: "", vehicle_year: "",
    current_insurer: "", policy_expiry_date: "", current_policy_type: "", ncb_percentage: "", current_premium: "",
  });
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [showShareQuote, setShowShareQuote] = useState(false);
  const [showShareRenewal, setShowShareRenewal] = useState(false);

  // Only show policies with renewals coming within 60 days
  const renewalCutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split("T")[0];
  }, []);

  const { data: allClients = [], isLoading } = useQuery({
    queryKey: ["smart-calling-clients", stageFilter, renewalCutoffDate],
    queryFn: async () => {
      const stages = stageFilter === "all_active" ? IN_PROGRESS_STAGES :
                     stageFilter === "lost" ? ["lost"] : [stageFilter];
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, email, city, vehicle_number, vehicle_make, vehicle_model, vehicle_year, current_insurer, policy_expiry_date, current_policy_type, ncb_percentage, previous_claim, lead_source, assigned_executive, priority, pipeline_stage, contact_attempts, current_premium, notes, created_at")
        .in("pipeline_stage", stages)
        .not("policy_expiry_date", "is", null)
        .lte("policy_expiry_date", renewalCutoffDate)
        .order("policy_expiry_date", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data || []) as SmartCallingClient[];
    },
  });

  // Derive unique filter options from data
  const filterOptions = useMemo(() => {
    const sources = new Set<string>();
    const cities = new Set<string>();
    const executives = new Set<string>();
    allClients.forEach(c => {
      if (c.lead_source) sources.add(c.lead_source);
      if (c.city) cities.add(c.city);
      if (c.assigned_executive) executives.add(c.assigned_executive);
    });
    return {
      sources: Array.from(sources).sort(),
      cities: Array.from(cities).sort(),
      executives: Array.from(executives).sort(),
    };
  }, [allClients]);

  const callingList = useMemo(() => {
    let list = [...allClients].filter(c => c.phone && !c.phone.startsWith("IB_"));
    if (priorityFilter !== "all") {
      list = list.filter(c => c.priority === priorityFilter);
    }
    if (sourceFilter !== "all") {
      list = list.filter(c => c.lead_source === sourceFilter);
    }
    if (cityFilter !== "all") {
      list = list.filter(c => c.city?.toLowerCase() === cityFilter.toLowerCase());
    }
    if (executiveFilter !== "all") {
      list = list.filter(c => c.assigned_executive === executiveFilter);
    }
    if (searchFilter.trim()) {
      const s = searchFilter.toLowerCase();
      list = list.filter(c =>
        c.customer_name?.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        c.vehicle_number?.toLowerCase().includes(s)
      );
    }
    if (callMode === "random") {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    return list;
  }, [allClients, callMode, searchFilter, priorityFilter, sourceFilter, cityFilter, executiveFilter]);

  const currentClient = callingList[currentIndex] || null;

  const { data: clientPolicies = [] } = useQuery({
    queryKey: ["smart-calling-policy", currentClient?.id],
    queryFn: async () => {
      if (!currentClient?.id) return [];
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("id, policy_number, insurer, premium_amount, start_date, expiry_date, policy_type, status, idv, ncb_discount, addons")
        .eq("client_id", currentClient.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PolicyData[];
    },
    enabled: !!currentClient?.id,
  });

  const activePolicy = clientPolicies.find(p => p.status === "active") || clientPolicies[0] || null;

  const dialPhone = useCallback((phone: string) => {
    const clean = phone.replace(/\D/g, "");
    const fullPhone = clean.startsWith("91") ? clean : `91${clean}`;
    window.open(`tel:+${fullPhone}`, "_self");
    setDialedNumbers(prev => new Set(prev).add(phone));
    if (currentClient) {
      supabase.from("insurance_activity_log").insert({
        client_id: currentClient.id, activity_type: "call_attempted",
        title: "Smart Calling dial",
        description: `Called ${currentClient.customer_name || phone} via Smart Calling`,
      }).then(() => {});
      supabase.from("insurance_clients").update({
        contact_attempts: (currentClient.contact_attempts || 0) + 1,
      }).eq("id", currentClient.id).then(() => {});
    }
  }, [currentClient]);

  const goToNext = useCallback(() => {
    if (currentIndex < callingList.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCallNote("");
      setCallOutcome("");
      setOutcomeMarked(false);
    } else {
      toast.info("🎉 You've reached the end of the calling list!");
    }
  }, [currentIndex, callingList.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setCallNote("");
      setCallOutcome("");
      setOutcomeMarked(false);
    }
  }, [currentIndex]);

  // Dial only - no auto-advance. Lead moves to next only after outcome is marked.
  const dialOnly = useCallback(() => {
    if (!currentClient) return;
    dialPhone(currentClient.phone);
  }, [currentClient, dialPhone]);

  const saveCallOutcome = useCallback(async () => {
    if (!currentClient || !callOutcome) {
      toast.error("Select a call outcome");
      return;
    }
    setSaving(true);
    try {
      await supabase.from("insurance_activity_log").insert({
        client_id: currentClient.id, activity_type: "call_completed",
        title: `Call outcome: ${callOutcome}`,
        description: callNote || `Smart Calling: ${callOutcome}`,
        metadata: { outcome: callOutcome, notes: callNote },
      });
      const stageUpdate: Record<string, string> = {
        "connected": "contact_attempted", "interested": "requirement_collected",
        "quote_requested": "quote_shared", "quote_shared": "quote_shared",
        "renewal_shared": "renewal_shared", "follow_up": "follow_up",
        "not_interested": "lost", "no_answer": currentClient.pipeline_stage || "contact_attempted",
        "wrong_number": "lost",
      };
      const newStage = stageUpdate[callOutcome];
      if (newStage && newStage !== currentClient.pipeline_stage) {
        await supabase.from("insurance_clients")
          .update({
            pipeline_stage: newStage,
            ...(callOutcome === "not_interested" ? { lost_reason: callNote || "Not interested" } : {}),
          })
          .eq("id", currentClient.id);
      }
      toast.success("✅ Outcome saved!");
      setOutcomeMarked(true);
      queryClient.invalidateQueries({ queryKey: ["smart-calling-clients"] });
      goToNext();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [currentClient, callOutcome, callNote, queryClient, goToNext]);

  const startEditingVehicle = useCallback(() => {
    if (!currentClient) return;
    setVehicleForm({
      vehicle_make: currentClient.vehicle_make || "",
      vehicle_model: currentClient.vehicle_model || "",
      vehicle_number: currentClient.vehicle_number || "",
      vehicle_year: currentClient.vehicle_year?.toString() || "",
      current_insurer: currentClient.current_insurer || "",
      policy_expiry_date: currentClient.policy_expiry_date || "",
      current_policy_type: currentClient.current_policy_type || "",
      ncb_percentage: currentClient.ncb_percentage?.toString() || "",
      current_premium: currentClient.current_premium?.toString() || "",
    });
    setEditingVehicle(true);
  }, [currentClient]);

  const saveVehicleDetails = useCallback(async () => {
    if (!currentClient) return;
    setSavingVehicle(true);
    try {
      const { error } = await supabase.from("insurance_clients").update({
        vehicle_make: vehicleForm.vehicle_make || null,
        vehicle_model: vehicleForm.vehicle_model || null,
        vehicle_number: vehicleForm.vehicle_number || null,
        vehicle_year: vehicleForm.vehicle_year ? Number(vehicleForm.vehicle_year) : null,
        current_insurer: vehicleForm.current_insurer || null,
        policy_expiry_date: vehicleForm.policy_expiry_date || null,
        current_policy_type: vehicleForm.current_policy_type || null,
        ncb_percentage: vehicleForm.ncb_percentage ? Number(vehicleForm.ncb_percentage) : null,
        current_premium: vehicleForm.current_premium ? Number(vehicleForm.current_premium) : null,
      }).eq("id", currentClient.id);
      if (error) throw error;
      toast.success("✅ Vehicle details updated!");
      setEditingVehicle(false);
      queryClient.invalidateQueries({ queryKey: ["smart-calling-clients"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSavingVehicle(false);
    }
  }, [currentClient, vehicleForm, queryClient]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").filter(Boolean);
    if (lines.length < 2) { toast.error("Empty file"); return; }
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
    const nameIdx = headers.findIndex(h => h.includes("name"));
    const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile"));
    if (phoneIdx < 0) { toast.error("No phone column found"); return; }
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim().replace(/['"]/g, ""));
      const phone = cols[phoneIdx]?.replace(/\D/g, "");
      if (!phone || phone.length < 10) continue;
      const { error } = await supabase.from("insurance_clients").upsert({
        phone: phone.length > 10 ? phone.slice(-10) : phone,
        customer_name: nameIdx >= 0 ? cols[nameIdx] || null : null,
        pipeline_stage: "new_lead", lead_source: "smart_calling_import",
      }, { onConflict: "phone", ignoreDuplicates: true });
      if (!error) imported++;
    }
    toast.success(`Imported ${imported} leads for Smart Calling`);
    queryClient.invalidateQueries({ queryKey: ["smart-calling-clients"] });
    setShowImport(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [queryClient]);

  const [policyForm, setPolicyForm] = useState({
    policy_number: "", insurer: "", premium_amount: "", start_date: "",
    expiry_date: "", policy_type: "comprehensive", idv: "", ncb_percentage: "",
  });

  const savePolicy = useCallback(async () => {
    if (!currentClient || !policyForm.policy_number) {
      toast.error("Policy number is required");
      return;
    }
    setSaving(true);
    try {
      const { data: oldPolicies } = await supabase
        .from("insurance_policies").select("id").eq("client_id", currentClient.id).eq("status", "active");
      if (oldPolicies && oldPolicies.length > 0) {
        await supabase.from("insurance_policies").update({ status: "renewed" }).in("id", oldPolicies.map(p => p.id));
      }
      await supabase.from("insurance_policies").insert({
        client_id: currentClient.id, policy_number: policyForm.policy_number,
        insurer: policyForm.insurer || null,
        premium_amount: policyForm.premium_amount ? Number(policyForm.premium_amount) : null,
        start_date: policyForm.start_date || null, expiry_date: policyForm.expiry_date || null,
        policy_type: policyForm.policy_type,
        idv: policyForm.idv ? Number(policyForm.idv) : null,
        ncb_discount: policyForm.ncb_percentage ? Number(policyForm.ncb_percentage) : null,
        status: "active",
      });
      toast.success("✅ Policy added!");
      setShowAddPolicy(false);
      setPolicyForm({ policy_number: "", insurer: "", premium_amount: "", start_date: "", expiry_date: "", policy_type: "comprehensive", idv: "", ncb_percentage: "" });
      queryClient.invalidateQueries({ queryKey: ["smart-calling-policy"] });
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setSaving(false);
    }
  }, [currentClient, policyForm, queryClient]);

  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 10) return `${clean.slice(0, 5)} ${clean.slice(5)}`;
    return phone;
  };

  const getStageLabel = (stage: string | null) => {
    const stages: Record<string, string> = {
      new_lead: "New Lead", contact_attempted: "Contacted", requirement_collected: "Interested",
      quote_shared: "Quote Shared", renewal_shared: "Renewal Shared", follow_up: "Follow-up", payment_pending: "Payment Pending",
      lost: "Lost",
    };
    return stages[stage || ""] || stage || "New";
  };

  const getStageColor = (stage: string | null) => {
    const colors: Record<string, string> = {
      new_lead: "bg-blue-500", contact_attempted: "bg-yellow-500", requirement_collected: "bg-violet-500",
      quote_shared: "bg-cyan-500", renewal_shared: "bg-teal-500", follow_up: "bg-orange-500", payment_pending: "bg-pink-500",
      lost: "bg-red-500",
    };
    return colors[stage || ""] || "bg-muted-foreground";
  };

  const getPriorityConfig = (p: string | null) => {
    if (p === "hot") return { label: "🔥 Hot", className: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800" };
    if (p === "high" || p === "warm") return { label: "🟠 Warm", className: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800" };
    if (p === "medium") return { label: "🟡 Medium", className: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-400 dark:border-yellow-800" };
    return { label: "❄️ Cold", className: "bg-muted text-muted-foreground" };
  };

  const progressPercent = callingList.length > 0 ? ((currentIndex + 1) / callingList.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading calling queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header with Stats ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 p-5 sm:p-6 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-60" />
        <div className="relative flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Headphones className="h-5 w-5" />
              </div>
              Smart Calling
            </h2>
            <p className="text-emerald-100 text-sm mt-1.5">
              {callingList.length} renewals within 60 days • {dialedNumbers.size} dialed this session
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v); setCurrentIndex(0); }}>
              <SelectTrigger className="w-[180px] h-9 text-sm bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                {STAGE_FILTER_TAGS.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${t.color}`} />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={callMode} onValueChange={(v) => { setCallMode(v as any); setCurrentIndex(0); }}>
              <SelectTrigger className="w-[120px] h-9 text-sm bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_progress">📋 Sequential</SelectItem>
                <SelectItem value="random">🎲 Random</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50" />
              <Input
                placeholder="Filter..."
                value={searchFilter}
                onChange={e => { setSearchFilter(e.target.value); setCurrentIndex(0); }}
                className="pl-8 h-9 w-36 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="gap-1.5 h-9 bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Upload className="h-4 w-4" /> Import
            </Button>
          </div>
        </div>

        {/* Pipeline-style Filters */}
        <div className="relative flex flex-wrap gap-2 mt-4">
          <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setCurrentIndex(0); }}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="hot">🔥 Hot</SelectItem>
              <SelectItem value="warm">🟠 Warm</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="cold">❄️ Cold</SelectItem>
            </SelectContent>
          </Select>
          {filterOptions.sources.length > 0 && (
            <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setCurrentIndex(0); }}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {filterOptions.sources.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {filterOptions.cities.length > 0 && (
            <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setCurrentIndex(0); }}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {filterOptions.cities.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {filterOptions.executives.length > 0 && (
            <Select value={executiveFilter} onValueChange={(v) => { setExecutiveFilter(v); setCurrentIndex(0); }}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Executive" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Executives</SelectItem>
                {filterOptions.executives.map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(priorityFilter !== "all" || sourceFilter !== "all" || cityFilter !== "all" || executiveFilter !== "all") && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-white/70 hover:text-white hover:bg-white/10" onClick={() => { setPriorityFilter("all"); setSourceFilter("all"); setCityFilter("all"); setExecutiveFilter("all"); setCurrentIndex(0); }}>
              ✕ Clear Filters
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 text-xs gap-1.5 ml-auto ${bulkMode ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"}`}
            onClick={() => { setBulkMode(!bulkMode); setSelectedLeads(new Set()); }}
          >
            <Users className="h-3.5 w-3.5" /> {bulkMode ? "Exit Bulk" : "Bulk Send"}
          </Button>
        </div>


        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: "Queue", value: callingList.length, icon: Target },
            { label: "Dialed", value: dialedNumbers.size, icon: Phone },
            { label: "Position", value: `${currentIndex + 1}`, icon: Activity },
            { label: "Remaining", value: Math.max(0, callingList.length - currentIndex - 1), icon: BarChart3 },
          ].map(s => (
            <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/10">
              <div className="flex items-center gap-2">
                <s.icon className="h-4 w-4 text-emerald-200" />
                <span className="text-[10px] uppercase tracking-wider text-emerald-200">{s.label}</span>
              </div>
              <p className="text-xl font-bold mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="relative mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-white/15 overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <span className="text-xs font-bold text-emerald-100 bg-white/15 px-2.5 py-1 rounded-full">
            {Math.round(progressPercent)}%
          </span>
        </div>
      </div>

      {/* ── BULK SEND PANEL ── */}
      {bulkMode && callingList.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-2xl overflow-hidden">
            {/* Gradient header */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Bulk Quote & Renewal Sender</h3>
                    <p className="text-xs text-white/80">{selectedLeads.size} of {callingList.length} leads selected • Send Quote + Renewal in one go</p>
                  </div>
                </div>
                <Button
                  variant="outline" size="sm" className="h-8 text-xs gap-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => {
                    if (selectedLeads.size === callingList.length) {
                      setSelectedLeads(new Set());
                    } else {
                      setSelectedLeads(new Set(callingList.map(c => c.id)));
                    }
                  }}
                >
                  {selectedLeads.size === callingList.length ? <Square className="h-3 w-3" /> : <CheckSquare className="h-3 w-3" />}
                  {selectedLeads.size === callingList.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
            </div>

            <CardContent className="p-5 space-y-4">
              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Download Quotes */}
                <Button
                  className="h-auto py-3 gap-2 flex-col bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                  disabled={selectedLeads.size === 0 || bulkSending}
                  onClick={async () => {
                    setBulkSending(true);
                    const selected = callingList.filter(c => selectedLeads.has(c.id));
                    let count = 0;
                    for (const client of selected) {
                      try {
                        generateInsuranceQuotePdf({
                          customerName: client.customer_name || "Customer", phone: client.phone,
                          email: client.email || undefined, city: client.city || undefined,
                          vehicleMake: client.vehicle_make || "N/A", vehicleModel: client.vehicle_model || "N/A",
                          vehicleNumber: client.vehicle_number || "N/A", vehicleYear: client.vehicle_year || new Date().getFullYear(),
                          fuelType: "Petrol", insuranceCompany: client.current_insurer || "Best Available",
                          policyType: client.current_policy_type || "comprehensive", idv: 500000,
                          basicOD: 8000, odDiscount: 1500, ncbDiscount: Math.round((client.ncb_percentage || 0) * 80),
                          thirdParty: 6521, securePremium: 500, addonPremium: 3500,
                          addons: ["Zero Depreciation", "Engine Protection", "Roadside Assistance (RSA)"],
                        }, { skipDownload: true });
                        count++;
                        await new Promise(r => setTimeout(r, 300));
                      } catch (e) { console.error(`Failed PDF for ${client.customer_name}:`, e); }
                    }
                    const ids = selected.map(c => c.id);
                    await supabase.from("insurance_clients").update({ pipeline_stage: "quote_shared" }).in("id", ids);
                    queryClient.invalidateQueries({ queryKey: ["smart-calling-clients"] });
                    setBulkSending(false); setSelectedLeads(new Set());
                    toast.success(`📄 ${count} Quote PDFs generated!`);
                  }}
                >
                  {bulkSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  <span className="text-xs font-bold">Download Quotes ({selectedLeads.size})</span>
                </Button>

                {/* Download Renewals */}
                <Button
                  variant="outline"
                  className="h-auto py-3 gap-2 flex-col border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  disabled={selectedLeads.size === 0 || bulkSending}
                  onClick={async () => {
                    setBulkSending(true);
                    const selected = callingList.filter(c => selectedLeads.has(c.id));
                    let count = 0;
                    for (const client of selected) {
                      try {
                        generateRenewalReminderPdf({
                          customerName: client.customer_name || "Customer", phone: client.phone,
                          email: client.email || undefined, city: client.city || undefined,
                          vehicleMake: client.vehicle_make || "N/A", vehicleModel: client.vehicle_model || "N/A",
                          vehicleNumber: client.vehicle_number || "N/A", vehicleYear: client.vehicle_year || new Date().getFullYear(),
                          currentInsurer: client.current_insurer || "N/A",
                          policyType: client.current_policy_type || "comprehensive",
                          policyExpiry: client.policy_expiry_date || new Date().toISOString(),
                          currentPremium: client.current_premium || 0, ncbPercentage: client.ncb_percentage || 0,
                        });
                        count++;
                        await new Promise(r => setTimeout(r, 300));
                      } catch (e) { console.error(`Failed PDF for ${client.customer_name}:`, e); }
                    }
                    const ids = selected.map(c => c.id);
                    await supabase.from("insurance_clients").update({ pipeline_stage: "renewal_shared" }).in("id", ids);
                    queryClient.invalidateQueries({ queryKey: ["smart-calling-clients"] });
                    setBulkSending(false); setSelectedLeads(new Set());
                    toast.success(`🔔 ${count} Renewal PDFs generated!`);
                  }}
                >
                  {bulkSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="text-xs font-bold">Renewals ({selectedLeads.size})</span>
                </Button>

                {/* Bulk WhatsApp (wa.me) */}
                <Button
                  className="h-auto py-3 gap-2 flex-col bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-lg"
                  disabled={selectedLeads.size === 0 || bulkSending}
                  onClick={async () => {
                    setBulkSending(true);
                    const selected = callingList.filter(c => selectedLeads.has(c.id));
                    let count = 0;
                    const { sendWhatsAppBulk } = await import("@/lib/sendWhatsApp");
                    const recipients = selected.map(client => {
                      const daysLeft = client.policy_expiry_date ? differenceInDays(new Date(client.policy_expiry_date), new Date()) : 0;
                      return { phone: client.phone, name: client.customer_name || "", message: `Hi ${client.customer_name || ""}! Your insurance renewal is ${daysLeft <= 0 ? "overdue" : `due in ${daysLeft} days`} for your ${client.vehicle_make || ""} ${client.vehicle_model || ""} (${client.vehicle_number || ""}).\n\nCurrent Insurer: ${client.current_insurer || "N/A"}\nNCB: ${client.ncb_percentage ?? 0}%\n\nWe have the best renewal offers. Contact us!\n📞 +91 98559 24442\n🌐 www.grabyourcar.com\n- Grabyourcar Insurance` };
                    });
                    await sendWhatsAppBulk(recipients);
                    setBulkSending(false);
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs font-bold">WhatsApp ({selectedLeads.size})</span>
                </Button>

                {/* Bulk WhatsApp API */}
                <Button
                  className="h-auto py-3 gap-2 flex-col bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-lg"
                  disabled={selectedLeads.size === 0 || bulkSending}
                  onClick={async () => {
                    setBulkSending(true);
                    const selected = callingList.filter(c => selectedLeads.has(c.id));
                    let sent = 0;
                    for (const client of selected) {
                      const cleanPhone = client.phone.replace(/\D/g, "");
                      const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
                      const daysLeft = client.policy_expiry_date ? differenceInDays(new Date(client.policy_expiry_date), new Date()) : 0;
                      try {
                        await supabase.functions.invoke("wa-automation-trigger", {
                          body: {
                            event: "insurance_renewal_bulk",
                            phone: fullPhone,
                            name: client.customer_name || "Customer",
                            leadId: client.id,
                            data: {
                              vehicle: `${client.vehicle_make || ""} ${client.vehicle_model || ""}`.trim(),
                              vehicle_number: client.vehicle_number || "N/A",
                              insurer: client.current_insurer || "N/A",
                              ncb: `${client.ncb_percentage ?? 0}%`,
                              days_left: `${daysLeft}`,
                              expiry: client.policy_expiry_date || "N/A",
                            },
                          },
                        });
                        sent++;
                      } catch (e) { console.error(`WA API failed for ${client.phone}:`, e); }
                      await new Promise(r => setTimeout(r, 200));
                    }
                    const ids = selected.map(c => c.id);
                    await supabase.from("insurance_clients").update({ pipeline_stage: "renewal_shared" }).in("id", ids);
                    queryClient.invalidateQueries({ queryKey: ["smart-calling-clients"] });
                    setBulkSending(false); setSelectedLeads(new Set());
                    toast.success(`🚀 Sent via WhatsApp API to ${sent} clients!`);
                  }}
                >
                  {bulkSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  <span className="text-xs font-bold">WA API ({selectedLeads.size})</span>
                </Button>
              </div>

              {/* Selectable lead list */}
              <ScrollArea className="max-h-[320px]">
                <div className="space-y-1.5">
                  {callingList.map(c => {
                    const isSelected = selectedLeads.has(c.id);
                    const daysLeft = c.policy_expiry_date ? differenceInDays(new Date(c.policy_expiry_date), new Date()) : null;
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 py-3 px-4 rounded-xl cursor-pointer transition-all border ${
                          isSelected
                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 shadow-sm"
                            : "border-border/30 hover:bg-muted/50 hover:border-border/50"
                        }`}
                        onClick={() => {
                          const next = new Set(selectedLeads);
                          if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                          setSelectedLeads(next);
                        }}
                      >
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <div className={`w-8 h-8 rounded-lg ${getStageColor(c.pipeline_stage)} flex items-center justify-center shrink-0`}>
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate text-foreground">{c.customer_name || "Unknown"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {c.vehicle_make} {c.vehicle_model} • {c.vehicle_number || "No Reg"} • {c.current_insurer || "No Insurer"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {daysLeft !== null && (
                            <Badge className={`text-[10px] h-5 border-0 ${
                              daysLeft < 0 ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" :
                              daysLeft <= 15 ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400" :
                              "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                            }`}>
                              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                            {getStageLabel(c.pipeline_stage)}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {callingList.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center text-muted-foreground">
            <div className="w-20 h-20 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <PhoneOff className="h-10 w-10 opacity-30" />
            </div>
            <p className="font-semibold text-lg">No leads in queue</p>
            <p className="text-sm mt-1">Import leads or wait for new in-progress leads.</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4" /> Import Leads
            </Button>
          </CardContent>
        </Card>
      ) : currentClient ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* ── LEFT COLUMN: Customer Card ── */}
          <div className="lg:col-span-4 space-y-4">
            {/* Hero Dial Card */}
            <motion.div
              key={currentClient.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden border-0 shadow-xl">
                <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 px-6 pt-6 pb-5 text-center text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm mx-auto flex items-center justify-center mb-3 ring-4 ring-white/20 shadow-lg">
                      <User className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold tracking-wide uppercase">
                      {currentClient.customer_name || "Unknown"}
                    </h3>
                    <p className="text-3xl font-mono font-bold mt-2 tracking-wider text-emerald-100">
                      {formatPhone(currentClient.phone)}
                    </p>
                    <div className="flex gap-2 justify-center mt-3 flex-wrap">
                      <Badge className={`text-xs border ${getStageColor(currentClient.pipeline_stage)} text-white border-white/20`}>
                        {getStageLabel(currentClient.pipeline_stage)}
                      </Badge>
                      {currentClient.priority && (
                        <Badge className={`text-xs border ${getPriorityConfig(currentClient.priority).className}`}>
                          {getPriorityConfig(currentClient.priority).label}
                        </Badge>
                      )}
                      {currentClient.contact_attempts && currentClient.contact_attempts > 0 && (
                        <Badge className="bg-white/20 text-white border-white/20 text-xs">
                          {currentClient.contact_attempts} attempts
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-2 h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                      onClick={() => dialPhone(currentClient.phone)}
                    >
                      <Phone className="h-5 w-5" /> Dial Now
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-1.5 h-12 border-2 hover:bg-primary/10"
                      onClick={dialOnly}
                      title="Dial again"
                    >
                      <Zap className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="ghost" size="sm" onClick={goToPrev} disabled={currentIndex === 0} className="gap-1 text-muted-foreground">
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </Button>
                    <span className="text-xs font-mono text-muted-foreground self-center">
                      {currentIndex + 1} / {callingList.length}
                    </span>
                    <Button variant="ghost" size="sm" onClick={goToNext} disabled={!outcomeMarked || currentIndex >= callingList.length - 1} className="gap-1 text-muted-foreground" title={!outcomeMarked ? "Mark an outcome first" : ""}>
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Customer Details */}
            <Card className="shadow-sm">
              <CardHeader className="pb-1 pt-4 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <DetailRow label="City" value={currentClient.city?.toUpperCase()} icon={MapPin} />
                <DetailRow label="Email" value={currentClient.email} icon={Mail} />
                <DetailRow label="Source" value={currentClient.lead_source} icon={Target} />
                <DetailRow label="Executive" value={currentClient.assigned_executive} icon={User} />
                <DetailRow label="Attempts" value={currentClient.contact_attempts || 0} icon={Phone} missing={false} />
                <DetailRow label="Created" value={currentClient.created_at ? format(new Date(currentClient.created_at), "dd MMM yyyy") : null} icon={CalendarDays} missing={false} />
              </CardContent>
            </Card>
          </div>

          {/* ── MIDDLE COLUMN: Vehicle + Policy ── */}
          <div className="lg:col-span-4 space-y-4">
            {/* Vehicle Details */}
            <motion.div
              key={`vehicle-${currentClient.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="shadow-sm">
                <CardHeader className="pb-1 pt-4 px-5">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 justify-between">
                    <span className="flex items-center gap-2 text-foreground">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Car className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      Vehicle Details
                    </span>
                    {!editingVehicle ? (
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary hover:text-primary/80" onClick={startEditingVehicle}>
                        <Edit className="h-3 w-3" /> Edit
                      </Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingVehicle(false)}>Cancel</Button>
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={saveVehicleDetails} disabled={savingVehicle}>
                          {savingVehicle ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  {editingVehicle ? (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Make</Label>
                          <Input className="h-8 text-xs" value={vehicleForm.vehicle_make} onChange={e => setVehicleForm(f => ({ ...f, vehicle_make: e.target.value }))} placeholder="e.g. MG" />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Model</Label>
                          <Input className="h-8 text-xs" value={vehicleForm.vehicle_model} onChange={e => setVehicleForm(f => ({ ...f, vehicle_model: e.target.value }))} placeholder="e.g. ZS EV" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Reg. No</Label>
                          <Input className="h-8 text-xs" value={vehicleForm.vehicle_number} onChange={e => setVehicleForm(f => ({ ...f, vehicle_number: e.target.value }))} placeholder="DL12CS3792" />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Year</Label>
                          <Input className="h-8 text-xs" type="number" value={vehicleForm.vehicle_year} onChange={e => setVehicleForm(f => ({ ...f, vehicle_year: e.target.value }))} placeholder="2024" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Current Insurer</Label>
                        <Input className="h-8 text-xs" value={vehicleForm.current_insurer} onChange={e => setVehicleForm(f => ({ ...f, current_insurer: e.target.value }))} placeholder="e.g. ICICI Lombard" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Policy Expiry</Label>
                          <Input className="h-8 text-xs" type="date" value={vehicleForm.policy_expiry_date} onChange={e => setVehicleForm(f => ({ ...f, policy_expiry_date: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Policy Type</Label>
                          <Select value={vehicleForm.current_policy_type} onValueChange={v => setVehicleForm(f => ({ ...f, current_policy_type: v }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="comprehensive">Comprehensive</SelectItem>
                              <SelectItem value="third_party">Third Party</SelectItem>
                              <SelectItem value="own_damage">Own Damage</SelectItem>
                              <SelectItem value="bundled">Bundled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">NCB %</Label>
                          <Input className="h-8 text-xs" type="number" value={vehicleForm.ncb_percentage} onChange={e => setVehicleForm(f => ({ ...f, ncb_percentage: e.target.value }))} placeholder="0-65" />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Premium ₹</Label>
                          <Input className="h-8 text-xs" type="number" value={vehicleForm.current_premium} onChange={e => setVehicleForm(f => ({ ...f, current_premium: e.target.value }))} placeholder="Amount" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <DetailRow label="Vehicle" value={[currentClient.vehicle_make, currentClient.vehicle_model].filter(Boolean).join(" ").toUpperCase() || null} icon={Car} />
                      <DetailRow label="Reg. No" value={currentClient.vehicle_number?.toUpperCase()} icon={Hash} />
                      <DetailRow label="Year" value={currentClient.vehicle_year} icon={CalendarDays} />
                      <DetailRow label="Current Insurer" value={currentClient.current_insurer} icon={Shield} />
                      <DetailRow label="Policy Expiry" value={currentClient.policy_expiry_date ? format(new Date(currentClient.policy_expiry_date), "dd MMM yyyy") : null} icon={Clock} />
                      <DetailRow label="Policy Type" value={currentClient.current_policy_type?.toUpperCase()} icon={FileText} />
                      <DetailRow label="NCB %" value={currentClient.ncb_percentage != null ? `${currentClient.ncb_percentage}%` : null} icon={Sparkles} />
                      <DetailRow label="Premium" value={currentClient.current_premium ? `₹${Number(currentClient.current_premium).toLocaleString("en-IN")}` : null} icon={Target} />
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Policy Details */}
            <motion.div
              key={`policy-${currentClient.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <Card className="shadow-sm border-primary/20">
                <CardHeader className="pb-1 pt-4 px-5">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 justify-between">
                    <span className="flex items-center gap-2 text-foreground">
                      <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Shield className="h-3.5 w-3.5 text-violet-600" />
                      </div>
                      Policy Details
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary hover:text-primary/80" onClick={() => setShowAddPolicy(true)}>
                      <Plus className="h-3 w-3" /> {activePolicy ? "Update" : "Add"}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  {activePolicy ? (
                    <div>
                      <DetailRow label="Policy No." value={activePolicy.policy_number ? `#${activePolicy.policy_number}` : null} icon={Hash} />
                      <DetailRow label="Insurer" value={activePolicy.insurer} icon={Shield} />
                      <DetailRow label="Type" value={activePolicy.policy_type?.toUpperCase()} icon={FileText} />
                      <DetailRow label="Premium" value={activePolicy.premium_amount ? `₹${Number(activePolicy.premium_amount).toLocaleString("en-IN")}` : null} icon={Target} />
                      <DetailRow label="IDV" value={activePolicy.idv ? `₹${Number(activePolicy.idv).toLocaleString("en-IN")}` : null} icon={BarChart3} />
                      <DetailRow label="Start" value={activePolicy.start_date ? format(new Date(activePolicy.start_date), "dd MMM yyyy") : null} icon={CalendarDays} />
                      <DetailRow label="Expiry" value={activePolicy.expiry_date ? format(new Date(activePolicy.expiry_date), "dd MMM yyyy") : null} icon={Clock} />
                      <DetailRow label="NCB" value={activePolicy.ncb_discount != null ? `${activePolicy.ncb_discount}%` : null} icon={Sparkles} />
                      {activePolicy.addons?.length ? (
                        <DetailRow label="Add-ons" value={activePolicy.addons.join(", ")} missing={false} />
                      ) : null}
                      {activePolicy.expiry_date && (
                        <div className="mt-3 pt-2 border-t border-border/40">
                          {(() => {
                            const days = differenceInDays(new Date(activePolicy.expiry_date), new Date());
                            return (
                              <Badge className={`text-xs ${days < 0 ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" : days <= 7 ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" : days <= 30 ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"}`}>
                                {days < 0 ? `⚠ Expired ${Math.abs(days)}d ago` : `${days} days to renewal`}
                              </Badge>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-3 flex items-center justify-center">
                        <Shield className="h-7 w-7 opacity-30" />
                      </div>
                      <p className="text-sm font-medium">No policy found</p>
                      <p className="text-xs mt-1 mb-3">Add policy details for this customer</p>
                      <Button size="sm" className="gap-1.5" onClick={() => setShowAddPolicy(true)}>
                        <Plus className="h-3.5 w-3.5" /> Add Policy Details
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {clientPolicies.length > 1 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-1 pt-3 px-5">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Previous Policies ({clientPolicies.length - 1})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-3">
                  <ScrollArea className="max-h-28">
                    {clientPolicies.slice(1).map(p => (
                      <div key={p.id} className="flex justify-between items-center text-xs py-2 border-b border-border/30 last:border-0">
                        <span className="truncate font-medium">{p.policy_number || "—"} • {p.insurer || "—"}</span>
                        <Badge variant="outline" className="text-[10px] h-4 shrink-0">{p.status}</Badge>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── RIGHT COLUMN: Call Outcome + Queue ── */}
          <div className="lg:col-span-4 space-y-4">
            {/* Call Outcome */}
            <motion.div
              key={`outcome-${currentClient.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="border-0 shadow-xl bg-card">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <FileText className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    Call Outcome
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-3">
                  {/* Prominent outcome buttons - Quote Shared & Renewal Shared with share actions */}
                  <div className="space-y-2">
                    {CALL_OUTCOMES.filter(o => o.prominent).map(o => {
                      const isSelected = callOutcome === o.value;
                      const shareMsg = o.value === "quote_shared"
                        ? `Hi ${currentClient.customer_name || ""}! Here is your insurance quote for your ${currentClient.vehicle_make || ""} ${currentClient.vehicle_model || ""}.\n\nVehicle: ${currentClient.vehicle_number || "N/A"}\nPolicy Type: ${currentClient.current_policy_type || "Comprehensive"}\nInsurer: ${currentClient.current_insurer || "Best Available"}\n\nPlease review and let us know if you'd like to proceed. Thank you!`
                        : `Hi ${currentClient.customer_name || ""}! Your insurance renewal is due${currentClient.policy_expiry_date ? ` on ${currentClient.policy_expiry_date}` : " soon"} for your ${currentClient.vehicle_make || ""} ${currentClient.vehicle_model || ""}.\n\nVehicle: ${currentClient.vehicle_number || "N/A"}\nCurrent Insurer: ${currentClient.current_insurer || "N/A"}\nNCB: ${currentClient.ncb_percentage ?? "N/A"}%\n\nWe have the best renewal offers for you. Let's connect!`;

                      const handleWhatsApp = async () => {
                        const { sendWhatsApp } = await import("@/lib/sendWhatsApp");
                        await sendWhatsApp({ phone: currentClient.phone || "", message: shareMsg, name: currentClient.customer_name, logEvent: `call_${o.value}` });
                        setCallOutcome(o.value);
                      };

                      const handleEmail = () => {
                        const subject = o.value === "quote_shared"
                          ? `Insurance Quote - ${currentClient.vehicle_make || ""} ${currentClient.vehicle_model || ""}`
                          : `Insurance Renewal Reminder - ${currentClient.vehicle_make || ""} ${currentClient.vehicle_model || ""}`;
                        const mailto = `mailto:${currentClient.email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareMsg)}`;
                        window.open(mailto, "_blank");
                        setCallOutcome(o.value);
                        toast.success(`📧 Opened Email for ${o.label}`);
                      };

                      const handleCopy = () => {
                        navigator.clipboard.writeText(shareMsg);
                        setCallOutcome(o.value);
                        toast.success(`📋 ${o.label} message copied to clipboard!`);
                      };

                      return (
                        <div key={o.value} className="space-y-1.5">
                          <button
                            onClick={() => setCallOutcome(o.value)}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                              isSelected
                                ? `${o.activeBg} ring-2 ring-offset-1 border-transparent shadow-md`
                                : `${o.bg} hover:shadow-md border-current/20`
                            }`}
                          >
                            <o.icon className={`h-5 w-5 shrink-0 ${o.color}`} />
                            <span>{o.label}</span>
                          </button>

                          {/* Share actions row - always visible */}
                          <div className="flex gap-1.5">
                            <button
                              onClick={handleWhatsApp}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all hover:shadow-sm"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp
                            </button>
                            <button
                              onClick={handleEmail}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[11px] font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all hover:shadow-sm"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              Email
                            </button>
                            <button
                              onClick={handleCopy}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-gray-50 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 text-[11px] font-semibold hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-all hover:shadow-sm"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Share Quote PDF Button */}
                  <Button
                    variant="outline"
                    className="w-full gap-2 h-10 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-bold"
                    onClick={() => setShowShareQuote(true)}
                  >
                    <Send className="h-4 w-4" /> Share Quote PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2 h-10 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold"
                    onClick={() => setShowShareRenewal(true)}
                  >
                    <Send className="h-4 w-4" /> Share Renewal Reminder
                  </Button>

                  {/* Regular outcome buttons */}
                  <div className="grid grid-cols-3 gap-1.5 max-h-[220px] overflow-y-auto">
                    {CALL_OUTCOMES.filter(o => !o.prominent).map(o => (
                      <button
                        key={o.value}
                        onClick={() => setCallOutcome(o.value)}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-[11px] font-semibold transition-all text-left ${
                          callOutcome === o.value
                            ? `${o.activeBg} ring-2 ring-offset-1 border-transparent shadow-sm`
                            : `${o.bg} hover:shadow-sm`
                        }`}
                      >
                        <o.icon className={`h-3 w-3 shrink-0 ${o.color}`} />
                        <span className="truncate">{o.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
                    <Textarea
                      value={callNote}
                      onChange={e => setCallNote(e.target.value)}
                      placeholder="Add call notes..."
                      className="min-h-[60px] text-sm resize-none"
                    />
                  </div>

                  <Button
                    className="w-full gap-1.5 h-11 shadow-lg hover:shadow-xl transition-all hover:scale-[1.01]"
                    onClick={saveCallOutcome}
                    disabled={saving || !callOutcome}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save & Next
                  </Button>

                  <Button variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground" onClick={goToNext}>
                    <SkipForward className="h-4 w-4" /> Skip to Next
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Existing Notes */}
            {currentClient.notes && (
              <Card className="shadow-sm">
                <CardHeader className="pb-1 pt-3 px-5">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> Existing Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-3">
                  <p className="text-sm whitespace-pre-wrap text-foreground/80 leading-relaxed">{currentClient.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Next in Queue */}
            <Card className="shadow-sm">
              <CardHeader className="pb-1 pt-3 px-5">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-3 w-3" /> Next in Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-3">
                <ScrollArea className="max-h-48">
                  <div className="space-y-1">
                    {callingList.slice(currentIndex + 1, currentIndex + 8).map((c, i) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer hover:bg-muted/60 transition-all border border-transparent hover:border-border/50 group"
                        onClick={() => { setCurrentIndex(currentIndex + 1 + i); setCallNote(""); setCallOutcome(""); }}
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg ${getStageColor(c.pipeline_stage)} flex items-center justify-center shrink-0`}>
                            <User className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold truncate text-foreground">{c.customer_name || "Unknown"}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{formatPhone(c.phone)}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 group-hover:text-foreground transition-colors" />
                      </div>
                    ))}
                    {callingList.length <= currentIndex + 1 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No more leads in queue</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Import to Smart Calling</DialogTitle>
            <DialogDescription>Upload leads CSV for Smart Calling queue import.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload a CSV with columns: <strong>Name</strong>, <strong>Phone/Mobile</strong>.
              Leads will be added as "New Lead" stage.
            </p>
            <Input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleImport} className="h-9" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Policy Dialog */}
      <Dialog open={showAddPolicy} onOpenChange={setShowAddPolicy}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Add / Update Policy</DialogTitle>
            <DialogDescription>Add or update policy details for the currently selected Smart Calling customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { key: "policy_number", label: "Policy Number *", placeholder: "POL-123456" },
              { key: "insurer", label: "Insurer", placeholder: "ICICI Lombard" },
              { key: "premium_amount", label: "Premium (₹)", placeholder: "12000", type: "number" },
              { key: "idv", label: "IDV (₹)", placeholder: "450000", type: "number" },
              { key: "ncb_percentage", label: "NCB %", placeholder: "50", type: "number" },
              { key: "start_date", label: "Start Date", type: "date" },
              { key: "expiry_date", label: "Expiry Date", type: "date" },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs font-medium">{f.label}</Label>
                <Input
                  type={f.type || "text"}
                  value={(policyForm as any)[f.key]}
                  onChange={e => setPolicyForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="h-9 text-sm"
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Policy Type</Label>
              <Select value={policyForm.policy_type} onValueChange={v => setPolicyForm(p => ({ ...p, policy_type: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">Comprehensive</SelectItem>
                  <SelectItem value="third_party">Third Party</SelectItem>
                  <SelectItem value="own_damage">Own Damage</SelectItem>
                  <SelectItem value="standalone_od">Standalone OD</SelectItem>
                  <SelectItem value="saod">SAOD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={savePolicy} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Insurance Quote Modal */}
      {currentClient && (
        <InsuranceQuoteModal
          open={showQuoteModal}
          onOpenChange={setShowQuoteModal}
          client={currentClient}
          policy={activePolicy}
          onQuoteSent={() => {
            setCallOutcome("quote_shared");
            toast.success("Quote sent! Outcome marked as Quote Shared.");
          }}
        />
      )}

      {/* Share Quote PDF Dialog */}
      {currentClient && (
        <SharePdfDialog
          open={showShareQuote}
          onOpenChange={setShowShareQuote}
          title="Insurance Quote"
          defaultPhone={currentClient.phone || ""}
          defaultEmail={currentClient.email || ""}
          customerName={currentClient.customer_name || "Customer"}
          clientDetails={{
            id: currentClient.id,
            customer_name: currentClient.customer_name,
            phone: currentClient.phone,
            email: currentClient.email || undefined,
            vehicle_number: currentClient.vehicle_number || undefined,
            vehicle_make: currentClient.vehicle_make || undefined,
            vehicle_model: currentClient.vehicle_model || undefined,
            vehicle_year: currentClient.vehicle_year || undefined,
            current_insurer: currentClient.current_insurer || undefined,
            current_policy_type: currentClient.current_policy_type || undefined,
            quote_amount: currentClient.current_premium || undefined,
          }}
          shareMessage={`Hi ${currentClient.customer_name || ""}! Here is your insurance quote for your ${currentClient.vehicle_make || ""} ${currentClient.vehicle_model || ""}.\n\nVehicle: ${currentClient.vehicle_number || "N/A"}\nPolicy Type: ${currentClient.current_policy_type || "Comprehensive"}\nInsurer: ${currentClient.current_insurer || "Best Available"}\n\nPlease review and let us know if you'd like to proceed.\n\nPhone: +91 98559 24442\nwww.grabyourcar.com\n- Grabyourcar Insurance`}
          generatePdf={() => generateInsuranceQuotePdf({
            customerName: currentClient.customer_name || "Customer",
            phone: currentClient.phone,
            email: currentClient.email || undefined,
            city: currentClient.city || undefined,
            vehicleMake: currentClient.vehicle_make || "N/A",
            vehicleModel: currentClient.vehicle_model || "N/A",
            vehicleNumber: currentClient.vehicle_number || "N/A",
            vehicleYear: currentClient.vehicle_year || new Date().getFullYear(),
            fuelType: "Petrol",
            insuranceCompany: currentClient.current_insurer || "Best Available",
            policyType: currentClient.current_policy_type || "Comprehensive",
            idv: 500000,
            basicOD: 8000,
            odDiscount: 1500,
            ncbDiscount: Math.round((currentClient.ncb_percentage || 0) * 80),
            thirdParty: 6521,
            securePremium: 500,
            addonPremium: 3500,
            addons: ["Zero Depreciation", "Engine Protection", "Roadside Assistance"],
          })}
          onShared={() => {
            setCallOutcome("quote_shared");
          }}
        />
      )}

      {/* Share Renewal Reminder Dialog */}
      {currentClient && (
        <SharePdfDialog
          open={showShareRenewal}
          onOpenChange={setShowShareRenewal}
          title="Renewal Reminder"
          defaultPhone={currentClient.phone || ""}
          defaultEmail={currentClient.email || ""}
          customerName={currentClient.customer_name || "Customer"}
          clientDetails={{
            id: currentClient.id,
            customer_name: currentClient.customer_name,
            phone: currentClient.phone,
            email: currentClient.email || undefined,
            vehicle_number: currentClient.vehicle_number || undefined,
            vehicle_make: currentClient.vehicle_make || undefined,
            vehicle_model: currentClient.vehicle_model || undefined,
            vehicle_year: currentClient.vehicle_year || undefined,
            current_insurer: currentClient.current_insurer || undefined,
            current_policy_type: currentClient.current_policy_type || undefined,
            quote_amount: currentClient.current_premium || undefined,
          }}
          shareMessage={`Hi ${currentClient.customer_name || ""}! Your insurance renewal is due${currentClient.policy_expiry_date ? ` on ${currentClient.policy_expiry_date}` : " soon"} for your ${currentClient.vehicle_make || ""} ${currentClient.vehicle_model || ""}.\n\nVehicle: ${currentClient.vehicle_number || "N/A"}\nCurrent Insurer: ${currentClient.current_insurer || "N/A"}\nNCB: ${currentClient.ncb_percentage ?? 0}%\n\nWe have the best renewal offers for you.\n\nPhone: +91 98559 24442\nwww.grabyourcar.com\n- Grabyourcar Insurance`}
          generatePdf={() => generateRenewalReminderPdf({
            customerName: currentClient.customer_name || "Customer",
            phone: currentClient.phone,
            email: currentClient.email || undefined,
            city: currentClient.city || undefined,
            vehicleMake: currentClient.vehicle_make || "N/A",
            vehicleModel: currentClient.vehicle_model || "N/A",
            vehicleNumber: currentClient.vehicle_number || "N/A",
            vehicleYear: currentClient.vehicle_year || new Date().getFullYear(),
            currentInsurer: currentClient.current_insurer || activePolicy?.insurer || "N/A",
            policyNumber: activePolicy?.policy_number || undefined,
            policyType: currentClient.current_policy_type || activePolicy?.policy_type || "comprehensive",
            policyExpiry: currentClient.policy_expiry_date || activePolicy?.expiry_date || new Date().toISOString(),
            currentPremium: currentClient.current_premium || activePolicy?.premium_amount || 0,
            ncbPercentage: currentClient.ncb_percentage || activePolicy?.ncb_discount || 0,
            idv: activePolicy?.idv || undefined,
            addons: activePolicy?.addons || undefined,
          })}
          onShared={() => {
            setCallOutcome("renewal_shared");
          }}
        />
      )}
    </div>
  );
}
