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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Phone, PhoneCall, ChevronLeft, ChevronRight, User, Car, Shield,
  FileText, Plus, Upload, SkipForward, Shuffle, Search, Clock,
  CheckCircle2, XCircle, ArrowRight, Eye, Edit, Save, Loader2, PhoneOff,
  MapPin, Mail, Hash, CalendarDays, AlertTriangle, PhoneForwarded, Ban, HelpCircle
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

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

const IN_PROGRESS_STAGES = [
  "new_lead", "contact_attempted", "requirement_collected",
  "quote_shared", "follow_up", "payment_pending"
];

const CALL_OUTCOMES = [
  { value: "connected", label: "Connected", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100" },
  { value: "interested", label: "Interested", icon: PhoneForwarded, color: "text-orange-500", bg: "bg-orange-50 border-orange-200 hover:bg-orange-100" },
  { value: "quote_requested", label: "Quote Requested", icon: FileText, color: "text-blue-600", bg: "bg-blue-50 border-blue-200 hover:bg-blue-100" },
  { value: "follow_up", label: "Follow-up Needed", icon: Clock, color: "text-rose-500", bg: "bg-rose-50 border-rose-200 hover:bg-rose-100" },
  { value: "no_answer", label: "No Answer", icon: PhoneOff, color: "text-amber-600", bg: "bg-amber-50 border-amber-200 hover:bg-amber-100" },
  { value: "not_interested", label: "Not Interested", icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200 hover:bg-red-100" },
  { value: "wrong_number", label: "Wrong Number", icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100" },
];

function DetailRow({ label, value, missing }: { label: string; value: string | number | null | undefined; missing?: boolean }) {
  const isMissing = missing !== false && !value;
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground text-[13px]">{label}</span>
      <span className={`font-medium text-[13px] text-right max-w-[60%] truncate ${isMissing ? "text-orange-500 italic text-xs" : ""}`}>
        {isMissing ? "Missing" : value}
      </span>
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

  const { data: allClients = [], isLoading } = useQuery({
    queryKey: ["smart-calling-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, email, city, vehicle_number, vehicle_make, vehicle_model, vehicle_year, current_insurer, policy_expiry_date, current_policy_type, ncb_percentage, previous_claim, lead_source, assigned_executive, priority, pipeline_stage, contact_attempts, current_premium, notes, created_at")
        .in("pipeline_stage", IN_PROGRESS_STAGES)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as SmartCallingClient[];
    },
  });

  const callingList = useMemo(() => {
    let list = [...allClients].filter(c => c.phone && !c.phone.startsWith("IB_"));
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
  }, [allClients, callMode, searchFilter]);

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
    } else {
      toast.info("🎉 You've reached the end of the calling list!");
    }
  }, [currentIndex, callingList.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setCallNote("");
      setCallOutcome("");
    }
  }, [currentIndex]);

  const dialAndAdvance = useCallback(() => {
    if (!currentClient) return;
    dialPhone(currentClient.phone);
    setTimeout(() => goToNext(), 1500);
  }, [currentClient, dialPhone, goToNext]);

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
        "quote_requested": "quote_shared", "follow_up": "follow_up",
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
      queryClient.invalidateQueries({ queryKey: ["smart-calling-clients"] });
      goToNext();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [currentClient, callOutcome, callNote, queryClient, goToNext]);

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
      new_lead: "New Lead", contact_attempted: "Contacted", requirement_collected: "Req. Collected",
      quote_shared: "Quote Shared", follow_up: "Follow-up", payment_pending: "Payment Pending",
    };
    return stages[stage || ""] || stage || "New";
  };

  const getPriorityColor = (p: string | null) => {
    if (p === "hot") return "bg-red-100 text-red-700 border-red-300";
    if (p === "high") return "bg-orange-100 text-orange-700 border-orange-300";
    if (p === "medium") return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-muted text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-emerald-600" />
            Smart Calling
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {callingList.length} leads in queue • {dialedNumbers.size} dialed this session
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={callMode} onValueChange={(v) => { setCallMode(v as any); setCurrentIndex(0); }}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="in_progress">📋 In Progress</SelectItem>
              <SelectItem value="random">🎲 Random</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Filter leads..."
              value={searchFilter}
              onChange={e => { setSearchFilter(e.target.value); setCurrentIndex(0); }}
              className="pl-8 h-9 w-44 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="gap-1.5 h-9">
            <Upload className="h-4 w-4" /> Import
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 rounded-full bg-emerald-100 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: callingList.length > 0 ? `${((currentIndex + 1) / callingList.length) * 100}%` : "0%" }}
          />
        </div>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
          {currentIndex + 1} / {callingList.length}
        </span>
      </div>

      {callingList.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center text-muted-foreground">
            <PhoneOff className="h-12 w-12 mx-auto mb-4 opacity-30" />
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
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 px-6 pt-6 pb-5 text-center text-white relative">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mx-auto flex items-center justify-center mb-3 ring-4 ring-white/30">
                  <User className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold tracking-wide uppercase">
                  {currentClient.customer_name || "Unknown"}
                </h3>
                <p className="text-3xl font-mono font-bold mt-2 tracking-wider text-emerald-100">
                  {formatPhone(currentClient.phone)}
                </p>
                <div className="flex gap-2 justify-center mt-3">
                  <Badge className="bg-white/20 text-white border-white/30 text-xs backdrop-blur-sm">
                    {getStageLabel(currentClient.pipeline_stage)}
                  </Badge>
                  {currentClient.priority && (
                    <Badge className={`text-xs border ${getPriorityColor(currentClient.priority)}`}>
                      {currentClient.priority}
                    </Badge>
                  )}
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2 h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                    onClick={() => dialPhone(currentClient.phone)}
                  >
                    <Phone className="h-5 w-5" /> Dial Now
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5 h-12 border-2"
                    onClick={dialAndAdvance}
                    title="Dial & auto-advance"
                  >
                    <Phone className="h-4 w-4" />
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" size="sm" onClick={goToPrev} disabled={currentIndex === 0} className="gap-1 text-muted-foreground">
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <Button variant="ghost" size="sm" onClick={goToNext} disabled={currentIndex >= callingList.length - 1} className="gap-1 text-muted-foreground">
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Customer Details */}
            <Card>
              <CardHeader className="pb-1 pt-4 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <User className="h-4 w-4 text-emerald-600" /> Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <DetailRow label="City" value={currentClient.city?.toUpperCase()} />
                <DetailRow label="Email" value={currentClient.email} />
                <DetailRow label="Source" value={currentClient.lead_source} />
                <DetailRow label="Executive" value={currentClient.assigned_executive} />
                <DetailRow label="Attempts" value={currentClient.contact_attempts || 0} missing={false} />
                <DetailRow label="Created" value={currentClient.created_at ? format(new Date(currentClient.created_at), "dd MMM yyyy") : null} missing={false} />
              </CardContent>
            </Card>
          </div>

          {/* ── MIDDLE COLUMN: Vehicle + Policy ── */}
          <div className="lg:col-span-4 space-y-4">
            {/* Vehicle Details */}
            <Card>
              <CardHeader className="pb-1 pt-4 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Car className="h-4 w-4 text-blue-600" /> Vehicle Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <DetailRow label="Vehicle" value={[currentClient.vehicle_make, currentClient.vehicle_model].filter(Boolean).join(" ").toUpperCase() || null} />
                <DetailRow label="Reg. No" value={currentClient.vehicle_number?.toUpperCase()} />
                <DetailRow label="Year" value={currentClient.vehicle_year} />
                <DetailRow label="Current Insurer" value={currentClient.current_insurer} />
                <DetailRow label="Policy Expiry" value={currentClient.policy_expiry_date ? format(new Date(currentClient.policy_expiry_date), "dd MMM yyyy") : null} />
                <DetailRow label="Policy Type" value={currentClient.current_policy_type?.toUpperCase()} />
                <DetailRow label="NCB %" value={currentClient.ncb_percentage != null ? `${currentClient.ncb_percentage}%` : null} />
                <DetailRow label="Premium" value={currentClient.current_premium ? `₹${Number(currentClient.current_premium).toLocaleString("en-IN")}` : null} />
              </CardContent>
            </Card>

            {/* Policy Details */}
            <Card>
              <CardHeader className="pb-1 pt-4 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2 justify-between">
                  <span className="flex items-center gap-2 text-foreground">
                    <Shield className="h-4 w-4 text-purple-600" /> Policy Details
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700" onClick={() => setShowAddPolicy(true)}>
                    <Plus className="h-3 w-3" /> {activePolicy ? "Update" : "Add"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {activePolicy ? (
                  <div>
                    <DetailRow label="Policy No." value={activePolicy.policy_number ? `#${activePolicy.policy_number}` : null} />
                    <DetailRow label="Insurer" value={activePolicy.insurer} />
                    <DetailRow label="Type" value={activePolicy.policy_type?.toUpperCase()} />
                    <DetailRow label="Premium" value={activePolicy.premium_amount ? `₹${Number(activePolicy.premium_amount).toLocaleString("en-IN")}` : null} />
                    <DetailRow label="IDV" value={activePolicy.idv ? `₹${Number(activePolicy.idv).toLocaleString("en-IN")}` : null} />
                    <DetailRow label="Start" value={activePolicy.start_date ? format(new Date(activePolicy.start_date), "dd MMM yyyy") : null} />
                    <DetailRow label="Expiry" value={activePolicy.expiry_date ? format(new Date(activePolicy.expiry_date), "dd MMM yyyy") : null} />
                    <DetailRow label="NCB" value={activePolicy.ncb_discount != null ? `${activePolicy.ncb_discount}%` : null} />
                    {activePolicy.addons?.length ? (
                      <DetailRow label="Add-ons" value={activePolicy.addons.join(", ")} missing={false} />
                    ) : null}
                    {activePolicy.expiry_date && (
                      <div className="mt-3 pt-2 border-t border-border/40">
                        {(() => {
                          const days = differenceInDays(new Date(activePolicy.expiry_date), new Date());
                          return (
                            <Badge className={`text-xs ${days < 0 ? "bg-red-100 text-red-700" : days <= 7 ? "bg-red-100 text-red-700" : days <= 30 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {days < 0 ? `⚠ Expired ${Math.abs(days)}d ago` : `${days} days to renewal`}
                            </Badge>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Shield className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-medium">No policy found</p>
                    <p className="text-xs mt-1 mb-3">Add policy details for this customer</p>
                    <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowAddPolicy(true)}>
                      <Plus className="h-3.5 w-3.5" /> Add Policy Details
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {clientPolicies.length > 1 && (
              <Card>
                <CardHeader className="pb-1 pt-3 px-5">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Previous Policies ({clientPolicies.length - 1})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-3">
                  <ScrollArea className="max-h-28">
                    {clientPolicies.slice(1).map(p => (
                      <div key={p.id} className="flex justify-between items-center text-xs py-1.5 border-b border-border/30 last:border-0">
                        <span className="truncate">{p.policy_number || "—"} • {p.insurer || "—"}</span>
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
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <FileText className="h-4 w-4 text-amber-600" /> Call Outcome
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-3">
                <Select value={callOutcome} onValueChange={setCallOutcome}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Select outcome..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_OUTCOMES.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        <span className="flex items-center gap-2">
                          <o.icon className={`h-4 w-4 ${o.color}`} />
                          {o.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Visual outcome buttons */}
                <div className="grid grid-cols-1 gap-1.5">
                  {CALL_OUTCOMES.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setCallOutcome(o.value)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left ${
                        callOutcome === o.value
                          ? `${o.bg} ring-2 ring-offset-1 ring-emerald-400 border-transparent`
                          : "border-border/50 hover:bg-muted/50"
                      }`}
                    >
                      <o.icon className={`h-4 w-4 shrink-0 ${o.color}`} />
                      {o.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
                  <Textarea
                    value={callNote}
                    onChange={e => setCallNote(e.target.value)}
                    placeholder="Add call notes..."
                    className="min-h-[70px] text-sm resize-none"
                  />
                </div>

                <Button
                  className="w-full gap-1.5 h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
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

            {/* Existing Notes */}
            {currentClient.notes && (
              <Card>
                <CardHeader className="pb-1 pt-3 px-5">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Existing Notes</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-3">
                  <p className="text-sm whitespace-pre-wrap text-foreground/80 leading-relaxed">{currentClient.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Next in Queue */}
            <Card>
              <CardHeader className="pb-1 pt-3 px-5">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Next in Queue</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-3">
                <ScrollArea className="max-h-48">
                  <div className="space-y-1">
                    {callingList.slice(currentIndex + 1, currentIndex + 8).map((c, i) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between py-2 px-2 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors border border-transparent hover:border-border/50"
                        onClick={() => { setCurrentIndex(currentIndex + 1 + i); setCallNote(""); setCallOutcome(""); }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate text-foreground">{c.customer_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{formatPhone(c.phone)}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                      </div>
                    ))}
                    {callingList.length <= currentIndex + 1 && (
                      <p className="text-xs text-muted-foreground text-center py-3">No more leads in queue</p>
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
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-emerald-600" /> Add / Update Policy</DialogTitle>
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
            <Button onClick={savePolicy} disabled={saving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
