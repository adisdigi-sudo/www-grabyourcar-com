import { useState, useMemo, useCallback } from "react";
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
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, Phone, FileText, MessageSquare, Clock, CreditCard,
  CheckCircle2, XCircle, Bell, Search, ChevronRight, Upload,
  PhoneCall, User, Car, Shield, TrendingUp, Eye, Send, Flame,
  MoreVertical, Share2, Plus, ArrowRight
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { format, differenceInDays } from "date-fns";

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
  assigned_executive: string | null;
  priority: string | null;
  pipeline_stage: string | null;
  contact_attempts: number | null;
  quote_amount: number | null;
  quote_insurer: string | null;
  lost_reason: string | null;
  follow_up_date: string | null;
  current_premium: number | null;
  notes: string | null;
  created_at: string;
}

export function InsurancePipelineBoard() {
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTarget, setMoveTarget] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [showUploadPolicy, setShowUploadPolicy] = useState(false);
  const [note, setNote] = useState("");

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["insurance-pipeline-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, email, city, vehicle_number, vehicle_make, vehicle_model, vehicle_year, current_insurer, policy_expiry_date, current_policy_type, ncb_percentage, previous_claim, lead_source, assigned_executive, priority, pipeline_stage, contact_attempts, quote_amount, quote_insurer, lost_reason, follow_up_date, current_premium, notes, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as Client[];
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
    return result;
  }, [clients, selectedStage, search]);

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
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["insurance-pipeline-clients"] });
      const stage = PIPELINE_STAGES.find(s => s.value === vars.newStage);
      toast.success(`Moved to ${stage?.label}`);
      setShowMoveDialog(false);
      setLostReason("");
      // Auto-open upload policy on WON
      if (vars.newStage === "policy_issued") {
        setShowUploadPolicy(true);
      }
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

  const getWhatsAppLink = (phone: string | null) => {
    if (!phone || phone.startsWith("IB_")) return null;
    const clean = phone.replace(/\D/g, "");
    return `https://wa.me/${clean.startsWith("91") ? clean : `91${clean}`}`;
  };

  const getPriorityColor = (p: string | null) => {
    if (p === "hot") return "bg-red-100 text-red-700 border-red-200";
    if (p === "warm") return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-blue-100 text-blue-700 border-blue-200";
  };

  return (
    <div className="space-y-5">
      {/* KPI Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Leads", value: totalLeads, icon: UserPlus, color: "text-blue-600" },
          { label: "Won (Issued)", value: wonCount, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Conversion Rate", value: `${convRate}%`, icon: TrendingUp, color: "text-violet-600" },
          { label: "In Pipeline", value: totalLeads - wonCount - (stageCounts["lost"] || 0), icon: Clock, color: "text-orange-600" },
        ].map(kpi => (
          <Card key={kpi.label} className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
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
              className={`shrink-0 h-8 text-xs gap-1.5 ${selectedStage === stage.value ? "" : stage.text}`}
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

      {/* Next Action Hint */}
      {selectedStage !== "all" && (
        <div className="p-3 rounded-lg bg-muted/50 border border-dashed text-sm">
          <span className="font-medium">Next Action: </span>
          {NEXT_ACTIONS[selectedStage] || "—"}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <AnimatePresence mode="popLayout">
          {filtered.map(client => {
            const stage = PIPELINE_STAGES.find(s => s.value === (client.pipeline_stage || "new_lead")) || PIPELINE_STAGES[0];
            const stageIdx = PIPELINE_STAGES.findIndex(s => s.value === stage.value);
            const phone = displayPhone(client.phone);
            const waLink = getWhatsAppLink(client.phone);
            const daysToExpiry = client.policy_expiry_date ? differenceInDays(new Date(client.policy_expiry_date), new Date()) : null;

            return (
              <motion.div
                key={client.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`border ${stage.border} hover:shadow-md transition-all group cursor-pointer`} onClick={() => setSelectedClient(client)}>
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${stage.color} flex items-center justify-center`}>
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-tight">{client.customer_name || "Unknown"}</p>
                          <p className="text-[11px] text-muted-foreground">{client.city || "—"} • {format(new Date(client.created_at), "dd MMM")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
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
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                      {phone && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" /> {phone}
                        </div>
                      )}
                      {client.vehicle_number && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Car className="h-3 w-3" /> <span className="font-mono">{client.vehicle_number}</span>
                        </div>
                      )}
                      {client.vehicle_model && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Shield className="h-3 w-3" /> {client.vehicle_make} {client.vehicle_model}
                        </div>
                      )}
                      {client.current_insurer && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FileText className="h-3 w-3" /> {client.current_insurer}
                        </div>
                      )}
                      {daysToExpiry !== null && (
                        <div className={`flex items-center gap-1 font-medium ${daysToExpiry <= 7 ? "text-red-600" : daysToExpiry <= 30 ? "text-orange-600" : "text-muted-foreground"}`}>
                          <Clock className="h-3 w-3" /> {daysToExpiry < 0 ? `Expired ${Math.abs(daysToExpiry)}d ago` : `${daysToExpiry}d to expiry`}
                        </div>
                      )}
                      {client.current_premium && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <CreditCard className="h-3 w-3" /> ₹{client.current_premium.toLocaleString("en-IN")}
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="flex gap-0.5">
                      {PIPELINE_STAGES.slice(0, 7).map((s, i) => (
                        <div key={s.value} className={`h-1 flex-1 rounded-full ${i <= stageIdx && stageIdx < 7 ? s.dot : "bg-muted"}`} />
                      ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      {phone && (
                        <>
                          <a href={`tel:${client.phone}`}>
                            <Button size="icon" variant="ghost" className="h-7 w-7"><PhoneCall className="h-3.5 w-3.5 text-emerald-600" /></Button>
                          </a>
                          {waLink && (
                            <a href={waLink} target="_blank" rel="noopener noreferrer">
                              <Button size="icon" variant="ghost" className="h-7 w-7"><MessageSquare className="h-3.5 w-3.5 text-emerald-600" /></Button>
                            </a>
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
      <Dialog open={!!selectedClient && !showMoveDialog} onOpenChange={(o) => { if (!o) setSelectedClient(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedClient && (() => {
            const stage = PIPELINE_STAGES.find(s => s.value === (selectedClient.pipeline_stage || "new_lead")) || PIPELINE_STAGES[0];
            const phone = displayPhone(selectedClient.phone);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${stage.color} flex items-center justify-center`}>
                      <User className="h-4 w-4 text-white" />
                    </div>
                    {selectedClient.customer_name || "Unknown"}
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

                  {/* Customer Details */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Mobile:</span> {phone || "—"}</div>
                      <div><span className="text-muted-foreground">Email:</span> {selectedClient.email || "—"}</div>
                      <div><span className="text-muted-foreground">City:</span> {selectedClient.city || "—"}</div>
                      <div><span className="text-muted-foreground">Source:</span> {selectedClient.lead_source || "—"}</div>
                    </div>
                  </div>

                  {/* Vehicle Details */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vehicle</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Number:</span> {selectedClient.vehicle_number || "—"}</div>
                      <div><span className="text-muted-foreground">Model:</span> {selectedClient.vehicle_make} {selectedClient.vehicle_model || "—"}</div>
                      <div><span className="text-muted-foreground">Year:</span> {selectedClient.vehicle_year || "—"}</div>
                      <div><span className="text-muted-foreground">Insurer:</span> {selectedClient.current_insurer || "—"}</div>
                    </div>
                  </div>

                  {/* Insurance Details */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Insurance</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Type:</span> {selectedClient.current_policy_type || "—"}</div>
                      <div><span className="text-muted-foreground">NCB:</span> {selectedClient.ncb_percentage ? `${selectedClient.ncb_percentage}%` : "—"}</div>
                      <div><span className="text-muted-foreground">Premium:</span> {selectedClient.current_premium ? `₹${selectedClient.current_premium.toLocaleString("en-IN")}` : "—"}</div>
                      <div><span className="text-muted-foreground">Claim:</span> {selectedClient.previous_claim ? "Yes" : "No"}</div>
                      <div><span className="text-muted-foreground">Expiry:</span> {selectedClient.policy_expiry_date ? format(new Date(selectedClient.policy_expiry_date), "dd MMM yyyy") : "—"}</div>
                    </div>
                  </div>

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
                        <a href={getWhatsAppLink(selectedClient.phone) || "#"} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="gap-1.5 text-emerald-600 border-emerald-200">
                            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                          </Button>
                        </a>
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

      {/* Upload Policy Dialog */}
      <Dialog open={showUploadPolicy} onOpenChange={setShowUploadPolicy}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-emerald-600" /> Upload Policy</DialogTitle>
          </DialogHeader>
          <PolicyUploadForm clientId={selectedClient?.id || ""} onDone={() => { setShowUploadPolicy(false); queryClient.invalidateQueries({ queryKey: ["insurance-pipeline-clients"] }); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Policy Upload Form ──
function PolicyUploadForm({ clientId, onDone }: { clientId: string; onDone: () => void }) {
  const [form, setForm] = useState({
    policy_number: "", policy_type: "comprehensive", insurer: "",
    premium_amount: "", start_date: "", expiry_date: "", status: "active",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.policy_number || !clientId) { toast.error("Policy number required"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("insurance_policies").insert({
        client_id: clientId,
        policy_number: form.policy_number,
        policy_type: form.policy_type,
        insurer: form.insurer || "Unknown",
        premium_amount: form.premium_amount ? Number(form.premium_amount) : null,
        start_date: form.start_date || new Date().toISOString().split("T")[0],
        expiry_date: form.expiry_date || null,
        status: form.status,
      });
      if (error) throw error;
      // Move to renewal queue
      await supabase.from("insurance_clients").update({ pipeline_stage: "renewal_queue" }).eq("id", clientId);
      await supabase.from("insurance_activity_log").insert({
        client_id: clientId,
        activity_type: "policy_uploaded",
        title: "Policy issued & uploaded",
        description: `${form.insurer} policy ${form.policy_number} uploaded`,
      });
      toast.success("✅ Policy uploaded! Moved to Renewal Queue.");
      onDone();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {[
        { key: "policy_number", label: "Policy Number *", placeholder: "POL-123456" },
        { key: "insurer", label: "Insurance Company", placeholder: "ICICI Lombard, HDFC Ergo..." },
        { key: "premium_amount", label: "Premium (₹)", placeholder: "15000", type: "number" },
        { key: "start_date", label: "Start Date", type: "date" },
        { key: "expiry_date", label: "Expiry Date", type: "date" },
      ].map(f => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs">{f.label}</Label>
          <Input
            type={f.type || "text"}
            value={(form as any)[f.key]}
            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            className="h-9"
          />
        </div>
      ))}
      <div className="space-y-1">
        <Label className="text-xs">Policy Type</Label>
        <Select value={form.policy_type} onValueChange={v => setForm(p => ({ ...p, policy_type: v }))}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="comprehensive">Comprehensive</SelectItem>
            <SelectItem value="third_party">Third Party</SelectItem>
            <SelectItem value="own_damage">Own Damage</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={save} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700">
        {saving ? "Saving..." : "Upload Policy"}
      </Button>
    </div>
  );
}
