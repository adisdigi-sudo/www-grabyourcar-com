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
import { dedupeInsuranceClients, dedupeInsurancePolicies, getClientEffectiveDate, getPolicyEffectiveDate, normalizePhoneNumber, normalizeVehicleRegistration } from "@/lib/insuranceIdentity";
import { differenceInDays, format, startOfMonth, endOfMonth, parse } from "date-fns";
import { fetchAllPages } from "@/lib/fetchAllPages";
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
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "insurance_policies" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["ins-policies-book"] });
          queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["ins-workspace-clients"],
    queryFn: async () => {
      const data = await fetchAllPages<Client>(async (from, to) =>
        supabase
          .from("insurance_clients")
          .select("id, customer_name, phone, email, city, vehicle_number, vehicle_make, vehicle_model, vehicle_year, current_insurer, current_policy_type, current_premium, ncb_percentage, previous_claim, policy_expiry_date, policy_start_date, current_policy_number, lead_source, lead_status, assigned_executive, priority, pipeline_stage, contact_attempts, quote_amount, quote_insurer, lost_reason, follow_up_date, follow_up_time, call_status, call_remarks, renewal_reminder_set, renewal_reminder_date, incentive_eligible, notes, retarget_status, journey_last_event, journey_last_event_at, picked_up_by, picked_up_at, booking_date, booked_by, overdue_reason, overdue_custom_reason, overdue_marked_at, duplicate_count, is_duplicate, created_at, updated_at")
          .eq("is_legacy", false)
          .order("updated_at", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, to)
      );

      return data;
    },
  });

  const { data: allPolicies = [] } = useQuery({
    queryKey: ["ins-policies-book"],
    queryFn: async () => {
      const data = await fetchAllPages<PolicyRecord>(async (from, to) =>
        supabase
          .from("insurance_policies")
          .select("id, client_id, policy_number, policy_type, insurer, premium_amount, start_date, expiry_date, status, is_renewal, issued_date, plan_name, idv, policy_document_url, source_label, renewal_count, previous_policy_id, booking_date, created_at, updated_at, insurance_clients(customer_name, phone, city, vehicle_number, vehicle_make, vehicle_model, lead_source, booking_date, updated_at, created_at)")
          .in("status", ["active", "renewed"])
          .order("updated_at", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, to)
      );

      return data;
    },
  });

  const dedupedClients = useMemo(() => dedupeInsuranceClients(clients), [clients]);

  const isWon = (c: Client) => {
    const stage = normalizeStage(c.pipeline_stage, c.lead_status, c);
    return stage === "won" || stage === "policy_issued";
  };
  const isLost = (c: Client) => normalizeStage(c.pipeline_stage, c.lead_status, c) === "lost";

  const policyBookPolicies = useMemo(() => {
    const existingClientIds = new Set(
      allPolicies
        .map((policy) => policy.client_id)
        .filter(Boolean) as string[]
    );

    const fallbackPolicies: PolicyRecord[] = dedupedClients
      .filter((client) => isWon(client) && !existingClientIds.has(client.id) && Boolean(client.current_policy_number?.trim()))
      .map((client) => ({
        id: `fallback-${client.id}`,
        client_id: client.id,
        policy_number: client.current_policy_number || null,
        policy_type: client.current_policy_type || null,
        insurer: client.current_insurer || client.quote_insurer || null,
        premium_amount: client.current_premium || client.quote_amount || null,
        start_date: client.policy_start_date || client.booking_date || null,
        expiry_date: client.policy_expiry_date || null,
        status: "active",
        is_renewal: false,
        issued_date: client.booking_date || null,
        plan_name: null,
        idv: null,
        policy_document_url: null,
        source_label: "Recovered Won Client",
        renewal_count: 0,
        previous_policy_id: null,
        booking_date: client.booking_date || client.policy_start_date || null,
        created_at: client.created_at,
        updated_at: client.updated_at,
        insurance_clients: {
          customer_name: client.customer_name || "—",
          phone: client.phone || "",
          city: client.city || null,
          vehicle_number: client.vehicle_number || null,
          vehicle_make: client.vehicle_make || null,
          vehicle_model: client.vehicle_model || null,
          lead_source: client.lead_source || null,
          booking_date: client.booking_date || null,
          updated_at: client.updated_at,
          created_at: client.created_at,
        },
      }));

    return dedupeInsurancePolicies([...fallbackPolicies, ...allPolicies]);
  }, [allPolicies, dedupedClients]);

  const monthOptions = useMemo(() => {
    // Find earliest date from data
    let earliest = new Date();
    dedupedClients.forEach((client) => {
      const d = getClientEffectiveDate(client);
      if (d) { const dt = new Date(d); if (dt < earliest) earliest = dt; }
    });
    policyBookPolicies.forEach((policy) => {
      const d = getPolicyEffectiveDate(policy);
      if (d) { const dt = new Date(d); if (dt < earliest) earliest = dt; }
    });

    // Generate continuous range from earliest month to current month
    const now = new Date();
    const startMonth = startOfMonth(earliest);
    const endMonth = startOfMonth(now);
    const months: { value: string; label: string }[] = [];
    let cursor = endMonth;
    while (cursor >= startMonth && months.length < 24) {
      const value = format(cursor, "yyyy-MM");
      months.push({ value, label: format(cursor, "MMM yyyy") });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    }
    return months;
  }, [dedupedClients, policyBookPolicies]);

  const monthStart = useMemo(() => startOfMonth(parse(`${selectedMonth}-01`, "yyyy-MM-dd", new Date())), [selectedMonth]);
  const monthEnd = useMemo(() => endOfMonth(monthStart), [monthStart]);

  const monthFilteredClients = useMemo(() =>
    dedupedClients.filter((client) => {
      const rawDate = getClientEffectiveDate(client);
      if (!rawDate) return false;
      const date = new Date(rawDate);
      return date >= monthStart && date <= monthEnd;
    }),
  [dedupedClients, monthEnd, monthStart]);

  const monthFilteredPolicies = useMemo(() =>
    policyBookPolicies.filter((policy) => {
      const rawDate = getPolicyEffectiveDate(policy);
      if (!rawDate) return false;
      const date = new Date(rawDate);
      return date >= monthStart && date <= monthEnd;
    }),
  [monthEnd, monthStart, policyBookPolicies]);

  // Split policies into running (Policy Book) vs overdue (expired)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const runningPolicies = useMemo(() =>
    policyBookPolicies.filter(p => {
      const status = (p.status || "").toLowerCase();
      if (!p.policy_number?.trim()) return false;
      if (["renewed", "lapsed", "cancelled", "lost"].includes(status)) return false;
      if (!p.expiry_date || !p.start_date) return true;
      const expiry = new Date(p.expiry_date);
      const start = new Date(p.start_date);
      if (expiry < start) return true;
      return expiry >= today;
    }), [policyBookPolicies, today.toDateString()]
  );
  const RESOLVED_STATUSES = ["renewed", "lapsed", "cancelled", "lost"];
  const overduePolicies = useMemo(() =>
    allPolicies.filter(p => {
      if (!p.policy_number?.trim()) return false;
      if (!p.expiry_date) return false;
      if (RESOLVED_STATUSES.includes(p.status || "")) return false;
      return new Date(p.expiry_date) < today;
    }), [allPolicies, today.toDateString()]
  );

  const totalLeads = monthFilteredClients.length;
  const wonCountMonth = monthFilteredPolicies.filter((policy) => (policy.status || "").toLowerCase() === "active").length;
  const lostCount = monthFilteredClients.filter(isLost).length;
  const inPipeline = totalLeads - wonCountMonth - lostCount;

  // Total counts (not month-filtered) for tab badges
  const totalRunningPolicies = runningPolicies.length;
  const totalWonPolicies = policyBookPolicies.filter(p => (p.status || "").toLowerCase() === "active").length;

  // Month-wise conversion calculation based on real booking/policy dates
  const monthWiseConversion = useMemo(() => {
    const monthMap: Record<string, { total: number; won: number; renewals: number; rollovers: number; wonClients: Set<string> }> = {};

    dedupedClients.forEach((client) => {
      const effectiveDate = getClientEffectiveDate(client);
      if (!effectiveDate) return;
      const d = new Date(effectiveDate);
      const key = format(d, "yyyy-MM");
      if (!monthMap[key]) monthMap[key] = { total: 0, won: 0, renewals: 0, rollovers: 0, wonClients: new Set() };
      monthMap[key].total++;
      const src = (client.lead_source || "").toLowerCase();
      if (src.includes("renewal") || src.includes("renew")) monthMap[key].renewals++;
      if (src.includes("rollover") || src.includes("roll")) monthMap[key].rollovers++;
    });

    policyBookPolicies.forEach((policy) => {
      const policyDate = getPolicyEffectiveDate(policy);
      if (!policyDate) return;
      const d = new Date(policyDate);
      const key = format(d, "yyyy-MM");
      if (!monthMap[key]) monthMap[key] = { total: 0, won: 0, renewals: 0, rollovers: 0, wonClients: new Set() };
      monthMap[key].won++;
      if (policy.client_id) monthMap[key].wonClients.add(policy.client_id);
    });

    return Object.entries(monthMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([month, d]) => ({
        month: format(new Date(month + "-01"), "MMM yyyy"),
        total: d.total,
        won: d.won,
        rate: d.total > 0 ? ((d.wonClients.size / d.total) * 100).toFixed(1) : "0",
        renewals: d.renewals,
        rollovers: d.rollovers,
      }));
  }, [dedupedClients, policyBookPolicies]);

  // Current month conversion rate
  const selectedMonthLabel = format(parse(`${selectedMonth}-01`, "yyyy-MM-dd", new Date()), "MMM yyyy");
  const currentMonthData = monthWiseConversion.find(m => m.month === selectedMonthLabel);
  const convRate = currentMonthData ? currentMonthData.rate : "0";

  const activePolicies = monthFilteredPolicies.filter(p => (p.status || "").toLowerCase() === "active").length;
  const renewalsDue = useMemo(() => {
    const now = new Date();
    return runningPolicies.filter(p => p.expiry_date && p.status !== "renewed" && differenceInDays(new Date(p.expiry_date), now) >= 0 && differenceInDays(new Date(p.expiry_date), now) <= 60).length;
  }, [runningPolicies]);
  const urgentRenewals = useMemo(() => {
    const now = new Date();
    return runningPolicies.filter(p => p.expiry_date && p.status !== "renewed" && differenceInDays(new Date(p.expiry_date), now) >= 0 && differenceInDays(new Date(p.expiry_date), now) <= 7).length;
  }, [runningPolicies]);
  const overdueCount = overduePolicies.length;

  const insNotifications = useMemo(() => buildInsuranceNotifications(dedupedClients), [dedupedClients]);

  const addLead = async () => {
    if (!newLead.phone.trim()) { toast.error("Phone is required"); return; }
    if (!newLead.customer_name.trim()) { toast.error("Name is required"); return; }

    const cleanPhone = normalizePhoneNumber(newLead.phone);
    const cleanVehicle = normalizeVehicleRegistration(newLead.vehicle_number) || null;

    // Check for existing client by phone or vehicle number
    let existingQuery = supabase.from("insurance_clients").select("id, customer_name, vehicle_number, duplicate_count").or(`phone.eq.${cleanPhone}`);
    if (cleanVehicle) {
      existingQuery = supabase.from("insurance_clients").select("id, customer_name, vehicle_number, duplicate_count")
        .or(`phone.eq.${cleanPhone},vehicle_number.eq.${cleanVehicle}`);
    }
    const { data: existing } = await existingQuery.limit(1);

    if (existing && existing.length > 0) {
      const dup = existing[0];
      const newDupCount = (dup.duplicate_count || 0) + 1;
      await supabase.from("insurance_clients").update({
        duplicate_count: newDupCount,
        is_duplicate: true,
        customer_name: newLead.customer_name.trim() || dup.customer_name,
        email: newLead.email.trim() || undefined,
        city: newLead.city.trim() || undefined,
        vehicle_number: cleanVehicle || dup.vehicle_number,
        vehicle_make: newLead.vehicle_make.trim() || undefined,
        vehicle_model: newLead.vehicle_model.trim() || undefined,
        notes: newLead.notes.trim() || undefined,
        updated_at: new Date().toISOString(),
      }).eq("id", dup.id);
      toast.info(`⚠️ Duplicate lead detected (Entry #${newDupCount + 1}) — existing record updated`, {
        description: `${dup.customer_name} • ${dup.vehicle_number || cleanPhone}`,
      });
      queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
      setShowAddLead(false);
      setNewLead({ customer_name: "", phone: "", email: "", city: "", vehicle_number: "", vehicle_make: "", vehicle_model: "", lead_source: "Manual", notes: "" });
      return;
    }

    const { error } = await supabase.from("insurance_clients").insert({
      customer_name: newLead.customer_name.trim(),
      phone: cleanPhone,
      email: newLead.email.trim() || null,
      city: newLead.city.trim() || null,
      vehicle_number: cleanVehicle,
      vehicle_make: newLead.vehicle_make.trim() || null,
      vehicle_model: newLead.vehicle_model.trim() || null,
      lead_source: newLead.lead_source || "Manual",
      notes: newLead.notes.trim() || null,
      pipeline_stage: "new_lead",
      lead_status: "new",
      priority: "medium",
      duplicate_count: 0,
      is_duplicate: false,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("✅ New lead added!");
    queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
    setShowAddLead(false);
    setNewLead({ customer_name: "", phone: "", email: "", city: "", vehicle_number: "", vehicle_make: "", vehicle_model: "", lead_source: "Manual", notes: "" });
  };

  const TABS = [
    { key: "pipeline" as const, label: "Lead Pipeline", icon: Shield, count: totalLeads, urgent: false },
    { key: "policy_book" as const, label: "Policy Book", icon: BookOpen, count: totalRunningPolicies, urgent: false },
    { key: "renewals" as const, label: "Coming Renewals", icon: CalendarClock, count: renewalsDue, urgent: urgentRenewals > 0 },
    { key: "overdue" as const, label: "Overdue", icon: AlertTriangle, count: overdueCount, urgent: overdueCount > 0 },
    { key: "bulk_tools" as const, label: "Bulk Tools", icon: Wrench, count: 0, urgent: false },
    { key: "renewal_campaign" as const, label: "Renewal Campaign", icon: Rocket, count: 0, urgent: false },
    { key: "performance" as const, label: "Performance", icon: TrendingUp, count: wonCountMonth, urgent: false },
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
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9 w-[140px] bg-white/15 text-white border-white/20 backdrop-blur-sm [&>svg]:text-white/80">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              { label: "Won / Issued", value: wonCountMonth, icon: CheckCircle2, bgc: "bg-emerald-400/20", kpi: "won" as KpiType },
              { label: "Active Policies", value: totalRunningPolicies, icon: BookOpen, bgc: "bg-cyan-400/20", kpi: "active_policies" as KpiType },
              { label: `Conv (${selectedMonthLabel})`, value: `${convRate}%`, icon: TrendingUp, bgc: "bg-violet-400/20", kpi: "conversion" as KpiType },
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

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Calculator className="h-3.5 w-3.5" />
              Premium Calculator
            </div>
            <h3 className="text-lg font-bold text-foreground">Generate quotes with OD, TP, NCB and add-on pricing</h3>
            <p className="text-sm text-muted-foreground">Create quotes, generate PDF, share via WhatsApp — all quotes auto-saved.</p>
          </div>
          <Button onClick={() => setShowCalcDialog(true)} className="gap-2 self-start sm:self-auto">
            Open Calculator
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {insNotifications.length > 0 && <StageNotificationBanner items={insNotifications} />}

      <LeadImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        title="Rollover Insurance Data"
        requirePhone={false}
        templateColumns={["booking_date", "insured_name", "registration_number", "insurer", "policy_no", "premium", "status"]}
        onImport={async (rows) => {
          const normalizeImportKey = (value: string) =>
            value
              .trim()
              .toLowerCase()
              .replace(/^\ufeff/, "")
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_+|_+$/g, "");

          const normalizeImportPolicyNumber = (value: string | null | undefined) =>
            (value || "")
              .replace(/^#+/, "")
              .replace(/\s+/g, "")
              .toUpperCase()
              .trim();

          const getRowValue = (row: Record<string, string>, keys: string[]) => {
            const entries = new Map(
              Object.entries(row).map(([key, value]) => [normalizeImportKey(key), String(value || "").trim()])
            );

            for (const key of keys) {
              const match = entries.get(normalizeImportKey(key));
              if (match) return match;
            }

            return "";
          };

          const parseImportDate = (value: string) => value.match(/\d{4}-\d{2}-\d{2}/)?.[0] || null;

          const parseImportNumber = (value: string) => {
            const cleaned = value.replace(/[^0-9.]/g, "");
            if (!cleaned) return null;
            const parsed = Number(cleaned);
            return Number.isFinite(parsed) ? parsed : null;
          };

          const deriveExpiryDate = (startDate: string | null) => {
            if (!startDate) return null;
            const next = new Date(`${startDate}T00:00:00`);
            if (Number.isNaN(next.getTime())) return null;
            next.setFullYear(next.getFullYear() + 1);
            next.setDate(next.getDate() - 1);
            return format(next, "yyyy-MM-dd");
          };

          const clientByPolicy = new Map<string, string>();
          const clientByVehicle = new Map<string, string>();
          const clientByPhone = new Map<string, string>();
          const policyByNumber = new Map<string, Pick<PolicyRecord, "id" | "client_id" | "policy_number">>();

          const rememberClient = (clientId: string, policyNumber?: string | null, vehicleNumber?: string | null, phone?: string | null) => {
            if (policyNumber) clientByPolicy.set(policyNumber, clientId);
            if (vehicleNumber) clientByVehicle.set(vehicleNumber, clientId);
            if (phone) clientByPhone.set(phone, clientId);
          };

          clients.forEach((client) => {
            rememberClient(
              client.id,
              normalizeImportPolicyNumber(client.current_policy_number || ""),
              normalizeVehicleRegistration(client.vehicle_number || "") || null,
              normalizePhoneNumber(client.phone || "") || null
            );
          });

          allPolicies.forEach((policy) => {
            const key = normalizeImportPolicyNumber(policy.policy_number || "");
            if (!key) return;
            policyByNumber.set(key, { id: policy.id, client_id: policy.client_id, policy_number: policy.policy_number });
            if (policy.client_id) clientByPolicy.set(key, policy.client_id);
          });

          let inserted = 0;
          let updated = 0;
          let skipped = 0;
          let duplicatesInFile = 0;
          let failed = 0;
          const seenUploadKeys = new Set<string>();

          for (const row of rows) {
            const policyNumber = normalizeImportPolicyNumber(getRowValue(row, ["policy_no", "policy_number"]));
            const vehicleNumber = normalizeVehicleRegistration(getRowValue(row, ["registration_number", "vehicle_number"])) || null;
            const cleanPhone = normalizePhoneNumber(getRowValue(row, ["phone", "mobile"])) || null;
            const leadId = getRowValue(row, ["lead_id"]);
            const rowKey = policyNumber ? `policy:${policyNumber}` : vehicleNumber ? `vehicle:${vehicleNumber}` : cleanPhone ? `phone:${cleanPhone}` : leadId ? `lead:${leadId}` : "";

            if (!rowKey) {
              skipped++;
              continue;
            }

            if (seenUploadKeys.has(rowKey)) {
              duplicatesInFile++;
              continue;
            }
            seenUploadKeys.add(rowKey);

            const statusText = getRowValue(row, ["status"]);
            const statusLower = statusText.toLowerCase();
            const isSaleComplete = statusLower === "sale complete";
            const isRejected = statusLower.includes("reject");
            const customerName = getRowValue(row, ["insured_name", "customer_name", "name"]) || "Insurance Client";
            const bookingDate = parseImportDate(getRowValue(row, ["booking_date", "ticket_raised_on"])) || parseImportDate(getRowValue(row, ["issuance_rej_date"]));
            const issuedDate = parseImportDate(getRowValue(row, ["issuance_rej_date"])) || bookingDate;
            const policyStartDate = issuedDate || bookingDate;
            const policyExpiryDate = deriveExpiryDate(policyStartDate);
            const premium = parseImportNumber(getRowValue(row, ["premium"]));
            const netPremium = parseImportNumber(getRowValue(row, ["net_premium"]));
            const idv = parseImportNumber(getRowValue(row, ["sum_insured"]));
            const tpPremium = parseImportNumber(getRowValue(row, ["tp_premium"]));
            const discount = parseImportNumber(getRowValue(row, ["discount"]));
            const insurer = getRowValue(row, ["insurer"]);
            const policyType = getRowValue(row, ["policy_type"]);
            const planName = getRowValue(row, ["plan_name"]);
            const vehicleModel = getRowValue(row, ["vehicle_model_name", "vehicle_model"]);
            const vehicleMake = getRowValue(row, ["make_name", "vehicle_make"]);
            const city = getRowValue(row, ["city"]);
            const state = getRowValue(row, ["state"]);
            const pincode = getRowValue(row, ["pin_code", "pincode"]);
            const email = getRowValue(row, ["email"]);
            const dateOfBirth = parseImportDate(getRowValue(row, ["dob"]));
            const vehicleRegistrationDate = parseImportDate(getRowValue(row, ["registration_date"]));
            const vehicleFuelType = getRowValue(row, ["fuel_type"]);
            const bookingMode = getRowValue(row, ["booking_mode"]);
            const partnerName = getRowValue(row, ["partner_name"]);
            const businessType = getRowValue(row, ["business_type"]);
            const applicationNumber = getRowValue(row, ["application_no"]);
            const fallbackPhone = `MISSING_PHONE_${policyNumber || vehicleNumber || leadId || Date.now()}`;
            const noteParts = [
              planName && `Plan: ${planName}`,
              applicationNumber && `Application: ${applicationNumber}`,
              businessType && `Business: ${businessType}`,
              bookingMode && `Mode: ${bookingMode}`,
              partnerName && `Partner: ${partnerName}`,
              !cleanPhone && "Phone missing in CSV import",
            ].filter(Boolean);
            const notes = noteParts.length ? noteParts.join(" • ").slice(0, 500) : null;
            const leadStatus = isSaleComplete ? "won" : isRejected ? "lost" : "new";
            const pipelineStage = isSaleComplete ? "policy_issued" : isRejected ? "lost" : "new_lead";
            const sourceLabel = businessType.toLowerCase() === "rollover" ? "Won (Renewal)" : "Won (New)";

            let clientId =
              (policyNumber ? clientByPolicy.get(policyNumber) : undefined) ||
              (vehicleNumber ? clientByVehicle.get(vehicleNumber) : undefined) ||
              (cleanPhone ? clientByPhone.get(cleanPhone) : undefined);

            const existingPolicy = policyNumber ? policyByNumber.get(policyNumber) : undefined;
            if (!clientId && existingPolicy?.client_id) clientId = existingPolicy.client_id;

            if (!clientId && policyNumber) {
              const { data } = await supabase
                .from("insurance_clients")
                .select("id, phone, vehicle_number, current_policy_number")
                .eq("current_policy_number", policyNumber)
                .limit(1)
                .maybeSingle();

              if (data?.id) {
                clientId = data.id;
                rememberClient(data.id, normalizeImportPolicyNumber(data.current_policy_number || ""), normalizeVehicleRegistration(data.vehicle_number || "") || null, normalizePhoneNumber(data.phone || "") || null);
              }
            }

            if (!clientId && vehicleNumber) {
              const { data } = await supabase
                .from("insurance_clients")
                .select("id, phone, vehicle_number, current_policy_number")
                .ilike("vehicle_number", vehicleNumber)
                .limit(1)
                .maybeSingle();

              if (data?.id) {
                clientId = data.id;
                rememberClient(data.id, normalizeImportPolicyNumber(data.current_policy_number || ""), normalizeVehicleRegistration(data.vehicle_number || "") || null, normalizePhoneNumber(data.phone || "") || null);
              }
            }

            if (!clientId && cleanPhone) {
              const { data } = await supabase
                .from("insurance_clients")
                .select("id, phone, vehicle_number, current_policy_number")
                .eq("phone", cleanPhone)
                .limit(1)
                .maybeSingle();

              if (data?.id) {
                clientId = data.id;
                rememberClient(data.id, normalizeImportPolicyNumber(data.current_policy_number || ""), normalizeVehicleRegistration(data.vehicle_number || "") || null, normalizePhoneNumber(data.phone || "") || null);
              }
            }

            const clientPayload = {
              customer_name: customerName,
              lead_source: "CSV Booking Report",
              lead_status: leadStatus,
              pipeline_stage: pipelineStage,
              priority: "medium",
              is_legacy: false,
              updated_at: new Date().toISOString(),
              ...(cleanPhone ? { phone: cleanPhone } : {}),
              ...(email ? { email } : {}),
              ...(city ? { city } : {}),
              ...(state ? { state } : {}),
              ...(pincode ? { pincode } : {}),
              ...(dateOfBirth ? { date_of_birth: dateOfBirth } : {}),
              ...(vehicleNumber ? { vehicle_number: vehicleNumber } : {}),
              ...(vehicleMake ? { vehicle_make: vehicleMake } : {}),
              ...(vehicleModel ? { vehicle_model: vehicleModel } : {}),
              ...(vehicleFuelType ? { vehicle_fuel_type: vehicleFuelType } : {}),
              ...(vehicleRegistrationDate ? { vehicle_registration_date: vehicleRegistrationDate } : {}),
              ...(insurer ? { current_insurer: insurer, quote_insurer: insurer } : {}),
              ...(policyNumber ? { current_policy_number: policyNumber } : {}),
              ...(policyType ? { current_policy_type: policyType } : {}),
              ...(policyStartDate && isSaleComplete ? { policy_start_date: policyStartDate, policy_expiry_date: policyExpiryDate, renewal_reminder_set: true, renewal_reminder_date: policyExpiryDate } : {}),
              ...(premium !== null ? { current_premium: premium, quote_amount: premium } : {}),
              ...(bookingDate ? { booking_date: bookingDate } : {}),
              ...(isRejected ? { lost_reason: statusText } : {}),
              ...(isSaleComplete ? { incentive_eligible: true } : {}),
              ...(notes ? { notes } : {}),
            };

            if (clientId) {
              const { error } = await supabase.from("insurance_clients").update(clientPayload).eq("id", clientId);
              if (error) {
                failed++;
                continue;
              }
              updated++;
            } else {
              const { data, error } = await supabase
                .from("insurance_clients")
                .insert({
                  ...clientPayload,
                  phone: cleanPhone || fallbackPhone,
                  duplicate_count: 0,
                  is_duplicate: false,
                })
                .select("id")
                .single();

              if (error || !data?.id) {
                failed++;
                continue;
              }

              clientId = data.id;
              inserted++;
            }

            if (!clientId) {
              failed++;
              continue;
            }

            rememberClient(clientId, policyNumber, vehicleNumber, cleanPhone || fallbackPhone);

            if (isSaleComplete && policyNumber) {
              const policyPayload = {
                client_id: clientId,
                policy_number: policyNumber,
                status: "active",
                is_renewal: businessType.toLowerCase() === "rollover",
                source_label: sourceLabel,
                ...(policyType ? { policy_type: policyType } : {}),
                ...(insurer ? { insurer } : {}),
                ...(planName ? { plan_name: planName } : {}),
                ...(premium !== null ? { premium_amount: premium } : {}),
                ...(netPremium !== null ? { net_premium: netPremium } : {}),
                ...(premium !== null && netPremium !== null ? { gst_amount: Math.max(premium - netPremium, 0) } : {}),
                ...(idv !== null ? { idv } : {}),
                ...(discount !== null ? { ncb_discount: discount } : {}),
                ...(policyStartDate ? { start_date: policyStartDate } : {}),
                ...(policyExpiryDate ? { expiry_date: policyExpiryDate } : {}),
                ...(issuedDate ? { issued_date: issuedDate } : {}),
                ...(bookingDate ? { booking_date: bookingDate } : {}),
                ...(tpPremium !== null ? { addon_premium: tpPremium } : {}),
                updated_at: new Date().toISOString(),
              };

              if (existingPolicy?.id) {
                await supabase.from("insurance_policies").update(policyPayload).eq("id", existingPolicy.id);
              } else {
                // Check for existing policy with same client + policy_number to prevent duplicates
                const { data: existingDup } = await supabase
                  .from("insurance_policies")
                  .select("id")
                  .eq("client_id", clientId)
                  .eq("policy_number", policyNumber)
                  .limit(1)
                  .maybeSingle();

                if (existingDup?.id) {
                  // Update existing instead of inserting duplicate
                  await supabase.from("insurance_policies").update(policyPayload).eq("id", existingDup.id);
                  policyByNumber.set(policyNumber, { id: existingDup.id, client_id: clientId, policy_number: policyNumber });
                } else {
                  // Also check for any active policy for same client to prevent vehicle-based duplicates
                  const { data: activeForClient } = await supabase
                    .from("insurance_policies")
                    .select("id")
                    .eq("client_id", clientId)
                    .eq("status", "active")
                    .limit(1)
                    .maybeSingle();

                  if (activeForClient?.id) {
                    // Update the existing active policy rather than creating a new one
                    await supabase.from("insurance_policies").update(policyPayload).eq("id", activeForClient.id);
                    policyByNumber.set(policyNumber, { id: activeForClient.id, client_id: clientId, policy_number: policyNumber });
                  } else {
                    const { data: newPol } = await supabase.from("insurance_policies").insert({
                      ...policyPayload,
                      renewal_count: businessType.toLowerCase() === "rollover" ? 1 : 0,
                    } as any).select("id").maybeSingle();
                    if (newPol?.id) {
                      policyByNumber.set(policyNumber, { id: newPol.id, client_id: clientId, policy_number: policyNumber });
                    }
                  }
                }
              }
            }
          }

          if (duplicatesInFile > 0 || skipped > 0) {
            toast.info(`${duplicatesInFile} duplicate rows skipped, ${skipped} rows could not be matched`);
          }
          if (failed > 0) {
            toast.error(`${failed} rows failed during sync`);
          }
          toast.success(`${inserted} new entries added, ${updated} existing entries synced`);
          queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
          queryClient.invalidateQueries({ queryKey: ["ins-policies-book"] });
        }}
      />

      {activeView === "pipeline" && <InsuranceLeadPipeline clients={clients} isLoading={isLoading} />}
      {activeView === "policy_book" && <InsurancePolicyBook policies={runningPolicies} />}
      {activeView === "renewals" && <div><InsuranceComingRenewals policies={runningPolicies as PolicyRecord[]} /></div>}
      {activeView === "overdue" && <div><InsuranceOverdueRenewals policies={overduePolicies as PolicyRecord[]} clients={dedupedClients} /></div>}
      {activeView === "bulk_tools" && <BulkRenewalQuoteGenerator onClose={() => setActiveView("pipeline")} />}
      {activeView === "renewal_campaign" && <InsuranceRenewalCampaign />}
      {activeView === "performance" && <InsurancePerformance clients={dedupedClients} policies={policyBookPolicies as PolicyRecord[]} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} monthOptions={monthOptions} />}

      <Dialog open={showCalcDialog} onOpenChange={setShowCalcDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /> Premium Calculator</DialogTitle></DialogHeader>
          <InsurancePremiumCalculator onQuoteSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["ins-workspace-clients"] });
            queryClient.invalidateQueries({ queryKey: ["ins-bulk-quotes"] });
          }} />
        </DialogContent>
      </Dialog>

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
        clients={monthFilteredClients}
        policies={monthFilteredPolicies.filter(p => (p.status || "").toLowerCase() === "active")}
        monthWiseConversion={monthWiseConversion}
        monthLabel={selectedMonthLabel}
      />
    </div>
  );
}
