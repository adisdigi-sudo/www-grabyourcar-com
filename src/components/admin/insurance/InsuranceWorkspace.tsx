import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { format, differenceInDays, subDays } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  UserPlus, Phone, FileText, Clock, CheckCircle2, XCircle,
  Search, PhoneCall, User, Car, Shield, TrendingUp, Send,
  MessageSquare, CalendarIcon, Bell, Plus, X,
  ChevronRight, CreditCard, Upload, RefreshCw, FileSpreadsheet, BookOpen, CalendarClock,
  Filter, Eye, AlertTriangle, ArrowUpDown
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
const LEAD_SOURCES = ["Meta", "Google Ads", "Referral", "Walk-in", "WhatsApp Broadcast", "Website", "Manual", "CSV Import"];

const SOURCE_COLORS: Record<string, string> = {
  Meta: "bg-blue-100 text-blue-700 border-blue-200",
  "Google Ads": "bg-red-100 text-red-700 border-red-200",
  Referral: "bg-purple-100 text-purple-700 border-purple-200",
  "Walk-in": "bg-green-100 text-green-700 border-green-200",
  "WhatsApp Broadcast": "bg-emerald-100 text-emerald-700 border-emerald-200",
  Website: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Manual: "bg-gray-100 text-gray-700 border-gray-200",
  "CSV Import": "bg-violet-100 text-violet-700 border-violet-200",
  "csv_import": "bg-violet-100 text-violet-700 border-violet-200",
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

interface PolicyRecord {
  id: string;
  client_id: string;
  policy_number: string | null;
  policy_type: string;
  insurer: string;
  premium_amount: number | null;
  start_date: string;
  expiry_date: string | null;
  status: string | null;
  is_renewal: boolean | null;
  issued_date: string | null;
  plan_name: string | null;
  idv: number | null;
  policy_document_url: string | null;
  created_at: string;
  // Joined client data
  insurance_clients: {
    customer_name: string | null;
    phone: string;
    city: string | null;
    vehicle_number: string | null;
    vehicle_make: string | null;
    vehicle_model: string | null;
    lead_source: string | null;
  } | null;
}

// ── Source display helper ──
function formatSource(source: string | null, createdAt: string): string {
  if (!source) return "Unknown";
  const date = format(new Date(createdAt), "dd MMM yyyy");
  if (source === "csv_import" || source === "CSV Import") return `Imported on ${date}`;
  if (source.startsWith("IB_") || source.toLowerCase().includes("insurebook")) return `Imported on ${date}`;
  return source;
}

// ── Expiry status helper ──
function getExpiryStatus(expiryDate: string | null): { label: string; className: string } {
  if (!expiryDate) return { label: "No Expiry", className: "bg-muted text-muted-foreground" };
  const days = differenceInDays(new Date(expiryDate), new Date());
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, className: "bg-red-100 text-red-700 border-red-200" };
  if (days <= 7) return { label: `Expires in ${days}d`, className: "bg-red-100 text-red-700 border-red-200 animate-pulse" };
  if (days <= 15) return { label: `Expires in ${days}d`, className: "bg-orange-100 text-orange-700 border-orange-200" };
  if (days <= 30) return { label: `Expires in ${days}d`, className: "bg-amber-100 text-amber-700 border-amber-200" };
  if (days <= 60) return { label: `Expires in ${days}d`, className: "bg-blue-100 text-blue-700 border-blue-200" };
  return { label: `Active (${days}d)`, className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
}

export function InsuranceWorkspace() {
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [draggingClient, setDraggingClient] = useState<Client | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"crm" | "policy_book" | "renewals">("crm");
  const [showImport, setShowImport] = useState(false);

  // Renewal filters
  const [renewalWindow, setRenewalWindow] = useState<string>("all");
  const [renewalSearch, setRenewalSearch] = useState("");
  const [renewalSort, setRenewalSort] = useState<"days_asc" | "days_desc" | "name">("days_asc");

  // Policy Book filters
  const [pbSearch, setPbSearch] = useState("");
  const [pbPartnerFilter, setPbPartnerFilter] = useState("all");

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

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = (ids: string[]) => setSelectedIds(prev => prev.size === ids.length ? new Set() : new Set(ids));

  // Data - CRM leads
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

  // Data - Actual booked policies from insurance_policies table
  const { data: policies = [] } = useQuery({
    queryKey: ["ins-policies-book"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("id, client_id, policy_number, policy_type, insurer, premium_amount, start_date, expiry_date, status, is_renewal, issued_date, plan_name, idv, policy_document_url, created_at, insurance_clients(customer_name, phone, city, vehicle_number, vehicle_make, vehicle_model, lead_source)")
        .in("status", ["active", "renewed"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PolicyRecord[];
    },
  });

  // Counts
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

  const insNotifications = useMemo(() => buildInsuranceNotifications(clients), [clients]);

  // Policy Book — from insurance_policies (actual booked policies only)
  const pbPartners = useMemo(() => {
    const set = new Set(policies.map(p => p.insurer).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [policies]);

  const filteredPolicyBook = useMemo(() => {
    let result = policies;
    if (pbPartnerFilter !== "all") result = result.filter(p => p.insurer === pbPartnerFilter);
    if (pbSearch.trim()) {
      const s = pbSearch.toLowerCase();
      result = result.filter(p =>
        p.insurance_clients?.customer_name?.toLowerCase().includes(s) ||
        p.insurance_clients?.phone?.includes(s) ||
        p.insurance_clients?.vehicle_number?.toLowerCase().includes(s) ||
        p.policy_number?.toLowerCase().includes(s) ||
        p.insurer?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [policies, pbPartnerFilter, pbSearch]);

  // Renewal — only upcoming renewals (expiry within 90 days from today) from insurance_policies
  const renewalPolicies = useMemo(() => {
    const now = new Date();
    const all = policies.filter(p => {
      if (!p.expiry_date || p.status === "renewed") return false;
      const days = differenceInDays(new Date(p.expiry_date), now);
      return days >= 0 && days <= 90;
    });

    let result = all;
    if (renewalWindow === "7") result = all.filter(p => { const d = differenceInDays(new Date(p.expiry_date!), now); return d >= 0 && d <= 7; });
    else if (renewalWindow === "15") result = all.filter(p => { const d = differenceInDays(new Date(p.expiry_date!), now); return d >= 0 && d <= 15; });
    else if (renewalWindow === "30") result = all.filter(p => { const d = differenceInDays(new Date(p.expiry_date!), now); return d >= 0 && d <= 30; });
    else if (renewalWindow === "60") result = all.filter(p => { const d = differenceInDays(new Date(p.expiry_date!), now); return d >= 0 && d <= 60; });

    if (renewalSearch.trim()) {
      const s = renewalSearch.toLowerCase();
      result = result.filter(p =>
        p.insurance_clients?.customer_name?.toLowerCase().includes(s) ||
        p.insurance_clients?.phone?.includes(s) ||
        p.insurance_clients?.vehicle_number?.toLowerCase().includes(s)
      );
    }

    return result.sort((a, b) => {
      if (renewalSort === "name") return (a.insurance_clients?.customer_name || "").localeCompare(b.insurance_clients?.customer_name || "");
      if (renewalSort === "days_desc") return new Date(b.expiry_date!).getTime() - new Date(a.expiry_date!).getTime();
      return new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime();
    });
  }, [policies, renewalWindow, renewalSearch, renewalSort]);

  // Renewal summary counts — from insurance_policies only
  const renewalSummary = useMemo(() => {
    const now = new Date();
    const all = policies.filter(p => p.expiry_date && p.status !== "renewed");
    const upcoming = all.filter(p => { const d = differenceInDays(new Date(p.expiry_date!), now); return d >= 0 && d <= 90; });
    return {
      within7: upcoming.filter(p => { const d = differenceInDays(new Date(p.expiry_date!), now); return d >= 0 && d <= 7; }).length,
      within15: upcoming.filter(p => { const d = differenceInDays(new Date(p.expiry_date!), now); return d >= 0 && d <= 15; }).length,
      within30: upcoming.filter(p => { const d = differenceInDays(new Date(p.expiry_date!), now); return d >= 0 && d <= 30; }).length,
      within60: upcoming.filter(p => { const d = differenceInDays(new Date(p.expiry_date!), now); return d >= 0 && d <= 60; }).length,
      total: upcoming.length,
    };
  }, [policies]);

  // CRM filter
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

      // Auto-prompt next logical action after stage move
      const movedClient = clients.find(c => c.id === vars.clientId);
      if (movedClient) {
        const nextClient = { ...movedClient, pipeline_stage: vars.newStage };
        setTimeout(() => {
          if (vars.newStage === "new_lead") {
            // Prompt to call
            setPendingMoveClient(nextClient); setCallStatus(""); setCallRemarks(""); setShowCallingDialog(true);
            toast.info("📞 Next: Make the first call", { duration: 3000 });
          } else if (vars.newStage === "smart_calling") {
            // After calling, prompt for quote or follow-up
            setSelectedClient(nextClient);
            toast.info("📋 Next: Share a quote or schedule follow-up", { duration: 3000 });
          } else if (vars.newStage === "quote_shared") {
            // Prompt for follow-up scheduling
            setPendingMoveClient(nextClient); setFollowUpDate(undefined); setFollowUpTime("10:00"); setFollowUpRemarks(""); setShowFollowUpDialog(true);
            toast.info("📅 Next: Schedule a follow-up", { duration: 3000 });
          } else if (vars.newStage === "won") {
            // Prompt renewal reminder
            setSelectedClient(nextClient); setRenewalDate(undefined); setShowRenewalDialog(true);
            toast.info("🔔 Next: Set renewal reminder for incentive eligibility", { duration: 4000 });
          } else if (vars.newStage === "policy_issued") {
            setSelectedClient(null);
            toast.success("✅ Policy issued! Lead workflow complete.", { duration: 4000 });
          } else {
            setSelectedClient(null);
          }
        }, 400);
      } else {
        setSelectedClient(null);
      }
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
    if (targetStage === "policy_issued" && !client.renewal_reminder_set) {
      toast.error("⚠️ Set renewal reminder first!", { duration: 5000 });
      return;
    }
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
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowImport(true)} className="gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/20">
                <FileSpreadsheet className="h-4 w-4" /> Import
              </Button>
              <Button size="sm" onClick={() => setShowAddLead(true)} className="gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/20">
                <Plus className="h-4 w-4" /> Add Lead
              </Button>
            </div>
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

      {/* 3 View Tabs */}
      <div className="flex gap-2 bg-muted/50 p-1 rounded-xl border">
        {[
          { key: "crm" as const, label: "Insurance CRM", icon: Shield, count: totalLeads },
          { key: "policy_book" as const, label: "Policy Book", icon: BookOpen, count: policyBookClients.length },
          { key: "renewals" as const, label: "Renewal Data", icon: CalendarClock, count: renewalSummary.total },
        ].map(tab => (
          <Button
            key={tab.key}
            variant={activeView === tab.key ? "default" : "ghost"}
            size="sm"
            className={cn("flex-1 gap-1.5 text-xs", activeView === tab.key && "shadow-sm")}
            onClick={() => setActiveView(tab.key)}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.count > 0 && <Badge variant={activeView === tab.key ? "secondary" : "outline"} className="text-[9px] h-4 px-1">{tab.count}</Badge>}
            {tab.key === "renewals" && renewalSummary.within7 > 0 && (
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
          </Button>
        ))}
      </div>

      {insNotifications.length > 0 && <StageNotificationBanner items={insNotifications} />}

      {/* Import Dialog */}
      <LeadImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        title="Import Insurance Leads"
        templateColumns={["name", "phone", "city", "vehicle_number", "vehicle_make", "vehicle_model", "source"]}
        onImport={async (leads) => {
          const rows = leads.map(l => ({
            customer_name: l.name || l.customer_name || "Unknown",
            phone: (l.phone || l.mobile || "").replace(/\D/g, ""),
            city: l.city || null,
            vehicle_number: l.vehicle_number || null,
            vehicle_make: l.vehicle_make || null,
            vehicle_model: l.vehicle_model || null,
            lead_source: l.source || "CSV Import",
            pipeline_stage: "smart_calling",
            lead_status: "new",
            priority: "medium",
          }));
          const { error } = await supabase.from("insurance_clients").insert(rows);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
        }}
      />

      {/* ══════════════════════════════════════════════════ */}
      {/* ── POLICY BOOK VIEW (Enhanced) ── */}
      {/* ══════════════════════════════════════════════════ */}
      {activeView === "policy_book" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, vehicle, policy number, insurer..."
                value={pbSearch}
                onChange={e => setPbSearch(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
            <Select value={pbPartnerFilter} onValueChange={setPbPartnerFilter}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder="All Partners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Partners / Insurers</SelectItem>
                {pbPartners.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-xs">{filteredPolicyBook.length} records</Badge>
          </div>

          {/* Policy Book Table */}
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
                      <TableHead className="text-[10px] font-bold uppercase">Policy No.</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Policy Type</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Premium</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Start Date</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Expiry Date</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Source</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Created</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase w-16">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPolicyBook.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={14} className="text-center py-12 text-muted-foreground">
                          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No policies found</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredPolicyBook.map((client, idx) => {
                      const phone = displayPhone(client.phone);
                      const waLink = getWhatsAppLink(client.phone);
                      return (
                        <TableRow key={client.id} className="hover:bg-muted/30 cursor-pointer text-xs" onClick={() => setSelectedClient(client)}>
                          <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
                                <User className="h-3 w-3 text-white" />
                              </div>
                              <div>
                                <p className="font-semibold text-xs">{client.customer_name || "—"}</p>
                                <p className="text-[10px] text-muted-foreground">{client.city || "—"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{phone || "—"}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-mono font-semibold text-xs">{client.vehicle_number || "—"}</p>
                              <p className="text-[10px] text-muted-foreground">{[client.vehicle_make, client.vehicle_model].filter(Boolean).join(" ") || "—"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{client.current_insurer || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{client.current_policy_number || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px]">{client.current_policy_type || "—"}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-xs">
                            {client.current_premium ? `₹${client.current_premium.toLocaleString("en-IN")}` : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {client.policy_start_date ? format(new Date(client.policy_start_date), "dd/MM/yyyy") : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {client.policy_expiry_date ? format(new Date(client.policy_expiry_date), "dd/MM/yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[9px]", getSourceColor(client.lead_source))}>
                              {formatSource(client.lead_source, client.created_at)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">
                            {format(new Date(client.created_at), "dd MMM yy")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {(() => {
                                const status = getExpiryStatus(client.policy_expiry_date);
                                return <Badge variant="outline" className={cn("text-[8px] px-1", status.className)}>{status.label}</Badge>;
                              })()}
                              {client.incentive_eligible && <Badge className="bg-amber-100 text-amber-700 text-[8px] px-1">⭐</Badge>}
                            </div>
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <div className="flex gap-0.5">
                              {phone && (
                                <a href={`tel:${client.phone}`}>
                                  <Button variant="ghost" size="icon" className="h-6 w-6"><PhoneCall className="h-3 w-3 text-primary" /></Button>
                                </a>
                              )}
                              {waLink && (
                                <a href={waLink} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="icon" className="h-6 w-6"><MessageSquare className="h-3 w-3 text-green-600" /></Button>
                                </a>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* ── RENEWAL DATA VIEW (Enhanced) ── */}
      {/* ══════════════════════════════════════════════════ */}
      {activeView === "renewals" && (
        <div className="space-y-4">
          {/* Renewal Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { label: "Expired", count: renewalSummary.expired, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", filter: "expired" },
              { label: "≤ 7 Days", count: renewalSummary.within7, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20 border-red-200", filter: "7" },
              { label: "≤ 15 Days", count: renewalSummary.within15, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-200", filter: "15" },
              { label: "≤ 30 Days", count: renewalSummary.within30, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200", filter: "30" },
              { label: "≤ 60 Days", count: renewalSummary.within60, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200", filter: "60" },
              { label: "Upcoming", count: renewalSummary.upcoming, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200", filter: "upcoming" },
              { label: "All Records", count: renewalSummary.total, color: "text-foreground", bg: "bg-muted/50 border-border", filter: "all" },
            ].map(s => (
              <Card
                key={s.label}
                className={cn("cursor-pointer hover:shadow-md transition-all border", s.bg, renewalWindow === s.filter && "ring-2 ring-primary shadow-md")}
                onClick={() => setRenewalWindow(renewalWindow === s.filter ? "all" : s.filter)}
              >
                <CardContent className="pt-3 pb-3 text-center">
                  <p className={cn("text-2xl font-bold", s.color)}>{s.count}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Renewal Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, vehicle number..."
                value={renewalSearch}
                onChange={e => setRenewalSearch(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
            <Select value={renewalSort} onValueChange={(v: any) => setRenewalSort(v)}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <ArrowUpDown className="h-3 w-3 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="days_asc">Expiry: Soonest First</SelectItem>
                <SelectItem value="days_desc">Expiry: Latest First</SelectItem>
                <SelectItem value="name">Name: A-Z</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-xs shrink-0">{renewalClients.length} results</Badge>
          </div>

          {/* Renewal Table */}
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
                      <TableHead className="text-[10px] font-bold uppercase">Policy Type</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Premium</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Expiry Date</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Days Left</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Source</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renewalClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                          <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No upcoming renewals in this window</p>
                        </TableCell>
                      </TableRow>
                    ) : renewalClients.map((client, idx) => {
                      const days = differenceInDays(new Date(client.policy_expiry_date!), new Date());
                      const isExpired = days < 0;
                      const isUrgent = days >= 0 && days <= 7;
                      const isWarning = days > 7 && days <= 15;
                      const phone = displayPhone(client.phone);
                      const waLink = getWhatsAppLink(client.phone);

                      return (
                        <TableRow
                          key={client.id}
                          className={cn(
                            "cursor-pointer text-xs transition-colors",
                            isExpired ? "bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20" :
                            isUrgent ? "bg-amber-50/50 dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/20" :
                            isWarning ? "bg-orange-50/30 dark:bg-orange-950/10 hover:bg-orange-50/50" :
                            "hover:bg-muted/30"
                          )}
                          onClick={() => setSelectedClient(client)}
                        >
                          <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                                isExpired ? "bg-gradient-to-br from-red-500 to-red-600" :
                                isUrgent ? "bg-gradient-to-br from-amber-500 to-amber-600" :
                                "bg-gradient-to-br from-blue-500 to-blue-600"
                              )}>
                                <CalendarClock className="h-3 w-3 text-white" />
                              </div>
                              <div>
                                <p className="font-semibold text-xs">{client.customer_name || "—"}</p>
                                <p className="text-[10px] text-muted-foreground">{client.city || ""}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{phone || "—"}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-mono font-semibold text-xs">{client.vehicle_number || "—"}</p>
                              <p className="text-[10px] text-muted-foreground">{[client.vehicle_make, client.vehicle_model].filter(Boolean).join(" ") || ""}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{client.current_insurer || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px]">{client.current_policy_type || "—"}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-xs">
                            {client.current_premium ? `₹${client.current_premium.toLocaleString("en-IN")}` : "—"}
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {format(new Date(client.policy_expiry_date!), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={isExpired ? "destructive" : "outline"}
                              className={cn("text-[10px] font-bold",
                                isExpired ? "" :
                                isUrgent ? "bg-red-100 text-red-700 border-red-200" :
                                isWarning ? "bg-orange-100 text-orange-700 border-orange-200" :
                                days <= 30 ? "bg-amber-100 text-amber-700 border-amber-200" :
                                "bg-blue-100 text-blue-700 border-blue-200"
                              )}
                            >
                              {isExpired ? `Expired ${Math.abs(days)}d ago` : `${days} days`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[9px]", getSourceColor(client.lead_source))}>
                              {formatSource(client.lead_source, client.created_at)}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <div className="flex gap-0.5">
                              {phone && (
                                <a href={`tel:${client.phone}`}>
                                  <Button variant="ghost" size="icon" className="h-6 w-6"><PhoneCall className="h-3 w-3 text-primary" /></Button>
                                </a>
                              )}
                              {waLink && (
                                <a href={waLink} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="icon" className="h-6 w-6"><MessageSquare className="h-3 w-3 text-green-600" /></Button>
                                </a>
                              )}
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedClient(client)}>
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* ── CRM VIEW (Enhanced Lead Table) ── */}
      {/* ══════════════════════════════════════════════════ */}
      {activeView === "crm" && (<>
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

      {/* Lead Table - Clean Row/Column Layout */}
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
                  <TableHead className="text-[10px] font-bold uppercase">Expiry</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Premium</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Follow-Up</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Created</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No leads found</p>
                      <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setShowAddLead(true)}>
                        <Plus className="h-3.5 w-3.5" /> Add First Lead
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((client, idx) => {
                  const normStage = normalizeStage(client.pipeline_stage);
                  const stage = PIPELINE_STAGES.find(s => s.value === normStage) || PIPELINE_STAGES[0];
                  const phone = displayPhone(client.phone);
                  const waLink = getWhatsAppLink(client.phone);
                  const daysToExpiry = client.policy_expiry_date ? differenceInDays(new Date(client.policy_expiry_date), new Date()) : null;

                  return (
                    <TableRow
                      key={client.id}
                      draggable
                      onDragStart={() => handleDragStart(client)}
                      onDragEnd={handleDragEnd}
                      className="cursor-pointer text-xs hover:bg-muted/30 transition-colors group"
                      onClick={() => setSelectedClient(client)}
                    >
                      <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0", stage.color)}>
                            <User className="h-3 w-3 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-xs leading-tight">{client.customer_name || "Unknown"}</p>
                            <p className="text-[10px] text-muted-foreground">{client.city || "—"}</p>
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
                        <Badge variant="outline" className={cn("text-[9px] px-1.5", stage.bg, stage.text, "border", stage.border)}>
                          {stage.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[9px]", getSourceColor(client.lead_source))}>
                          {formatSource(client.lead_source, client.created_at)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {daysToExpiry !== null ? (
                          <span className={cn("text-xs font-semibold",
                            daysToExpiry < 0 ? "text-red-600" : daysToExpiry <= 7 ? "text-red-600" : daysToExpiry <= 30 ? "text-orange-600" : "text-muted-foreground"
                          )}>
                            {daysToExpiry < 0 ? `Exp ${Math.abs(daysToExpiry)}d` : `${daysToExpiry}d`}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {client.current_premium ? `₹${client.current_premium.toLocaleString("en-IN")}` : client.quote_amount ? `₹${client.quote_amount.toLocaleString("en-IN")}` : "—"}
                      </TableCell>
                      <TableCell className="text-[10px]">
                        {client.follow_up_date ? (
                          <span className={cn("font-medium",
                            differenceInDays(new Date(client.follow_up_date), new Date()) < 0 ? "text-red-600" : "text-orange-600"
                          )}>
                            {format(new Date(client.follow_up_date), "dd MMM")}
                            {client.follow_up_time ? ` ${client.follow_up_time}` : ""}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {format(new Date(client.created_at), "dd MMM yy")}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex gap-0.5 items-center">
                          {phone && (
                            <>
                              <a href={`tel:${client.phone}`}>
                                <Button variant="ghost" size="icon" className="h-6 w-6"><PhoneCall className="h-3 w-3 text-primary" /></Button>
                              </a>
                              {waLink && (
                                <a href={waLink} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="icon" className="h-6 w-6"><MessageSquare className="h-3 w-3 text-green-600" /></Button>
                                </a>
                              )}
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 px-1.5">
                                Move <ChevronRight className="h-2.5 w-2.5" />
                              </Button>
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
              <span>{stageCounts["won"] + stageCounts["policy_issued"]} won • {stageCounts["lost"]} lost • {convRate}% conversion</span>
            </div>
          )}
        </CardContent>
      </Card>
      </>)}

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
                    <Badge variant="outline" className={getSourceColor(selectedClient.lead_source)}>
                      {formatSource(selectedClient.lead_source, selectedClient.created_at)}
                    </Badge>
                    {(() => {
                      const status = getExpiryStatus(selectedClient.policy_expiry_date);
                      return <Badge variant="outline" className={cn(status.className)}>{status.label}</Badge>;
                    })()}
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
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle & Policy</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Number:</span> {selectedClient.vehicle_number || "—"}</div>
                      <div><span className="text-muted-foreground">Model:</span> {[selectedClient.vehicle_make, selectedClient.vehicle_model].filter(Boolean).join(" ") || "—"}</div>
                      <div><span className="text-muted-foreground">Year:</span> {selectedClient.vehicle_year || "—"}</div>
                      <div><span className="text-muted-foreground">Insurer:</span> {selectedClient.current_insurer || "—"}</div>
                      <div><span className="text-muted-foreground">Policy No:</span> {selectedClient.current_policy_number || "—"}</div>
                      <div><span className="text-muted-foreground">Policy Type:</span> {selectedClient.current_policy_type || "—"}</div>
                      <div><span className="text-muted-foreground">Premium:</span> {selectedClient.current_premium ? `₹${selectedClient.current_premium.toLocaleString("en-IN")}` : "—"}</div>
                      <div><span className="text-muted-foreground">NCB:</span> {selectedClient.ncb_percentage ? `${selectedClient.ncb_percentage}%` : "—"}</div>
                      {selectedClient.policy_start_date && <div><span className="text-muted-foreground">Start:</span> {format(new Date(selectedClient.policy_start_date), "dd MMM yyyy")}</div>}
                      {selectedClient.policy_expiry_date && <div><span className="text-muted-foreground">Expiry:</span> {format(new Date(selectedClient.policy_expiry_date), "dd MMM yyyy")}</div>}
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

                  {/* Notes */}
                  {selectedClient.notes && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
                      <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-2">{selectedClient.notes}</p>
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
                    <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    {followUpDate ? format(followUpDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={followUpDate} onSelect={setFollowUpDate} /></PopoverContent>
              </Popover>
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

      {/* ── QUOTE MODAL ── */}
      {showQuoteModal && selectedClient && (
        <InsuranceQuoteModal open={showQuoteModal} onOpenChange={setShowQuoteModal} client={selectedClient} />
      )}

      {/* ── UPLOAD POLICY ── */}
      {showUploadPolicy && selectedClient && (
        <Dialog open={showUploadPolicy} onOpenChange={setShowUploadPolicy}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Upload Policy Document</DialogTitle></DialogHeader>
            <InsurancePolicyDocumentUploader defaultClientId={selectedClient.id} onDone={() => setShowUploadPolicy(false)} />
          </DialogContent>
        </Dialog>
      )}

      {/* ── RENEWAL REMINDER DIALOG ── */}
      <Dialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-emerald-600" /> Set Renewal Reminder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Setting a renewal reminder makes this client eligible for incentives and moves them to "Policy Issued" stage.</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left h-9">
                  <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                  {renewalDate ? format(renewalDate, "PPP") : "Pick renewal date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={renewalDate} onSelect={setRenewalDate} /></PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button onClick={setRenewalReminder} disabled={!renewalDate} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              <Bell className="h-4 w-4" /> Set Reminder & Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
