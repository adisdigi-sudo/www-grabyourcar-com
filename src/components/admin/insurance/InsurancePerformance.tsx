import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfYear, parse } from "date-fns";
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
import { getClientEffectiveDate, getPolicyEffectiveDate, dedupeInsurancePolicies } from "@/lib/insuranceIdentity";

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

  const monthStart = useMemo(() => startOfMonth(new Date(selectedMonth + "-01")), [selectedMonth]);
  const monthEnd = useMemo(() => endOfMonth(monthStart), [monthStart]);

  // Compute effective date range based on filter mode
  const effectiveRange = useMemo(() => {
    if (filterMode === "range" && dateFrom && dateTo) {
      return { start: dateFrom, end: dateTo };
    }
    if (filterMode === "preset" && dateFrom && dateTo) {
      return { start: dateFrom, end: dateTo };
    }
    return { start: monthStart, end: monthEnd };
  }, [filterMode, dateFrom, dateTo, monthStart, monthEnd]);

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);

  const dedupedPolicies = useMemo(() => dedupeInsurancePolicies(policies), [policies]);

  const monthClients = useMemo(() => {
    return clients.filter((client) => {
      const rawDate = getClientEffectiveDate(client);
      if (!rawDate) return false;
      const d = new Date(rawDate);
      return d >= effectiveRange.start && d <= effectiveRange.end;
    });
  }, [clients, effectiveRange]);

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

  const wonThisMonth = useMemo(() => {
    const matchedClients = clients.filter((client) => wonClientIdsThisMonth.has(client.id));
    const wonByDate = clients.filter((client) => {
      if (wonClientIdsThisMonth.has(client.id)) return false;
      if (!isWon(client)) return false;
      const dateStr = getClientEffectiveDate(client);
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= effectiveRange.start && d <= effectiveRange.end;
    });
    return [...matchedClients, ...wonByDate];
  }, [clients, wonClientIdsThisMonth, effectiveRange]);

  const lostThisMonth = useMemo(() => {
    return clients.filter((client) => {
      if (!isLost(client)) return false;
      const d = new Date(client.updated_at);
      return d >= monthStart && d <= monthEnd;
    });
  }, [clients, monthStart, monthEnd]);

  const totalLeadsMonth = monthClients.length;
  const wonCount = policiesThisMonth.length;
  const lostCount = lostThisMonth.length;
  const convRate = totalLeadsMonth > 0 ? ((wonThisMonth.length / totalLeadsMonth) * 100).toFixed(1) : "0";

  const totalPremium = policiesThisMonth.reduce((sum, policy) => sum + (policy.premium_amount || 0), 0);

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

  const monthTrend = useMemo(() => {
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const ms = startOfMonth(d);
      const me = endOfMonth(d);
      const total = clients.filter((client) => {
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
  }, [clients, dedupedPolicies]);

  return (
    <div className="space-y-4">
      {/* Month Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Performance Dashboard
        </h3>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="h-9 w-[160px] rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
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

      {/* Won Policies Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Won Policies — {monthOptions.find(m => m.value === selectedMonth)?.label}
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
                {policiesThisMonth.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No won policies this month</TableCell></TableRow>
                ) : policiesThisMonth.map((policy, i) => {
                  const client = policy.client_id ? clientById.get(policy.client_id) : undefined;
                      const bookingDate = getPolicyEffectiveDate(policy);
                  return (
                    <TableRow key={policy.id}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-xs font-medium">{client?.customer_name || policy.insurance_clients?.customer_name || "—"}</TableCell>
                      <TableCell className="text-xs">
                        <span className="font-mono">{client?.vehicle_number || policy.insurance_clients?.vehicle_number || "—"}</span>
                        <br />
                        <span className="text-[10px] text-muted-foreground">{[client?.vehicle_make || policy.insurance_clients?.vehicle_make, client?.vehicle_model || policy.insurance_clients?.vehicle_model].filter(Boolean).join(" ")}</span>
                      </TableCell>
                      <TableCell className="text-xs">{policy.insurer || client?.current_insurer || "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{policy.policy_number || client?.current_policy_number || "—"}</TableCell>
                      <TableCell className="text-xs text-right font-mono font-semibold">
                        {policy.premium_amount ? `₹${policy.premium_amount.toLocaleString("en-IN")}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs">{bookingDate ? format(new Date(bookingDate), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{client?.picked_up_by || client?.booked_by || client?.assigned_executive || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
