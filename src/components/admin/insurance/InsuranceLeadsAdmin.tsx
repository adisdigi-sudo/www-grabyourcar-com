import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import {
  UserPlus, Phone, FileText, Clock, CreditCard,
  CheckCircle2, XCircle, Bell, Search, Upload,
  PhoneCall, User, Car, Shield, TrendingUp, Send, Flame,
  MoreVertical, ArrowRight, MessageSquare, Eye, Trophy,
  Target, Zap, ChevronRight, Share2
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

// ── 9-Stage Pipeline ──
const PIPELINE_STAGES = [
  { value: "new_lead", label: "New Lead", icon: UserPlus, gradient: "from-blue-500 to-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500", emoji: "🆕", team: "Executive" },
  { value: "contact_attempted", label: "Contacted", icon: Phone, gradient: "from-yellow-500 to-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-500", emoji: "📞", team: "Executive" },
  { value: "requirement_collected", label: "Requirement", icon: FileText, gradient: "from-violet-500 to-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500", emoji: "📋", team: "Executive" },
  { value: "quote_shared", label: "Quote Shared", icon: Send, gradient: "from-cyan-500 to-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30", border: "border-cyan-200 dark:border-cyan-800", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500", emoji: "💰", team: "Sales" },
  { value: "follow_up", label: "Follow-up", icon: Clock, gradient: "from-orange-500 to-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500", emoji: "🔁", team: "Sales" },
  { value: "payment_pending", label: "Payment Pending", icon: CreditCard, gradient: "from-pink-500 to-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30", border: "border-pink-200 dark:border-pink-800", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500", emoji: "💳", team: "Ops" },
  { value: "policy_issued", label: "Won 🏆", icon: CheckCircle2, gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", emoji: "🏆", team: "Ops" },
  { value: "lost", label: "Lost", icon: XCircle, gradient: "from-slate-400 to-slate-500", bg: "bg-slate-50 dark:bg-slate-900/30", border: "border-slate-200 dark:border-slate-700", text: "text-slate-500 dark:text-slate-400", dot: "bg-slate-400", emoji: "❌", team: "—" },
  { value: "renewal_queue", label: "Renewal Queue", icon: Bell, gradient: "from-amber-500 to-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500", emoji: "🔔", team: "Renewal" },
];

const LOST_REASONS = ["Too expensive", "Existing agent", "No response", "Not renewing", "Competitor offer", "Wrong number", "Other"];

const NEXT_ACTIONS: Record<string, string> = {
  new_lead: "📞 Call lead to introduce & understand insurance needs",
  contact_attempted: "🔄 Retry call (max 3 attempts), then move to Requirement",
  requirement_collected: "💰 Prepare 2-3 insurance quotes with comparison",
  quote_shared: "📊 Follow up on shared quotes, address objections",
  follow_up: "⏰ Day 1 → Day 3 → Day 5 reminders. No response = Lost",
  payment_pending: "💳 Collect payment & documents from customer",
  policy_issued: "✅ Upload policy document & add to Grabyourcar clients",
  lost: "🔄 Re-engage after 2 weeks with better offer",
  renewal_queue: "🔔 Auto-reminders at 90/45/15 days before expiry",
};

interface Lead {
  id: string;
  customer_name: string | null;
  phone: string;
  email: string | null;
  vehicle_number: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  policy_type: string | null;
  current_insurer: string | null;
  policy_expiry: string | null;
  source: string | null;
  pipeline_stage: string;
  priority: string | null;
  assigned_executive: string | null;
  follow_up_date: string | null;
  contact_attempts: number | null;
  quote_amount: number | null;
  quote_insurer: string | null;
  lost_reason: string | null;
  ncb_percentage: number | null;
  previous_claim: boolean | null;
  notes: string | null;
  created_at: string;
  converted_client_id: string | null;
}

export function InsuranceLeadsAdmin() {
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTarget, setMoveTarget] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [note, setNote] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["insurance-leads-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as Lead[];
    },
  });

  // Stage counts
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PIPELINE_STAGES.forEach(s => { counts[s.value] = 0; });
    leads.forEach(l => {
      const stage = l.pipeline_stage || "new_lead";
      if (counts[stage] !== undefined) counts[stage]++;
      else counts["new_lead"]++;
    });
    return counts;
  }, [leads]);

  const totalLeads = leads.length;
  const wonCount = stageCounts["policy_issued"] || 0;
  const lostCount = stageCounts["lost"] || 0;
  const hotCount = leads.filter(l => l.priority === "hot").length;
  const convRate = totalLeads > 0 ? ((wonCount / totalLeads) * 100).toFixed(1) : "0";
  const inPipeline = totalLeads - wonCount - lostCount;

  // Filter
  const filtered = useMemo(() => {
    let result = selectedStage === "all" ? leads : leads.filter(l => (l.pipeline_stage || "new_lead") === selectedStage);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(l =>
        l.customer_name?.toLowerCase().includes(s) ||
        l.phone?.includes(s) ||
        l.vehicle_number?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [leads, selectedStage, search]);

  // Move stage mutation
  const moveStage = useMutation({
    mutationFn: async ({ leadId, newStage, reason }: { leadId: string; newStage: string; reason?: string }) => {
      const update: Record<string, any> = { pipeline_stage: newStage };
      if (newStage === "lost" && reason) update.lost_reason = reason;
      if (newStage === "contact_attempted") {
        const lead = leads.find(l => l.id === leadId);
        update.contact_attempts = (lead?.contact_attempts || 0) + 1;
      }
      const { error } = await supabase.from("insurance_leads").update(update).eq("id", leadId);
      if (error) throw error;

      // WON: Convert to insurance_clients
      if (newStage === "policy_issued") {
        await convertToClient(leadId);
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["insurance-leads-pipeline"] });
      const stage = PIPELINE_STAGES.find(s => s.value === vars.newStage);
      toast.success(`${stage?.emoji} Moved to ${stage?.label}`);
      setShowMoveDialog(false);
      setLostReason("");
    },
  });

  // Convert won lead to insurance_clients + renewal queue
  const convertToClient = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    // Check if client already exists by phone
    const { data: existing } = await supabase
      .from("insurance_clients")
      .select("id")
      .eq("phone", lead.phone)
      .limit(1);

    let clientId: string;

    if (existing && existing.length > 0) {
      clientId = existing[0].id;
      // Update existing client
      await supabase.from("insurance_clients").update({
        customer_name: lead.customer_name || undefined,
        email: lead.email || undefined,
        vehicle_number: lead.vehicle_number || undefined,
        vehicle_make: lead.vehicle_make || undefined,
        vehicle_model: lead.vehicle_model || undefined,
        vehicle_year: lead.vehicle_year || undefined,
        current_insurer: lead.current_insurer || undefined,
        lead_status: "won",
        pipeline_stage: "policy_issued",
        is_active: true,
        ncb_percentage: lead.ncb_percentage || undefined,
        previous_claim: lead.previous_claim || undefined,
        lead_source: lead.source || undefined,
        notes: `${lead.notes || ""}\n🏆 Won from leads pipeline on ${new Date().toLocaleDateString("en-IN")}`.trim(),
      }).eq("id", clientId);
      toast.info("Existing client updated with won status");
    } else {
      // Create new client
      const { data: created, error } = await supabase.from("insurance_clients").insert({
        phone: lead.phone,
        customer_name: lead.customer_name || null,
        email: lead.email || null,
        vehicle_number: lead.vehicle_number || null,
        vehicle_make: lead.vehicle_make || null,
        vehicle_model: lead.vehicle_model || null,
        vehicle_year: lead.vehicle_year || null,
        current_insurer: lead.current_insurer || null,
        current_policy_type: lead.policy_type || null,
        policy_expiry_date: lead.policy_expiry || null,
        lead_status: "won",
        pipeline_stage: "policy_issued",
        is_active: true,
        ncb_percentage: lead.ncb_percentage || null,
        previous_claim: lead.previous_claim || null,
        lead_source: lead.source || null,
        current_premium: lead.quote_amount || null,
        quote_amount: lead.quote_amount || null,
        quote_insurer: lead.quote_insurer || null,
        notes: `🏆 Converted from leads pipeline on ${new Date().toLocaleDateString("en-IN")}`,
      }).select("id").single();
      if (error) { console.error(error); return; }
      clientId = created.id;
    }

    // Link lead to client
    await supabase.from("insurance_leads").update({
      converted_client_id: clientId,
      converted_at: new Date().toISOString(),
    }).eq("id", leadId);

    // Log activity
    await supabase.from("insurance_activity_log").insert({
      client_id: clientId,
      activity_type: "conversion",
      title: "🏆 Lead Won — Grabyourcar Customer",
      description: `${lead.customer_name || lead.phone} converted from leads pipeline. Added to client database & renewal queue.`,
    });

    // Note: Renewal tracking will be auto-created when the policy is uploaded via InsuranceAddPolicyForm

    toast.success("🎉 Lead converted to Grabyourcar customer!", {
      description: `${lead.customer_name || lead.phone} is now in the client database with renewal tracking.`,
      duration: 6000,
    });
  };

  const handleMove = useCallback((lead: Lead, targetStage: string) => {
    if (targetStage === "lost") {
      setSelectedLead(lead);
      setMoveTarget(targetStage);
      setShowMoveDialog(true);
    } else {
      moveStage.mutate({ leadId: lead.id, newStage: targetStage });
    }
  }, [moveStage]);

  const confirmLostMove = () => {
    if (!selectedLead || !lostReason) { toast.error("Please select a reason"); return; }
    moveStage.mutate({ leadId: selectedLead.id, newStage: "lost", reason: lostReason });
  };

  const displayPhone = (phone: string | null) => (!phone || phone.startsWith("IB_")) ? null : phone;

  const getWhatsAppLink = (phone: string | null) => {
    if (!phone || phone.startsWith("IB_")) return null;
    const clean = phone.replace(/\D/g, "");
    return `https://wa.me/${clean.startsWith("91") ? clean : `91${clean}`}`;
  };

  const getPriorityStyle = (p: string | null) => {
    if (p === "hot") return "bg-red-100 text-red-700 border-red-200";
    if (p === "warm") return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  const getStageForLead = (lead: Lead) =>
    PIPELINE_STAGES.find(s => s.value === (lead.pipeline_stage || "new_lead")) || PIPELINE_STAGES[0];

  const getNextStages = (currentStage: string) => {
    const idx = PIPELINE_STAGES.findIndex(s => s.value === currentStage);
    return PIPELINE_STAGES.filter((_, i) => i !== idx);
  };

  const updatePriority = async (leadId: string, priority: string) => {
    await supabase.from("insurance_leads").update({ priority }).eq("id", leadId);
    queryClient.invalidateQueries({ queryKey: ["insurance-leads-pipeline"] });
    toast.success(`Priority set to ${priority}`);
  };

  return (
    <div className="space-y-5">
      {/* KPI Header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Leads", value: totalLeads, icon: UserPlus, color: "text-blue-600", bg: "from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/20" },
          { label: "In Pipeline", value: inPipeline, icon: TrendingUp, color: "text-violet-600", bg: "from-violet-50 to-violet-100 dark:from-violet-950/40 dark:to-violet-900/20" },
          { label: "Hot Leads", value: hotCount, icon: Flame, color: "text-red-600", bg: "from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/20" },
          { label: "Won", value: wonCount, icon: Trophy, color: "text-emerald-600", bg: "from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/20" },
          { label: "Conversion", value: `${convRate}%`, icon: Target, color: "text-amber-600", bg: "from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/20" },
        ].map(kpi => (
          <Card key={kpi.label} className="border shadow-sm overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${kpi.bg} flex items-center justify-center shrink-0`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline Stage Bar — Visual Funnel */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedStage("all")}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                selectedStage === "all" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted hover:bg-muted/80"
              }`}
            >
              All ({totalLeads})
            </button>
            {PIPELINE_STAGES.map((stage, i) => {
              const count = stageCounts[stage.value] || 0;
              const Icon = stage.icon;
              const isActive = selectedStage === stage.value;
              return (
                <div key={stage.value} className="flex items-center shrink-0">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 mx-0.5" />}
                  <button
                    onClick={() => setSelectedStage(stage.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? `bg-gradient-to-r ${stage.gradient} text-white shadow-sm`
                        : `${stage.bg} ${stage.text} hover:shadow-sm`
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{stage.label}</span>
                    {count > 0 && (
                      <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive ? "bg-white/25" : "bg-white dark:bg-black/20"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search + Action Hint */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, phone, vehicle..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> leads
        </div>
      </div>

      {selectedStage !== "all" && (
        <div className="p-3 rounded-lg bg-muted/50 border border-dashed text-sm flex items-start gap-2">
          <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">Next Action: </span>
            {NEXT_ACTIONS[selectedStage] || "—"}
            <span className="text-muted-foreground ml-2">• Assigned: {PIPELINE_STAGES.find(s => s.value === selectedStage)?.team}</span>
          </div>
        </div>
      )}

      {/* Lead Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading leads...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No leads found in this stage</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.slice(0, 100).map(lead => {
              const stage = getStageForLead(lead);
              const phone = displayPhone(lead.phone);
              const waLink = getWhatsAppLink(lead.phone);
              const daysToExpiry = lead.policy_expiry ? differenceInDays(new Date(lead.policy_expiry), new Date()) : null;
              const stageIdx = PIPELINE_STAGES.findIndex(s => s.value === stage.value);

              return (
                <motion.div
                  key={lead.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <Card className={`border ${stage.border} hover:shadow-md transition-all group relative overflow-hidden`}>
                    {/* Stage progress bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
                      <div
                        className={`h-full bg-gradient-to-r ${stage.gradient} transition-all`}
                        style={{ width: `${((stageIdx + 1) / PIPELINE_STAGES.length) * 100}%` }}
                      />
                    </div>

                    <CardContent className="p-4 pt-5 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${stage.gradient} flex items-center justify-center shrink-0`}>
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm leading-tight truncate">{lead.customer_name || "Unknown"}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {lead.source || "Direct"} • {format(new Date(lead.created_at), "dd MMM")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {lead.priority && (
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getPriorityStyle(lead.priority)}`}>
                              {lead.priority === "hot" ? "🔥" : lead.priority === "warm" ? "🟠" : "❄️"} {lead.priority}
                            </Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => { setSelectedLead(lead); setShowDetail(true); }}>
                                <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                              </DropdownMenuItem>
                              {phone && (
                                <DropdownMenuItem onClick={() => window.open(`tel:${phone}`)}>
                                  <PhoneCall className="h-3.5 w-3.5 mr-2" /> Call
                                </DropdownMenuItem>
                              )}
                              {waLink && (
                                <DropdownMenuItem onClick={() => window.open(waLink, "_blank")}>
                                  <MessageSquare className="h-3.5 w-3.5 mr-2" /> WhatsApp
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => updatePriority(lead.id, "hot")} className="text-red-600">
                                <Flame className="h-3.5 w-3.5 mr-2" /> Mark Hot
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updatePriority(lead.id, "warm")} className="text-orange-600">
                                <Target className="h-3.5 w-3.5 mr-2" /> Mark Warm
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {getNextStages(lead.pipeline_stage || "new_lead").map(s => (
                                <DropdownMenuItem key={s.value} onClick={() => handleMove(lead, s.value)}>
                                  <s.icon className="h-3.5 w-3.5 mr-2" /> {s.emoji} {s.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                        {phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" /> {phone}
                          </div>
                        )}
                        {lead.vehicle_number && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Car className="h-3 w-3" /> <span className="font-mono">{lead.vehicle_number}</span>
                          </div>
                        )}
                        {lead.vehicle_model && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Shield className="h-3 w-3" /> {lead.vehicle_make} {lead.vehicle_model}
                          </div>
                        )}
                        {lead.current_insurer && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <FileText className="h-3 w-3" /> {lead.current_insurer}
                          </div>
                        )}
                        {daysToExpiry !== null && (
                          <div className={`flex items-center gap-1 font-medium ${daysToExpiry <= 7 ? "text-red-600" : daysToExpiry <= 30 ? "text-orange-600" : "text-muted-foreground"}`}>
                            <Clock className="h-3 w-3" /> {daysToExpiry < 0 ? `Expired ${Math.abs(daysToExpiry)}d` : `${daysToExpiry}d to expiry`}
                          </div>
                        )}
                        {lead.quote_amount && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <CreditCard className="h-3 w-3" /> ₹{lead.quote_amount.toLocaleString("en-IN")}
                          </div>
                        )}
                      </div>

                      {/* Stage badge + Quick actions */}
                      <div className="flex items-center justify-between pt-1 border-t border-dashed">
                        <Badge variant="outline" className={`text-[10px] ${stage.bg} ${stage.text} border ${stage.border}`}>
                          {stage.emoji} {stage.label}
                        </Badge>
                        <div className="flex gap-1">
                          {phone && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); window.open(`tel:${phone}`); }}>
                              <PhoneCall className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                          )}
                          {waLink && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); window.open(waLink, "_blank"); }}>
                              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                          )}
                          {lead.pipeline_stage !== "policy_issued" && lead.pipeline_stage !== "lost" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Move to next stage"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextIdx = PIPELINE_STAGES.findIndex(s => s.value === (lead.pipeline_stage || "new_lead")) + 1;
                                if (nextIdx < PIPELINE_STAGES.length) {
                                  handleMove(lead, PIPELINE_STAGES[nextIdx].value);
                                }
                              }}
                            >
                              <ArrowRight className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          )}
                          {lead.converted_client_id && (
                            <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
                              ✅ Client
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Lost Reason Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" /> Mark as Lost
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Why is this lead being marked as lost?</p>
          <div className="grid grid-cols-2 gap-2">
            {LOST_REASONS.map(r => (
              <Button
                key={r}
                variant={lostReason === r ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setLostReason(r)}
              >
                {r}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>Cancel</Button>
            <Button onClick={confirmLostMove} className="bg-red-600 hover:bg-red-700">Confirm Lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedLead && (() => {
            const stage = getStageForLead(selectedLead);
            const phone = displayPhone(selectedLead.phone);
            const waLink = getWhatsAppLink(selectedLead.phone);
            const daysToExpiry = selectedLead.policy_expiry ? differenceInDays(new Date(selectedLead.policy_expiry), new Date()) : null;
            const stageIdx = PIPELINE_STAGES.findIndex(s => s.value === stage.value);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${stage.gradient} flex items-center justify-center`}>
                      <User className="h-4 w-4 text-white" />
                    </div>
                    {selectedLead.customer_name || "Unknown Lead"}
                  </DialogTitle>
                </DialogHeader>

                {/* Progress tracker */}
                <div className="flex items-center gap-0.5 py-2">
                  {PIPELINE_STAGES.filter(s => s.value !== "lost").map((s, i) => {
                    const isCompleted = i <= stageIdx && stage.value !== "lost";
                    const isCurrent = s.value === stage.value;
                    return (
                      <div key={s.value} className="flex items-center flex-1">
                        <div className={`h-2 flex-1 rounded-full transition-all ${
                          isCompleted ? `bg-gradient-to-r ${s.gradient}` : "bg-muted"
                        } ${isCurrent ? "ring-2 ring-offset-1 ring-primary/30" : ""}`} />
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-center text-muted-foreground -mt-1">
                  {stage.emoji} {stage.label} — {stage.team} Team
                </p>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {phone && <div><Label className="text-[10px]">PHONE</Label><p className="font-medium">{phone}</p></div>}
                  {selectedLead.email && <div><Label className="text-[10px]">EMAIL</Label><p className="font-medium">{selectedLead.email}</p></div>}
                  {selectedLead.vehicle_number && <div><Label className="text-[10px]">VEHICLE NO</Label><p className="font-mono font-medium">{selectedLead.vehicle_number}</p></div>}
                  {selectedLead.vehicle_model && <div><Label className="text-[10px]">VEHICLE</Label><p>{selectedLead.vehicle_make} {selectedLead.vehicle_model} {selectedLead.vehicle_year || ""}</p></div>}
                  {selectedLead.current_insurer && <div><Label className="text-[10px]">INSURER</Label><p>{selectedLead.current_insurer}</p></div>}
                  {selectedLead.policy_type && <div><Label className="text-[10px]">POLICY TYPE</Label><p>{selectedLead.policy_type}</p></div>}
                  {daysToExpiry !== null && (
                    <div><Label className="text-[10px]">EXPIRY</Label>
                      <p className={`font-medium ${daysToExpiry <= 7 ? "text-red-600" : daysToExpiry <= 30 ? "text-orange-600" : ""}`}>
                        {selectedLead.policy_expiry} ({daysToExpiry < 0 ? `${Math.abs(daysToExpiry)}d overdue` : `${daysToExpiry}d left`})
                      </p>
                    </div>
                  )}
                  {selectedLead.ncb_percentage != null && <div><Label className="text-[10px]">NCB</Label><p>{selectedLead.ncb_percentage}%</p></div>}
                  {selectedLead.quote_amount && <div><Label className="text-[10px]">QUOTE</Label><p>₹{selectedLead.quote_amount.toLocaleString("en-IN")} ({selectedLead.quote_insurer || "—"})</p></div>}
                  {selectedLead.assigned_executive && <div><Label className="text-[10px]">EXECUTIVE</Label><p>{selectedLead.assigned_executive}</p></div>}
                  <div><Label className="text-[10px]">ATTEMPTS</Label><p>{selectedLead.contact_attempts || 0} calls</p></div>
                  {selectedLead.lost_reason && <div className="col-span-2"><Label className="text-[10px]">LOST REASON</Label><p className="text-red-600">{selectedLead.lost_reason}</p></div>}
                  {selectedLead.notes && <div className="col-span-2"><Label className="text-[10px]">NOTES</Label><p className="text-muted-foreground">{selectedLead.notes}</p></div>}
                </div>

                {/* Quick actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {phone && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => window.open(`tel:${phone}`)}>
                      <PhoneCall className="h-3 w-3 mr-1" /> Call
                    </Button>
                  )}
                  {waLink && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => window.open(waLink, "_blank")}>
                      <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp
                    </Button>
                  )}
                  {selectedLead.converted_client_id ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">✅ Grabyourcar Client</Badge>
                  ) : (
                    <div className="flex gap-1 ml-auto">
                      {getNextStages(selectedLead.pipeline_stage || "new_lead").slice(0, 4).map(s => (
                        <Button key={s.value} size="sm" variant="outline" className={`text-xs ${s.text}`}
                          onClick={() => { handleMove(selectedLead, s.value); setShowDetail(false); }}>
                          {s.emoji} {s.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
