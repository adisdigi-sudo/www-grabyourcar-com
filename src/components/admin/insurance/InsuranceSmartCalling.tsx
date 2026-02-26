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
  CheckCircle2, XCircle, ArrowRight, Eye, Edit, Save, Loader2, PhoneOff
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

  // Fetch in-progress leads
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

  // Active calling list
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
      // Shuffle for random calling
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    }

    return list;
  }, [allClients, callMode, searchFilter]);

  const currentClient = callingList[currentIndex] || null;

  // Fetch policy for current client
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
    
    // Log the call attempt
    if (currentClient) {
      supabase.from("insurance_activity_log").insert({
        client_id: currentClient.id,
        activity_type: "call_attempted",
        title: "Smart Calling dial",
        description: `Called ${currentClient.customer_name || phone} via Smart Calling`,
      }).then(() => {});

      // Increment contact attempts
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
    // Auto-advance after a short delay
    setTimeout(() => goToNext(), 1500);
  }, [currentClient, dialPhone, goToNext]);

  const saveCallOutcome = useCallback(async () => {
    if (!currentClient || !callOutcome) {
      toast.error("Select a call outcome");
      return;
    }
    setSaving(true);
    try {
      // Log activity
      await supabase.from("insurance_activity_log").insert({
        client_id: currentClient.id,
        activity_type: "call_completed",
        title: `Call outcome: ${callOutcome}`,
        description: callNote || `Smart Calling: ${callOutcome}`,
        metadata: { outcome: callOutcome, notes: callNote },
      });

      // Update pipeline stage based on outcome
      const stageUpdate: Record<string, string> = {
        "connected": "contact_attempted",
        "interested": "requirement_collected",
        "quote_requested": "quote_shared",
        "follow_up": "follow_up",
        "not_interested": "lost",
        "no_answer": currentClient.pipeline_stage || "contact_attempted",
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

  // Import CSV handler
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
        pipeline_stage: "new_lead",
        lead_source: "smart_calling_import",
      }, { onConflict: "phone", ignoreDuplicates: true });

      if (!error) imported++;
    }

    toast.success(`Imported ${imported} leads for Smart Calling`);
    queryClient.invalidateQueries({ queryKey: ["smart-calling-clients"] });
    setShowImport(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [queryClient]);

  // Add missing policy form state
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
      // Auto-expire old policies
      const { data: oldPolicies } = await supabase
        .from("insurance_policies")
        .select("id")
        .eq("client_id", currentClient.id)
        .eq("status", "active");

      if (oldPolicies && oldPolicies.length > 0) {
        await supabase.from("insurance_policies")
          .update({ status: "renewed" })
          .in("id", oldPolicies.map(p => p.id));
      }

      await supabase.from("insurance_policies").insert({
        client_id: currentClient.id,
        policy_number: policyForm.policy_number,
        insurer: policyForm.insurer || null,
        premium_amount: policyForm.premium_amount ? Number(policyForm.premium_amount) : null,
        start_date: policyForm.start_date || null,
        expiry_date: policyForm.expiry_date || null,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-primary" />
            Smart Calling
          </h2>
          <p className="text-sm text-muted-foreground">
            {callingList.length} leads in queue • {dialedNumbers.size} dialed this session
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={callMode} onValueChange={(v) => { setCallMode(v as any); setCurrentIndex(0); }}>
            <SelectTrigger className="w-[150px] h-9">
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
              className="pl-8 h-9 w-44"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="gap-1.5">
            <Upload className="h-4 w-4" /> Import
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: callingList.length > 0 ? `${((currentIndex + 1) / callingList.length) * 100}%` : "0%" }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {currentIndex + 1} / {callingList.length}
        </span>
      </div>

      {callingList.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <PhoneOff className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No leads in queue</p>
            <p className="text-sm mt-1">Import leads or wait for new in-progress leads to appear.</p>
          </CardContent>
        </Card>
      ) : currentClient ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Customer Card + Dial */}
          <div className="lg:col-span-1 space-y-3">
            {/* Dial Card */}
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardContent className="pt-5 pb-4 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{currentClient.customer_name || "Unknown"}</h3>
                  <p className="text-2xl font-mono font-bold text-primary mt-1">{formatPhone(currentClient.phone)}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">{getStageLabel(currentClient.pipeline_stage)}</Badge>
                  {currentClient.priority && (
                    <Badge variant={currentClient.priority === "hot" ? "destructive" : "secondary"} className="text-xs">
                      {currentClient.priority}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 gap-2 h-12 text-base" onClick={() => dialPhone(currentClient.phone)}>
                    <Phone className="h-5 w-5" /> Dial Now
                  </Button>
                  <Button variant="outline" className="gap-1.5 h-12" onClick={dialAndAdvance} title="Dial & move to next">
                    <Phone className="h-4 w-4" />
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" size="sm" onClick={goToPrev} disabled={currentIndex === 0} className="gap-1">
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <Button variant="ghost" size="sm" onClick={goToNext} disabled={currentIndex >= callingList.length - 1} className="gap-1">
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Customer Details */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-1.5 text-sm">
                {[
                  { label: "City", value: currentClient.city },
                  { label: "Email", value: currentClient.email },
                  { label: "Source", value: currentClient.lead_source },
                  { label: "Executive", value: currentClient.assigned_executive },
                  { label: "Attempts", value: currentClient.contact_attempts },
                  { label: "Created", value: currentClient.created_at ? format(new Date(currentClient.created_at), "dd MMM yyyy") : null },
                ].map(item => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium text-right">{item.value || "—"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Middle: Policy Details */}
          <div className="lg:col-span-1 space-y-3">
            {/* Vehicle Info */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5" /> Vehicle Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-1.5 text-sm">
                {[
                  { label: "Vehicle", value: [currentClient.vehicle_make, currentClient.vehicle_model].filter(Boolean).join(" ") || null },
                  { label: "Reg. No", value: currentClient.vehicle_number },
                  { label: "Year", value: currentClient.vehicle_year },
                  { label: "Current Insurer", value: currentClient.current_insurer },
                  { label: "Policy Expiry", value: currentClient.policy_expiry_date ? format(new Date(currentClient.policy_expiry_date), "dd MMM yyyy") : null },
                  { label: "Policy Type", value: currentClient.current_policy_type },
                  { label: "NCB %", value: currentClient.ncb_percentage != null ? `${currentClient.ncb_percentage}%` : null },
                  { label: "Premium", value: currentClient.current_premium ? `₹${Number(currentClient.current_premium).toLocaleString("en-IN")}` : null },
                ].map(item => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={`font-medium text-right ${!item.value ? "text-destructive/60 italic" : ""}`}>
                      {item.value || "Missing"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Policy Card */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5 justify-between">
                  <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Policy Details</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setShowAddPolicy(true)}>
                    <Plus className="h-3 w-3" /> {activePolicy ? "Update" : "Add"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {activePolicy ? (
                  <div className="space-y-1.5 text-sm">
                    {[
                      { label: "Policy No.", value: activePolicy.policy_number },
                      { label: "Insurer", value: activePolicy.insurer },
                      { label: "Type", value: activePolicy.policy_type },
                      { label: "Premium", value: activePolicy.premium_amount ? `₹${Number(activePolicy.premium_amount).toLocaleString("en-IN")}` : null },
                      { label: "IDV", value: activePolicy.idv ? `₹${Number(activePolicy.idv).toLocaleString("en-IN")}` : null },
                      { label: "Start", value: activePolicy.start_date ? format(new Date(activePolicy.start_date), "dd MMM yyyy") : null },
                      { label: "Expiry", value: activePolicy.expiry_date ? format(new Date(activePolicy.expiry_date), "dd MMM yyyy") : null },
                      { label: "NCB", value: activePolicy.ncb_discount != null ? `${activePolicy.ncb_discount}%` : null },
                      { label: "Status", value: activePolicy.status },
                      { label: "Add-ons", value: activePolicy.addons?.length ? activePolicy.addons.join(", ") : null },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={`font-medium text-right max-w-[60%] truncate ${!item.value ? "text-destructive/60 italic" : ""}`}>
                          {item.value || "Missing"}
                        </span>
                      </div>
                    ))}
                    {activePolicy.expiry_date && (
                      <div className="mt-2 pt-2 border-t">
                        {(() => {
                          const days = differenceInDays(new Date(activePolicy.expiry_date), new Date());
                          return (
                            <Badge variant={days < 0 ? "destructive" : days <= 7 ? "destructive" : days <= 30 ? "secondary" : "outline"} className="text-xs">
                              {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days to renewal`}
                            </Badge>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No policy found</p>
                    <p className="text-xs mt-1">Add policy details for this customer</p>
                    <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={() => setShowAddPolicy(true)}>
                      <Plus className="h-3.5 w-3.5" /> Add Policy Details
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Previous policies */}
            {clientPolicies.length > 1 && (
              <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">Previous Policies ({clientPolicies.length - 1})</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <ScrollArea className="max-h-32">
                    {clientPolicies.slice(1).map(p => (
                      <div key={p.id} className="flex justify-between text-xs py-1 border-b last:border-0">
                        <span>{p.policy_number || "—"} ({p.insurer || "—"})</span>
                        <Badge variant="outline" className="text-[10px] h-4">{p.status}</Badge>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Call Outcome */}
          <div className="lg:col-span-1 space-y-3">
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Call Outcome
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <Select value={callOutcome} onValueChange={setCallOutcome}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select outcome..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connected">✅ Connected</SelectItem>
                    <SelectItem value="interested">🔥 Interested</SelectItem>
                    <SelectItem value="quote_requested">📋 Quote Requested</SelectItem>
                    <SelectItem value="follow_up">⏰ Follow-up Needed</SelectItem>
                    <SelectItem value="no_answer">📵 No Answer</SelectItem>
                    <SelectItem value="not_interested">❌ Not Interested</SelectItem>
                    <SelectItem value="wrong_number">⚠️ Wrong Number</SelectItem>
                  </SelectContent>
                </Select>

                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    value={callNote}
                    onChange={e => setCallNote(e.target.value)}
                    placeholder="Add call notes..."
                    className="mt-1 min-h-[80px] text-sm"
                  />
                </div>

                <Button className="w-full gap-1.5" onClick={saveCallOutcome} disabled={saving || !callOutcome}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save & Next
                </Button>

                <Separator />

                <Button variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground" onClick={goToNext}>
                  <SkipForward className="h-4 w-4" /> Skip to Next
                </Button>
              </CardContent>
            </Card>

            {/* Notes */}
            {currentClient.notes && (
              <Card>
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">Existing Notes</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <p className="text-sm whitespace-pre-wrap">{currentClient.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Queue Preview */}
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground">Next in Queue</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <ScrollArea className="max-h-40">
                  {callingList.slice(currentIndex + 1, currentIndex + 6).map((c, i) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between py-1.5 border-b last:border-0 cursor-pointer hover:bg-muted/50 rounded px-1"
                      onClick={() => { setCurrentIndex(currentIndex + 1 + i); setCallNote(""); setCallOutcome(""); }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.customer_name || c.phone}</p>
                        <p className="text-xs text-muted-foreground">{formatPhone(c.phone)}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{getStageLabel(c.pipeline_stage)}</Badge>
                    </div>
                  ))}
                  {callingList.length <= currentIndex + 1 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No more leads in queue</p>
                  )}
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
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Add / Update Policy</DialogTitle>
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
                <Label className="text-xs">{f.label}</Label>
                <Input
                  type={f.type || "text"}
                  value={(policyForm as any)[f.key]}
                  onChange={e => setPolicyForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="h-9 text-sm"
                />
              </div>
            ))}
            <Select value={policyForm.policy_type} onValueChange={v => setPolicyForm(p => ({ ...p, policy_type: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="comprehensive">Comprehensive</SelectItem>
                <SelectItem value="third_party">Third Party</SelectItem>
                <SelectItem value="own_damage">Own Damage</SelectItem>
                <SelectItem value="standalone_od">Standalone OD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={savePolicy} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
