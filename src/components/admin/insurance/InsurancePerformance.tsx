import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfYear, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmartDatePicker } from "@/components/ui/smart-date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  TrendingUp, Target, Award, IndianRupee, Users, BarChart3,
  CheckCircle2, XCircle, Shield, Calendar, CalendarIcon, Filter
} from "lucide-react";
import { normalizeStage, type Client } from "./InsuranceLeadPipeline";
import type { PolicyRecord } from "./InsurancePolicyBook";
import { getClientEffectiveDate, getPolicyEffectiveDate, dedupeInsuranceClients, dedupeInsurancePolicies } from "@/lib/insuranceIdentity";

// Incentive slab config
const INCENTIVE_SLABS = [
  { min: 1, max: 5, rate: 300, label: "1-5 policies" },
  { min: 6, max: 10, rate: 500, label: "6-10 policies" },
  { min: 11, max: 20, rate: 800, label: "11-20 policies" },
  { min: 21, max: Infinity, rate: 1200, label: "21+ policies" },
];

function getIncentiveRate(count: number): number {
  const slab = INCENTIVE_SLABS.find(s => count >= s.min && count <= s.max);
  return slab?.rate || 0;
}

function getIncentiveAmount(count: number): number {
  return count * getIncentiveRate(count);
}

function getCurrentSlab(count: number): string {
  const slab = INCENTIVE_SLABS.find(s => count >= s.min && count <= s.max);
  return slab?.label || "—";
}

interface InsurancePerformanceProps {
  clients: Client[];
  policies: PolicyRecord[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  monthOptions: { value: string; label: string }[];
}

export function InsurancePerformance({ clients, policies, selectedMonth, onMonthChange, monthOptions }: InsurancePerformanceProps) {
  const [filterMode, setFilterMode] = useState<"month" | "range" | "preset">("month");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const getWonClientDate = (client: Client) => (
    client.booking_date || client.policy_start_date || client.updated_at || client.created_at
  );

  const monthStart = useMemo(() => startOfMonth(new Date(selectedMonth + "-01")), [selectedMonth]);
  const monthEnd = useMemo(() => endOfMonth(monthStart), [monthStart]);

  // Compute effective date range based on filter mode
  const effectiveRange = useMemo(() => {
    if (filterMode === "range" && dateFrom && dateTo) {
      return { start: startOfDay(dateFrom), end: endOfDay(dateTo) };
    }
    if (filterMode === "preset" && dateFrom && dateTo) {
      return { start: startOfDay(dateFrom), end: endOfDay(dateTo) };
    }
    return { start: monthStart, end: monthEnd };
  }, [filterMode, dateFrom, dateTo, monthStart, monthEnd]);

  const dedupedClients = useMemo(() => dedupeInsuranceClients(clients), [clients]);

  const clientById = useMemo(() => new Map(dedupedClients.map((client) => [client.id, client])), [dedupedClients]);

  const dedupedPolicies = useMemo(() => dedupeInsurancePolicies(policies), [policies]);

  const monthClients = useMemo(() => {
    return dedupedClients.filter((client) => {
      const rawDate = getClientEffectiveDate(client);
      if (!rawDate) return false;
      const d = new Date(rawDate);
      return d >= effectiveRange.start && d <= effectiveRange.end;
    });
  }, [dedupedClients, effectiveRange]);

  const isWon = (client: Client) => {
    const stage = normalizeStage(client.pipeline_stage, client.lead_status, client);
    return stage === "won" || stage === "policy_issued";
  };

  const isLost = (client: Client) => normalizeStage(client.pipeline_stage, client.lead_status, client) === "lost";

  const policiesThisMonth = useMemo(() => {
    return dedupedPolicies.filter((policy) => {
      const dateStr = getPolicyEffectiveDate(policy);
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= effectiveRange.start && d <= effectiveRange.end;
    });
  }, [dedupedPolicies, effectiveRange]);

  const wonClientIdsThisMonth = useMemo(
    () => new Set(policiesThisMonth.map((policy) => policy.client_id).filter(Boolean) as string[]),
    [policiesThisMonth]
  );

  const wonRows = useMemo(() => {
    const policyRows = policiesThisMonth.map((policy) => {
      const client = policy.client_id ? clientById.get(policy.client_id) : undefined;
      const effectiveDate = getPolicyEffectiveDate(policy);

      return {
        id: policy.id,
        clientId: policy.client_id,
        source: "policy" as const,
        effectiveDate,
        customerName: client?.customer_name || policy.insurance_clients?.customer_name || "—",
        vehicleNumber: client?.vehicle_number || policy.insurance_clients?.vehicle_number || "—",
        vehicleLabel: [
          client?.vehicle_make || policy.insurance_clients?.vehicle_make,
          client?.vehicle_model || policy.insurance_clients?.vehicle_model,
        ].filter(Boolean).join(" "),
        insurer: policy.insurer || client?.current_insurer || "—",
        policyNumber: policy.policy_number || client?.current_policy_number || "—",
        premiumAmount: policy.premium_amount || 0,
        assignedTo: client?.picked_up_by || client?.booked_by || client?.assigned_executive || "—",
      };
    });

    const supplementalClientRows = dedupedClients
      .filter((client) => {
        if (wonClientIdsThisMonth.has(client.id)) return false;
        if (!isWon(client)) return false;
        const dateStr = getWonClientDate(client);
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d >= effectiveRange.start && d <= effectiveRange.end;
      })
      .map((client) => ({
        id: `client-${client.id}`,
        clientId: client.id,
        source: "client" as const,
        effectiveDate: getWonClientDate(client),
        customerName: client.customer_name || "—",
        vehicleNumber: client.vehicle_number || "—",
        vehicleLabel: [client.vehicle_make, client.vehicle_model].filter(Boolean).join(" "),
        insurer: client.current_insurer || client.quote_insurer || "—",
        policyNumber: client.current_policy_number || "Pending sync",
        premiumAmount: client.current_premium || client.quote_amount || 0,
        assignedTo: client.picked_up_by || client.booked_by || client.assigned_executive || "—",
      }));

    return [...policyRows, ...supplementalClientRows].sort((a, b) => {
      const aTime = a.effectiveDate ? new Date(a.effectiveDate).getTime() : 0;
      const bTime = b.effectiveDate ? new Date(b.effectiveDate).getTime() : 0;
      return bTime - aTime;
    });
  }, [policiesThisMonth, clientById, dedupedClients, wonClientIdsThisMonth, effectiveRange]);

  const lostThisMonth = useMemo(() => {
    return dedupedClients.filter((client) => {
      if (!isLost(client)) return false;
      const d = new Date(client.updated_at);
      return d >= effectiveRange.start && d <= effectiveRange.end;
    });
  }, [dedupedClients, effectiveRange]);

  const totalLeadsMonth = monthClients.length;
  const wonCount = wonRows.length;
  const lostCount = lostThisMonth.length;
  const convRate = totalLeadsMonth > 0 ? ((wonRows.length / totalLeadsMonth) * 100).toFixed(1) : "0";

  const totalPremium = wonRows.reduce((sum, row) => sum + (row.premiumAmount || 0), 0);

  const incentiveRate = getIncentiveRate(wonCount);
  const totalIncentive = getIncentiveAmount(wonCount);
  const nextSlabInfo = INCENTIVE_SLABS.find((slab) => wonCount < slab.min);

  const insurerBreakdown = useMemo(() => {
    const map: Record<string, { count: number; premium: number }> = {};
    policiesThisMonth.forEach((policy) => {
      const key = policy.insurer || "Unknown";
      if (!map[key]) map[key] = { count: 0, premium: 0 };
      map[key].count++;
      map[key].premium += policy.premium_amount || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [policiesThisMonth]);

  const typeBreakdown = useMemo(() => {
    const map: Record<string, { count: number; premium: number }> = {};
    policiesThisMonth.forEach((policy) => {
      const key = policy.policy_type || "Comprehensive";
      if (!map[key]) map[key] = { count: 0, premium: 0 };
      map[key].count++;
      map[key].premium += policy.premium_amount || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [policiesThisMonth]);

  const execBreakdown = useMemo(() => {
    const map: Record<string, { count: number; premium: number; incentive: number }> = {};
    policiesThisMonth.forEach((policy) => {
      const client = policy.client_id ? clientById.get(policy.client_id) : undefined;
      const key = client?.picked_up_by || client?.assigned_executive || client?.booked_by || "Unassigned";
      if (!map[key]) map[key] = { count: 0, premium: 0, incentive: 0 };
      map[key].count++;
      map[key].premium += policy.premium_amount || 0;
    });
    Object.values(map).forEach((value) => {
      value.incentive = getIncentiveAmount(value.count);
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [policiesThisMonth, clientById]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof wonRows> = {};
    wonRows.forEach((row) => {
      const dateStr = row.effectiveDate;
      const dayKey = dateStr ? format(new Date(dateStr), "yyyy-MM-dd") : "unknown";
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(row);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [wonRows]);

  const monthTrend = useMemo(() => {
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const ms = startOfMonth(d);
      const me = endOfMonth(d);
       const total = dedupedClients.filter((client) => {
        const rawDate = getClientEffectiveDate(client);
        if (!rawDate) return false;
        const cd = new Date(rawDate);
        return cd >= ms && cd <= me;
      }).length;
      const monthPolicies = dedupedPolicies.filter((policy) => {
        const rawDate = getPolicyEffectiveDate(policy);
        if (!rawDate) return false;
        const pd = new Date(rawDate);
        return pd >= ms && pd <= me;
      });
      const monthWonClients = new Set(monthPolicies.map((policy) => policy.client_id).filter(Boolean));
      trend.push({
        month: format(d, "MMM"),
        total,
        won: monthPolicies.length,
        rate: total > 0 ? ((monthWonClients.size / total) * 100).toFixed(1) : "0",
      });
    }
    return trend;
  }, [dedupedClients, dedupedPolicies]);

  const activeRangeLabel = useMemo(() => {
    if (filterMode === "preset" && activePreset) return activePreset;
    if (filterMode === "range" && dateFrom && dateTo) return `${format(dateFrom, "dd MMM")} - ${format(dateTo, "dd MMM yyyy")}`;
    return monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
  }, [filterMode, activePreset, dateFrom, dateTo, selectedMonth, monthOptions]);

  const handlePreset = (label: string, from: Date, to: Date) => {
    setFilterMode("preset");
    setActivePreset(label);
    setDateFrom(startOfDay(from));
    setDateTo(endOfDay(to));
  };

  const handleMonthSelect = (month: string) => {
    setFilterMode("month");
    setActivePreset(null);
    setDateFrom(undefined);
    setDateTo(undefined);
    onMonthChange(month);
  };

  return (
    <div className="space-y-4">
      {/* Universal Date Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Performance Dashboard
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Presets */}
          <div className="flex gap-1 flex-wrap">
            {[
              { label: "Today", fn: () => { const t = new Date(); t.setHours(0,0,0,0); const e = new Date(); e.setHours(23,59,59,999); handlePreset("Today", t, e); } },
              { label: "This Week", fn: () => handlePreset("This Week", startOfWeek(new Date(), { weekStartsOn: 1 }), endOfWeek(new Date(), { weekStartsOn: 1 })) },
              { label: "7 Days", fn: () => handlePreset("7 Days", subDays(new Date(), 7), new Date()) },
              { label: "30 Days", fn: () => handlePreset("30 Days", subDays(new Date(), 30), new Date()) },
              { label: "90 Days", fn: () => handlePreset("90 Days", subDays(new Date(), 90), new Date()) },
              { label: "This Year", fn: () => handlePreset("This Year", startOfYear(new Date()), new Date()) },
              { label: "All Time", fn: () => {
                const earliest = monthOptions.length > 0 ? new Date(monthOptions[monthOptions.length - 1].value + "-01") : subMonths(new Date(), 12);
                handlePreset("All Time", earliest, new Date());
              }},
            ].map(p => (
              <Button
                key={p.label}
                variant={activePreset === p.label ? "default" : "outline"}
                size="sm"
                className="h-7 text-[10px] px-2"
                onClick={p.fn}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Month Selector */}
          <Select value={filterMode === "month" ? selectedMonth : "__custom"} onValueChange={(v) => { if (v !== "__custom") handleMonthSelect(v); }}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                {filterMode === "range" && dateFrom && dateTo ? `${format(dateFrom, "dd MMM")} - ${format(dateTo, "dd MMM")}` : "Custom"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 space-y-2" align="end">
              <p className="text-xs font-medium">Custom Date Range</p>
              <div className="flex gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">From</p>
                  <SmartDatePicker date={dateFrom} onSelect={(d) => { setDateFrom(d); if (d && dateTo) { setFilterMode("range"); setActivePreset(null); } }} placeholder="Start" yearRange={[new Date().getFullYear() - 3, new Date().getFullYear()]} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">To</p>
                  <SmartDatePicker date={dateTo} onSelect={(d) => { setDateTo(d); if (dateFrom && d) { setFilterMode("range"); setActivePreset(null); } }} placeholder="End" yearRange={[new Date().getFullYear() - 3, new Date().getFullYear()]} />
                </div>
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setFilterMode("month"); setActivePreset(null); }}>Clear</Button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active Filter Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs gap-1">
          <Filter className="h-3 w-3" /> Showing: {activeRangeLabel}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Leads", value: totalLeadsMonth, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Won", value: wonCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Lost", value: lostCount, icon: XCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Conversion", value: `${convRate}%`, icon: Target, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
          { label: "Premium", value: `₹${totalPremium.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Incentive", value: `₹${totalIncentive.toLocaleString("en-IN")}`, icon: Award, color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30" },
        ].map(kpi => (
          <Card key={kpi.label} className={cn(kpi.bg, "border-0 shadow-sm")}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <kpi.icon className={cn("h-3.5 w-3.5", kpi.color)} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Incentive Slab Detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="h-4 w-4 text-pink-600" /> Incentive Calculator — Slab Based
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {INCENTIVE_SLABS.map(slab => {
              const isActive = wonCount >= slab.min && wonCount <= slab.max;
              return (
                <div key={slab.label} className={cn(
                  "rounded-lg border px-4 py-3 min-w-[140px] text-center transition-all",
                  isActive ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border bg-muted/30"
                )}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{slab.label}</p>
                  <p className={cn("text-lg font-bold", isActive ? "text-primary" : "text-foreground")}>₹{slab.rate}</p>
                  <p className="text-[10px] text-muted-foreground">per policy</p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span>Current: <strong>{wonCount} policies</strong> × ₹{incentiveRate} = <strong className="text-primary">₹{totalIncentive.toLocaleString("en-IN")}</strong></span>
            {nextSlabInfo && (
              <Badge variant="outline" className="text-[10px]">
                {nextSlabInfo.min - wonCount} more for ₹{nextSlabInfo.rate}/policy
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 6-Month Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-violet-600" /> 6-Month Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {monthTrend.map(m => {
              const barHeight = Math.max(8, Math.min(80, m.total * 4));
              const wonHeight = m.total > 0 ? Math.max(4, (m.won / m.total) * barHeight) : 0;
              return (
                <div key={m.month} className="text-center">
                  <div className="h-20 flex items-end justify-center gap-0.5 mb-1">
                    <div className="w-4 rounded-t bg-muted" style={{ height: `${barHeight}px` }} />
                    <div className="w-4 rounded-t bg-emerald-500" style={{ height: `${wonHeight}px` }} />
                  </div>
                  <p className="text-[10px] font-medium">{m.month}</p>
                  <p className="text-[9px] text-muted-foreground">{m.won}/{m.total}</p>
                  <p className="text-[9px] font-semibold text-emerald-600">{m.rate}%</p>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-muted" /> Total Leads</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Won</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Employee Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" /> Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[10px] font-bold uppercase">Executive</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-center">Policies</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-right">Premium</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-right">Incentive</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {execBreakdown.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No policies this month</TableCell></TableRow>
                ) : execBreakdown.map(([exec, data]) => (
                  <TableRow key={exec}>
                    <TableCell className="text-xs font-medium">{exec}</TableCell>
                    <TableCell className="text-xs text-center">
                      <Badge variant="secondary" className="text-[10px]">{data.count}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">₹{data.premium.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-primary font-semibold">₹{data.incentive.toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Insurer Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-600" /> Insurer Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[10px] font-bold uppercase">Insurer</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-center">Policies</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-right">Premium</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insurerBreakdown.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>
                ) : insurerBreakdown.map(([insurer, data]) => (
                  <TableRow key={insurer}>
                    <TableCell className="text-xs font-medium">{insurer}</TableCell>
                    <TableCell className="text-xs text-center">
                      <Badge variant="secondary" className="text-[10px]">{data.count}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">₹{data.premium.toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Policy Type Breakdown */}
      {typeBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Policy Type Split</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {typeBreakdown.map(([type, data]) => (
                <div key={type} className="rounded-lg border bg-muted/30 px-4 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{type}</p>
                  <p className="text-lg font-bold">{data.count}</p>
                  <p className="text-[10px] text-muted-foreground">₹{data.premium.toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Won Policies Table — Day-wise grouped */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Won Policies — {activeRangeLabel}
            <Badge variant="secondary" className="ml-auto text-[10px]">{wonRows.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[10px] font-bold uppercase w-8">#</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Customer</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Vehicle</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Insurer</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Policy No</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-right">Premium</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Booking Date</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wonRows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No won policies in this period</TableCell></TableRow>
                ) : (() => {
                  let runningIndex = 0;
                  return groupedByDate.flatMap(([dayKey, dayPolicies]) => {
                    const dayLabel = dayKey !== "unknown" ? format(new Date(dayKey), "EEEE, dd MMM yyyy") : "Unknown Date";
                    const dayPremium = dayPolicies.reduce((s, p) => s + (p.premiumAmount || 0), 0);
                    const rows = dayPolicies.map((row) => {
                      runningIndex++;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs text-muted-foreground">{runningIndex}</TableCell>
                          <TableCell className="text-xs font-medium">{row.customerName}</TableCell>
                          <TableCell className="text-xs">
                            <span className="font-mono">{row.vehicleNumber}</span>
                            <br />
                            <span className="text-[10px] text-muted-foreground">{row.vehicleLabel || "—"}</span>
                          </TableCell>
                          <TableCell className="text-xs">{row.insurer}</TableCell>
                          <TableCell className="text-xs font-mono">{row.policyNumber}</TableCell>
                          <TableCell className="text-xs text-right font-mono font-semibold">
                            {row.premiumAmount ? `₹${row.premiumAmount.toLocaleString("en-IN")}` : "—"}
                          </TableCell>
                          <TableCell className="text-xs">{row.effectiveDate ? format(new Date(row.effectiveDate), "dd MMM yyyy") : "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.assignedTo}</TableCell>
                        </TableRow>
                      );
                    });
                    return [
                      <TableRow key={`day-${dayKey}`} className="bg-muted/50 border-t-2">
                        <TableCell colSpan={5} className="py-1.5">
                          <span className="text-xs font-semibold text-foreground">{dayLabel}</span>
                          <Badge variant="outline" className="ml-2 text-[10px]">{dayPolicies.length} {dayPolicies.length === 1 ? "policy" : "policies"}</Badge>
                        </TableCell>
                        <TableCell colSpan={3} className="py-1.5 text-right">
                          <span className="text-xs font-semibold text-emerald-600">₹{dayPremium.toLocaleString("en-IN")}</span>
                        </TableCell>
                      </TableRow>,
                      ...rows,
                    ];
                  });
                })()}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
