import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GitBranch, User, Phone, Car, Shield, MessageSquare,
  Mail, Search, ArrowRight, Play, CheckCircle2, Flame,
  Clock, AlertTriangle, Share2, PhoneCall, Star, Trophy,
  XCircle, ThumbsUp, ThumbsDown, Zap, TrendingUp,
  UserPlus, Target, Eye, ChevronRight, BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const PIPELINE_STAGES = [
  { value: "new", label: "New Lead", icon: UserPlus, color: "bg-blue-500", lightBg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-800", textColor: "text-blue-700 dark:text-blue-300", emoji: "🆕" },
  { value: "contacted", label: "Contacted", icon: Phone, color: "bg-yellow-500", lightBg: "bg-yellow-50 dark:bg-yellow-950/40", border: "border-yellow-200 dark:border-yellow-800", textColor: "text-yellow-700 dark:text-yellow-300", emoji: "📞" },
  { value: "follow_up", label: "Follow-up", icon: Clock, color: "bg-orange-500", lightBg: "bg-orange-50 dark:bg-orange-950/40", border: "border-orange-200 dark:border-orange-800", textColor: "text-orange-700 dark:text-orange-300", emoji: "🔁" },
  { value: "in_process", label: "In Process", icon: Zap, color: "bg-violet-500", lightBg: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-200 dark:border-violet-800", textColor: "text-violet-700 dark:text-violet-300", emoji: "⚡" },
  { value: "interested", label: "Interested", icon: ThumbsUp, color: "bg-cyan-500", lightBg: "bg-cyan-50 dark:bg-cyan-950/40", border: "border-cyan-200 dark:border-cyan-800", textColor: "text-cyan-700 dark:text-cyan-300", emoji: "👍" },
  { value: "not_interested", label: "Not Interested", icon: ThumbsDown, color: "bg-gray-400", lightBg: "bg-gray-50 dark:bg-gray-900/40", border: "border-gray-200 dark:border-gray-700", textColor: "text-gray-500 dark:text-gray-400", emoji: "👎" },
  { value: "hot_prospect", label: "Hot Prospect", icon: Flame, color: "bg-red-500", lightBg: "bg-red-50 dark:bg-red-950/40", border: "border-red-200 dark:border-red-800", textColor: "text-red-600 dark:text-red-400", emoji: "🔥" },
  { value: "converted", label: "Won 🏆", icon: Trophy, color: "bg-emerald-500", lightBg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800", textColor: "text-emerald-700 dark:text-emerald-300", emoji: "🏆" },
  { value: "lost", label: "Lost", icon: XCircle, color: "bg-slate-400", lightBg: "bg-slate-50 dark:bg-slate-900/40", border: "border-slate-200 dark:border-slate-700", textColor: "text-slate-500 dark:text-slate-400", emoji: "❌" },
];

const NEXT_ACTIONS: Record<string, string> = {
  new: "📞 Call the lead to introduce yourself and understand their insurance needs.",
  contacted: "📋 Schedule a follow-up call and gather vehicle/policy details.",
  follow_up: "💰 Share a competitive quote based on their requirements.",
  in_process: "📄 Collect documents, verify details, and prepare the proposal.",
  interested: "🎯 Push for closure — share best offer and address final concerns.",
  not_interested: "⏸️ Park for 3 months, then re-engage with new offers.",
  hot_prospect: "🔥 Act NOW! This lead is ready — call immediately with your best deal.",
  converted: "✅ Congratulations! Upload policy & add to Grabyourcar customer database.",
  lost: "🔄 Try a recovery call after 2 weeks with a better offer.",
};

interface Client {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  vehicle_model: string | null;
  vehicle_number: string | null;
  current_insurer: string | null;
  lead_status: string | null;
  current_premium: number | null;
  lead_source: string | null;
  created_at: string;
  vehicle_make: string | null;
}

export function InsuranceStatusPipeline() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "kanban">("cards");
  const [converting, setConverting] = useState(false);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    const { data } = await supabase
      .from("insurance_clients")
      .select("id, customer_name, phone, email, vehicle_model, vehicle_number, vehicle_make, current_insurer, lead_status, current_premium, lead_source, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    setClients((data || []) as Client[]);
  };

  const stageCounts = useMemo(() =>
    PIPELINE_STAGES.map(stage => ({
      ...stage,
      count: clients.filter(c => c.lead_status === stage.value).length,
    })),
    [clients]
  );

  const totalLeads = clients.length;
  const wonCount = clients.filter(c => c.lead_status === "converted").length;
  const hotCount = clients.filter(c => c.lead_status === "hot_prospect").length;
  const lostCount = clients.filter(c => c.lead_status === "lost").length;
  const conversionRate = totalLeads > 0 ? ((wonCount / totalLeads) * 100).toFixed(1) : "0";

  const filteredClients = useMemo(() => {
    let result = selectedStage === "all" ? clients : clients.filter(c => c.lead_status === selectedStage);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.customer_name?.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.vehicle_number?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [clients, selectedStage, search]);

  const updateStatus = async (clientId: string, newStatus: string) => {
    const stage = PIPELINE_STAGES.find(s => s.value === newStatus);
    await supabase.from("insurance_clients").update({ lead_status: newStatus }).eq("id", clientId);
    await supabase.from("insurance_activity_log").insert({
      client_id: clientId,
      activity_type: "status_change",
      title: `Pipeline: ${stage?.label}`,
      description: `Lead moved to "${stage?.label}" stage`,
      metadata: { new_status: newStatus },
    } as any);

    // 🏆 WON: Auto-add to Grabyourcar customer database
    if (newStatus === "converted") {
      await handleWonConversion(clientId);
    }

    toast.success(`${stage?.emoji} Moved to ${stage?.label}!`);
    fetchClients();
    if (selectedClient?.id === clientId) {
      setSelectedClient(prev => prev ? { ...prev, lead_status: newStatus } : null);
    }
  };

  const handleWonConversion = async (clientId: string) => {
    setConverting(true);
    try {
      // Get full client details
      const { data: client } = await supabase
        .from("insurance_clients")
        .select("*")
        .eq("id", clientId)
        .single();

      if (!client) return;

      // Mark as Grabyourcar customer
      await supabase.from("insurance_clients").update({
        is_active: true,
        notes: `${client.notes || ""}\n🏆 Converted to Grabyourcar customer on ${new Date().toLocaleDateString("en-IN")}`.trim(),
      }).eq("id", clientId);

      // Log the conversion
      await supabase.from("insurance_activity_log").insert({
        client_id: clientId,
        activity_type: "conversion",
        title: "🏆 Lead Won — Grabyourcar Customer",
        description: `${client.customer_name} has been converted to a Grabyourcar customer. Added to the main customer database.`,
        metadata: { conversion_date: new Date().toISOString(), source: client.lead_source },
      } as any);

      toast.success("🎉 Lead converted to Grabyourcar customer!", {
        description: `${client.customer_name} is now in your customer database.`,
        duration: 5000,
      });
    } catch (e) {
      console.error("Won conversion failed:", e);
    } finally {
      setConverting(false);
    }
  };

  const addNote = async () => {
    if (!selectedClient || !note.trim()) return;
    await supabase.from("insurance_activity_log").insert({
      client_id: selectedClient.id,
      activity_type: "note",
      title: "Note Added",
      description: note,
    } as any);
    toast.success("Note saved");
    setNote("");
  };

  const shareClientDetails = (client: Client) => {
    const displayPhoneVal = client.phone?.startsWith("IB_") ? "N/A" : client.phone;
    const stage = PIPELINE_STAGES.find(s => s.value === client.lead_status);
    const text = `${stage?.emoji || "👤"} Lead: ${client.customer_name}\n📱 Mobile: ${displayPhoneVal}\n✉️ Email: ${client.email || "N/A"}\n🚗 Vehicle: ${client.vehicle_number || "N/A"}\n🏢 Insurer: ${client.current_insurer || "N/A"}\n💰 Premium: ₹${client.current_premium?.toLocaleString("en-IN") || "N/A"}\n📊 Stage: ${stage?.label || "New"}\n\n— Grabyourcar Insurance`;
    if (navigator.share) {
      navigator.share({ title: `Lead - ${client.customer_name}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Details copied!");
    }
  };

  const displayPhone = (phone: string | null) => (!phone || phone.startsWith("IB_")) ? null : phone;

  const currentStageIndex = (status: string | null) => {
    const idx = PIPELINE_STAGES.findIndex(s => s.value === status);
    return idx >= 0 ? idx : 0;
  };

  return (
    <div className="space-y-5">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row gap-4 items-start justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" /> Lead Pipeline
          </h2>
          <p className="text-sm text-muted-foreground">Track & convert insurance leads through the journey</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {[
            { label: "Total", value: totalLeads, icon: Target, color: "text-primary", bg: "bg-primary/10" },
            { label: "Hot 🔥", value: hotCount, icon: Flame, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
            { label: "Won 🏆", value: wonCount, icon: Trophy, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            { label: "Lost", value: lostCount, icon: XCircle, color: "text-muted-foreground", bg: "bg-muted/50" },
            { label: "Conv. Rate", value: `${conversionRate}%`, icon: TrendingUp, color: "text-chart-2", bg: "bg-chart-2/10" },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${s.bg} border`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <div className="text-center">
                <p className="text-sm font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search + View Toggle */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, vehicle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>

      {/* Stage Filters — Rich Horizontal Scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setSelectedStage("all")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium whitespace-nowrap transition-all ${
            selectedStage === "all"
              ? "border-primary bg-primary/10 text-primary shadow-sm"
              : "border-transparent bg-muted/40 hover:bg-muted/60 text-muted-foreground"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          All ({totalLeads})
        </button>
        {stageCounts.map(stage => (
          <button
            key={stage.value}
            onClick={() => setSelectedStage(stage.value)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium whitespace-nowrap transition-all ${
              selectedStage === stage.value
                ? `${stage.border} ${stage.lightBg} ${stage.textColor} shadow-sm`
                : "border-transparent bg-muted/40 hover:bg-muted/60 text-muted-foreground"
            }`}
          >
            <div className={`h-3 w-3 rounded-full ${stage.color}`} />
            <span>{stage.emoji} {stage.label}</span>
            <Badge variant="secondary" className="h-5 text-[10px] px-1.5 ml-0.5">{stage.count}</Badge>
          </button>
        ))}
      </div>

      {/* Client Cards */}
      <AnimatePresence mode="popLayout">
        <div className="grid gap-2">
          {filteredClients.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No leads in this stage</p>
                <p className="text-xs text-muted-foreground mt-1">Add leads or change the filter</p>
              </CardContent>
            </Card>
          ) : filteredClients.map((client, idx) => {
            const stage = PIPELINE_STAGES.find(s => s.value === client.lead_status) || PIPELINE_STAGES[0];
            const phone = displayPhone(client.phone);
            const isHot = client.lead_status === "hot_prospect";
            const isWon = client.lead_status === "converted";

            return (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: idx * 0.02 }}
              >
                <Card className={`hover:shadow-lg transition-all border-2 ${
                  isHot ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20" :
                  isWon ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20" :
                  `${stage.border} hover:${stage.lightBg}`
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedClient(client); setEditPhone(phone || ""); setEditEmail(client.email || ""); }}>
                        {/* Stage Indicator */}
                        <div className={`h-10 w-10 rounded-xl ${stage.color} flex items-center justify-center shrink-0 shadow-sm`}>
                          <stage.icon className="h-5 w-5 text-white" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm truncate">{client.customer_name}</p>
                            {isHot && <span className="text-xs animate-pulse">🔥</span>}
                            {isWon && <Badge className="bg-emerald-500 text-white text-[10px] h-4 px-1.5">Grabyourcar ✓</Badge>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            {phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {phone}</span>}
                            {client.vehicle_number && <span className="flex items-center gap-1 font-mono"><Car className="h-3 w-3" /> {client.vehicle_number}</span>}
                            {client.current_insurer && <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {client.current_insurer}</span>}
                            {client.lead_source && <Badge variant="outline" className="text-[10px] h-4">{client.lead_source}</Badge>}
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge className={`text-[10px] h-5 ${stage.lightBg} ${stage.textColor} border ${stage.border}`}>
                          {stage.label}
                        </Badge>
                        {client.current_premium && (
                          <Badge variant="secondary" className="text-[10px] h-5">₹{client.current_premium.toLocaleString("en-IN")}</Badge>
                        )}
                        {phone && (
                          <>
                            <a href={`tel:${phone}`}>
                              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-green-50 dark:hover:bg-green-950/30" title="Call">
                                <PhoneCall className="h-4 w-4 text-green-600" />
                              </Button>
                            </a>
                            <a href={`https://wa.me/91${phone}`} target="_blank" rel="noopener noreferrer">
                              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-green-50 dark:hover:bg-green-950/30" title="WhatsApp">
                                <MessageSquare className="h-4 w-4 text-green-600" />
                              </Button>
                            </a>
                          </>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Share" onClick={() => shareClientDetails(client)}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>

      {/* ── Client Detail + Pipeline Dialog ── */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-lg ${PIPELINE_STAGES.find(s => s.value === selectedClient?.lead_status)?.color || "bg-primary"} flex items-center justify-center`}>
                <User className="h-4 w-4 text-white" />
              </div>
              <div>
                <span>{selectedClient?.customer_name}</span>
                {selectedClient?.lead_status === "converted" && (
                  <Badge className="ml-2 bg-emerald-500 text-white text-[10px]">Grabyourcar Customer ✓</Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-5">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mobile</Label>
                  <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Enter mobile" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Enter email" className="h-8 text-sm" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p className="text-sm font-mono font-medium">{selectedClient.vehicle_number || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="text-sm font-medium">{selectedClient.lead_source || "—"}</p>
                </div>
              </div>

              {/* Communication Hub */}
              <div className="flex flex-wrap gap-2 py-2 border-y">
                {editPhone && (
                  <>
                    <a href={`tel:${editPhone}`}>
                      <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                        <PhoneCall className="h-3.5 w-3.5" /> Call
                      </Button>
                    </a>
                    <a href={`https://wa.me/91${editPhone}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-green-600" /> WhatsApp
                      </Button>
                    </a>
                  </>
                )}
                {editEmail && (
                  <a href={`mailto:${editEmail}`}>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </Button>
                  </a>
                )}
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => shareClientDetails(selectedClient)}>
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
              </div>

              {/* ── Lead Journey Pipeline ── */}
              <div>
                <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" /> Lead Journey
                </Label>
                <div className="space-y-1.5">
                  {PIPELINE_STAGES.map((stage, idx) => {
                    const currentIdx = currentStageIndex(selectedClient.lead_status);
                    const isActive = stage.value === selectedClient.lead_status;
                    const isPast = idx < currentIdx && stage.value !== "not_interested" && stage.value !== "lost";
                    const isNegative = stage.value === "not_interested" || stage.value === "lost";
                    const StageIcon = stage.icon;

                    return (
                      <button
                        key={stage.value}
                        onClick={() => updateStatus(selectedClient.id, stage.value)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all group ${
                          isActive
                            ? `${stage.lightBg} border-2 ${stage.border} font-semibold shadow-sm`
                            : isPast
                              ? "bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-800/30"
                              : isNegative
                                ? "hover:bg-muted/40 text-muted-foreground border border-transparent"
                                : "hover:bg-muted/40 text-muted-foreground border border-transparent"
                        }`}
                      >
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          isPast ? "bg-emerald-500 text-white" :
                          isActive ? `${stage.color} text-white shadow-sm` :
                          "bg-muted/60 border group-hover:border-primary/20"
                        }`}>
                          {isPast ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                           isActive ? <StageIcon className="h-3.5 w-3.5" /> :
                           <StageIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                        <span className={`flex-1 text-left ${isActive ? stage.textColor : ""}`}>
                          {stage.emoji} {stage.label}
                        </span>
                        {isActive && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">Current</span>
                            <ChevronRight className="h-3 w-3 text-primary" />
                          </div>
                        )}
                        {isPast && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Next Best Action */}
              <Card className={`border-2 ${
                selectedClient.lead_status === "hot_prospect"
                  ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
                  : selectedClient.lead_status === "converted"
                    ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-primary/20 bg-primary/5"
              }`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-2.5">
                    {selectedClient.lead_status === "hot_prospect" ? (
                      <Flame className="h-5 w-5 text-red-500 mt-0.5 shrink-0 animate-pulse" />
                    ) : selectedClient.lead_status === "converted" ? (
                      <Trophy className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                    ) : (
                      <Zap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-semibold mb-0.5">
                        {selectedClient.lead_status === "hot_prospect" ? "🔥 URGENT ACTION" :
                         selectedClient.lead_status === "converted" ? "🏆 WON — Next Steps" :
                         "⚡ Next Best Action"}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {NEXT_ACTIONS[selectedClient.lead_status || "new"]}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add Note */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Add Note</Label>
                <div className="flex gap-2">
                  <Textarea placeholder="Type a note about this lead..." value={note} onChange={e => setNote(e.target.value)} rows={2} className="flex-1 text-sm" />
                  <Button size="sm" onClick={addNote} disabled={!note.trim()} className="self-end">Save</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
