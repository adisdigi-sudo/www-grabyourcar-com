import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { differenceInDays, format, startOfMonth, endOfMonth } from "date-fns";
import {
  UserPlus, Clock, CheckCircle2, Shield, TrendingUp,
  Plus, FileSpreadsheet, BookOpen, CalendarClock, Wrench, AlertTriangle, Calculator, ArrowRight, Rocket
} from "lucide-react";
import { LeadImportDialog } from "../shared/LeadImportDialog";
import { StageNotificationBanner, buildInsuranceNotifications } from "../shared/StageNotificationBanner";
import { BulkRenewalQuoteGenerator } from "./BulkRenewalQuoteGenerator";
import { InsuranceLeadPipeline, normalizeStage, LEAD_SOURCES, type Client } from "./InsuranceLeadPipeline";
import { InsurancePolicyBook, type PolicyRecord } from "./InsurancePolicyBook";
import { InsuranceComingRenewals } from "./InsuranceComingRenewals";
import { InsuranceOverdueRenewals } from "./InsuranceOverdueRenewals";
import { InsurancePremiumCalculator } from "./InsurancePremiumCalculator";
import { InsuranceKpiDetailDialog } from "./InsuranceKpiDetailDialog";
import { InsuranceRenewalCampaign } from "./InsuranceRenewalCampaign";
import { InsurancePerformance } from "./InsurancePerformance";

type ActiveView = "pipeline" | "policy_book" | "renewals" | "overdue" | "bulk_tools" | "renewal_campaign" | "performance";
type KpiType = "total_leads" | "in_pipeline" | "won" | "active_policies" | "conversion" | null;

type LegacyInsuranceLead = {
  id: string;
  customer_name: string | null;
  phone: string;
  source: string | null;
};

export function InsuranceWorkspace() {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<ActiveView>("pipeline");
  const [kpiDetail, setKpiDetail] = useState<KpiType>(null);
  const [showCalcDialog, setShowCalcDialog] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({
    customer_name: "", phone: "", email: "", city: "",
    vehicle_number: "", vehicle_make: "", vehicle_model: "",
    lead_source: "Manual", notes: "",
  });

  useEffect(() => {
    const notifyAndRefresh = (lead: { customer_name?: string | null; phone?: string | null; lead_source?: string | null; source?: string | null }) => {
      queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
      toast.success("New insurance lead received", {
        description: [lead.customer_name || "Unknown", lead.phone || "", lead.lead_source || lead.source || "Unknown"].filter(Boolean).join(" • "),
      });
    };

    const channel = supabase
      .channel("insurance-workspace-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "insurance_clients" },
        (payload) => notifyAndRefresh(payload.new as Client)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "insurance_leads" },
        (payload) => notifyAndRefresh(payload.new as LegacyInsuranceLead)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["ins-workspace-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, email, city, vehicle_number, vehicle_make, vehicle_model, vehicle_year, current_insurer, current_policy_type, current_premium, ncb_percentage, previous_claim, policy_expiry_date, policy_start_date, current_policy_number, lead_source, lead_status, assigned_executive, priority, pipeline_stage, contact_attempts, quote_amount, quote_insurer, lost_reason, follow_up_date, follow_up_time, call_status, call_remarks, renewal_reminder_set, renewal_reminder_date, incentive_eligible, notes, retarget_status, journey_last_event, journey_last_event_at, picked_up_by, picked_up_at, booking_date, booked_by, overdue_reason, overdue_custom_reason, overdue_marked_at, created_at, updated_at")
        .eq("is_legacy", false)
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      return (data || []) as Client[];
    },
  });

  const { data: allPolicies = [] } = useQuery({
    queryKey: ["ins-policies-book"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("id, client_id, policy_number, policy_type, insurer, premium_amount, start_date, expiry_date, status, is_renewal, issued_date, plan_name, idv, policy_document_url, source_label, renewal_count, previous_policy_id, booking_date, created_at, updated_at, insurance_clients(customer_name, phone, city, vehicle_number, vehicle_make, vehicle_model, lead_source, booking_date, updated_at, created_at)")
        .in("status", ["active", "renewed"])
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PolicyRecord[];
    },
  });

  // Split policies into running (Policy Book) vs overdue (expired)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const runningPolicies = useMemo(() =>
    allPolicies.filter(p => {
      if (p.status === "renewed") return true; // renewed records stay in book as historical
      if (!p.expiry_date) return true; // no expiry = show in book
      return new Date(p.expiry_date) >= today;
    }), [allPolicies, today.toDateString()]
  );
  const RESOLVED_STATUSES = ["renewed", "lapsed", "cancelled", "lost"];
  const overduePolicies = useMemo(() =>
    allPolicies.filter(p => {
      if (!p.expiry_date) return false;
      if (RESOLVED_STATUSES.includes(p.status || "")) return false;
      return new Date(p.expiry_date) < today;
    }), [allPolicies, today.toDateString()]
  );

  const isWon = (c: Client) => {
    const stage = normalizeStage(c.pipeline_stage, c.lead_status);
    return stage === "won" || stage === "policy_issued";
  };
  const isLost = (c: Client) => normalizeStage(c.pipeline_stage, c.lead_status) === "lost";

  const totalLeads = clients.length;
  const wonCount = clients.filter(isWon).length;
  const lostCount = clients.filter(isLost).length;
  const inPipeline = totalLeads - wonCount - lostCount;

  // Month-wise conversion calculation
  const monthWiseConversion = useMemo(() => {
    const monthMap: Record<string, { total: number; won: number; renewals: number; rollovers: number }> = {};
    // Group leads by created_at month for total count
    clients.forEach(c => {
      const d = c.created_at ? new Date(c.created_at) : new Date();
      const key = format(d, "yyyy-MM");
      if (!monthMap[key]) monthMap[key] = { total: 0, won: 0, renewals: 0, rollovers: 0 };
      monthMap[key].total++;
      const src = (c.lead_source || "").toLowerCase();
      if (src.includes("renewal") || src.includes("renew")) monthMap[key].renewals++;
      if (src.includes("rollover") || src.includes("roll")) monthMap[key].rollovers++;
    });
    // Group won leads by updated_at (when they were actually converted)
    clients.filter(isWon).forEach(c => {
      const d = c.updated_at ? new Date(c.updated_at) : (c.created_at ? new Date(c.created_at) : new Date());
      const key = format(d, "yyyy-MM");
      if (!monthMap[key]) monthMap[key] = { total: 0, won: 0, renewals: 0, rollovers: 0 };
      monthMap[key].won++;
    });
    return Object.entries(monthMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([month, d]) => ({
        month: format(new Date(month + "-01"), "MMM yyyy"),
        total: d.total,
        won: d.won,
        rate: d.total > 0 ? ((d.won / d.total) * 100).toFixed(1) : "0",
        renewals: d.renewals,
        rollovers: d.rollovers,
      }));
  }, [clients]);

  // Current month conversion rate
  const currentMonthKey = format(new Date(), "MMM yyyy");
  const currentMonthData = monthWiseConversion.find(m => m.month === currentMonthKey);
  const convRate = currentMonthData ? currentMonthData.rate : "0";

  const activePolicies = runningPolicies.filter(p => p.status === "active").length;
  const renewalsDue = useMemo(() => {
    const now = new Date();
    return runningPolicies.filter(p => p.expiry_date && p.status !== "renewed" && differenceInDays(new Date(p.expiry_date), now) >= 0 && differenceInDays(new Date(p.expiry_date), now) <= 60).length;
  }, [runningPolicies]);
  const urgentRenewals = useMemo(() => {
    const now = new Date();
    return runningPolicies.filter(p => p.expiry_date && p.status !== "renewed" && differenceInDays(new Date(p.expiry_date), now) >= 0 && differenceInDays(new Date(p.expiry_date), now) <= 7).length;
  }, [runningPolicies]);
  const overdueCount = overduePolicies.length;

  const insNotifications = useMemo(() => buildInsuranceNotifications(clients), [clients]);

  const addLead = async () => {
    if (!newLead.phone.trim()) { toast.error("Phone is required"); return; }
    if (!newLead.customer_name.trim()) { toast.error("Name is required"); return; }
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
    if (error) { toast.error(error.message); return; }
    toast.success("✅ New lead added!");
    queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
    setShowAddLead(false);
    setNewLead({ customer_name: "", phone: "", email: "", city: "", vehicle_number: "", vehicle_make: "", vehicle_model: "", lead_source: "Manual", notes: "" });
  };

  const TABS = [
    { key: "pipeline" as const, label: "Lead Pipeline", icon: Shield, count: totalLeads, urgent: false },
    { key: "policy_book" as const, label: "Policy Book", icon: BookOpen, count: activePolicies, urgent: false },
    { key: "renewals" as const, label: "Coming Renewals", icon: CalendarClock, count: renewalsDue, urgent: urgentRenewals > 0 },
    { key: "overdue" as const, label: "Overdue", icon: AlertTriangle, count: overdueCount, urgent: overdueCount > 0 },
    { key: "bulk_tools" as const, label: "Bulk Tools", icon: Wrench, count: 0, urgent: false },
    { key: "calculator" as const, label: "Calculator", icon: Calculator, count: 0, urgent: false },
    { key: "renewal_campaign" as const, label: "Renewal Campaign", icon: Rocket, count: 0, urgent: false },
    { key: "performance" as const, label: "Performance", icon: TrendingUp, count: wonCount, urgent: false },
  ];

  return (
    <div className="space-y-5">
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
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => setShowImport(true)} className="gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/20">
                <FileSpreadsheet className="h-4 w-4" /> Rollover
              </Button>
              <Button size="sm" onClick={() => setShowAddLead(true)} className="gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/20">
                <Plus className="h-4 w-4" /> Add Lead
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total Leads", value: totalLeads, icon: UserPlus, bgc: "bg-blue-500/20", kpi: "total_leads" as KpiType },
              { label: "In Pipeline", value: inPipeline, icon: Clock, bgc: "bg-orange-400/20", kpi: "in_pipeline" as KpiType },
              { label: "Won / Issued", value: wonCount, icon: CheckCircle2, bgc: "bg-emerald-400/20", kpi: "won" as KpiType },
              { label: "Active Policies", value: activePolicies, icon: BookOpen, bgc: "bg-cyan-400/20", kpi: "active_policies" as KpiType },
              { label: "Conv (This Month)", value: `${convRate}%`, icon: TrendingUp, bgc: "bg-violet-400/20", kpi: "conversion" as KpiType },
            ].map(kpi => (
              <div
                key={kpi.label}
                className={`${kpi.bgc} backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 cursor-pointer hover:border-white/30 hover:scale-[1.02] transition-all`}
                onClick={() => setKpiDetail(kpi.kpi)}
              >
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

      <div className="flex gap-2 bg-muted/50 p-1 rounded-xl border">
        {TABS.map(tab => (
          <Button key={tab.key} variant={activeView === tab.key ? "default" : "ghost"} size="sm"
            className={cn("flex-1 gap-1.5 text-xs", activeView === tab.key && "shadow-sm")}
            onClick={() => setActiveView(tab.key)}>
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.count > 0 && <Badge variant={activeView === tab.key ? "secondary" : "outline"} className="text-[9px] h-4 px-1">{tab.count}</Badge>}
            {tab.urgent && (
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            )}
          </Button>
        ))}
      </div>

      {activeView !== "calculator" && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Calculator className="h-3.5 w-3.5" />
                New premium engine is live
              </div>
              <h3 className="text-lg font-bold text-foreground">Generate quotes with your own OD, TP, NCB and add-on pricing</h3>
              <p className="text-sm text-muted-foreground">Open the calculator to create fast manual quotes with live premium breakdown and copy-ready output.</p>
            </div>
            <Button onClick={() => setActiveView("calculator")} className="gap-2 self-start sm:self-auto">
              Open Calculator
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {insNotifications.length > 0 && <StageNotificationBanner items={insNotifications} />}

      <LeadImportDialog open={showImport} onOpenChange={setShowImport} title="Rollover Insurance Data"
        templateColumns={["name", "phone", "city", "vehicle_number", "vehicle_make", "vehicle_model", "source"]}
        onImport={async (leads) => {
          const rows = leads.map(l => ({
            customer_name: l.name || l.customer_name || "Unknown",
            phone: (l.phone || l.mobile || "").replace(/\D/g, ""),
            city: l.city || null,
            vehicle_number: l.vehicle_number || null,
            vehicle_make: l.vehicle_make || null,
            vehicle_model: l.vehicle_model || null,
            lead_source: "Rollover",
            pipeline_stage: "new_lead",
            lead_status: "new",
            priority: "medium",
          }));
          const { error } = await supabase.from("insurance_clients").insert(rows);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
        }}
      />

      {activeView === "pipeline" && <InsuranceLeadPipeline clients={clients} isLoading={isLoading} />}
      {activeView === "policy_book" && <InsurancePolicyBook policies={runningPolicies} />}
      {activeView === "renewals" && <InsuranceComingRenewals policies={runningPolicies as PolicyRecord[]} />}
      {activeView === "overdue" && <InsuranceOverdueRenewals policies={overduePolicies as PolicyRecord[]} clients={clients} />}
      {activeView === "bulk_tools" && <BulkRenewalQuoteGenerator onClose={() => setActiveView("pipeline")} />}
      {activeView === "calculator" && <InsurancePremiumCalculator />}
      {activeView === "renewal_campaign" && <InsuranceRenewalCampaign />}
      {activeView === "performance" && <InsurancePerformance clients={clients} policies={allPolicies as PolicyRecord[]} />}

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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLead(false)}>Cancel</Button>
            <Button onClick={addLead} disabled={!newLead.customer_name.trim() || !newLead.phone.trim()} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InsuranceKpiDetailDialog
        open={!!kpiDetail}
        onOpenChange={(v) => { if (!v) setKpiDetail(null); }}
        kpiType={kpiDetail}
        clients={clients}
        policies={runningPolicies.filter(p => p.status === "active")}
        monthWiseConversion={monthWiseConversion}
      />
    </div>
  );
}
