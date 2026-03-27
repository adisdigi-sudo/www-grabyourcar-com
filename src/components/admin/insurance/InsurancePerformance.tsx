import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  TrendingUp, Target, Award, IndianRupee, Users, BarChart3,
  CheckCircle2, XCircle, Shield, Calendar
} from "lucide-react";
import { normalizeStage, type Client } from "./InsuranceLeadPipeline";
import type { PolicyRecord } from "./InsurancePolicyBook";

const getClientWonDate = (client: Client) => {
  // Prefer policy_start_date as it reflects actual policy month,
  // then booking_date, then journey event, then updated/created
  return (
    client.policy_start_date ||
    client.booking_date ||
    client.journey_last_event_at ||
    client.updated_at ||
    client.created_at
  );
};

const getPolicyBookingDate = (policy: PolicyRecord) => {
  return (
    policy.start_date ||
    policy.booking_date ||
    policy.insurance_clients?.booking_date ||
    policy.issued_date ||
    policy.created_at
  );
};

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
}

export function InsurancePerformance({ clients, policies }: InsurancePerformanceProps) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  // Generate last 12 months for dropdown
  const monthOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      opts.push({ value: format(d, "yyyy-MM"), label: format(d, "MMM yyyy") });
    }
    return opts;
  }, []);

  const monthStart = startOfMonth(parseISO(selectedMonth + "-01"));
  const monthEnd = endOfMonth(monthStart);

  // Filter clients and policies for selected month
  // Count leads relevant to this month - use the best available date
  const getClientRelevantDate = (c: Client) => {
    return c.policy_start_date || c.booking_date || c.journey_last_event_at || c.created_at;
  };

  const monthClients = useMemo(() => {
    return clients.filter(c => {
      const d = new Date(getClientRelevantDate(c));
      return d >= monthStart && d <= monthEnd;
    });
  }, [clients, monthStart, monthEnd]);

  const isWon = (c: Client) => {
    const stage = normalizeStage(c.pipeline_stage, c.lead_status);
    return stage === "won" || stage === "policy_issued";
  };
  const isLost = (c: Client) => normalizeStage(c.pipeline_stage, c.lead_status) === "lost";

  // Won clients this month (prefer booking date)
  const wonThisMonth = useMemo(() => {
    return clients.filter(c => {
      if (!isWon(c)) return false;
      const dateStr = getClientWonDate(c);
      const d = new Date(dateStr);
      return d >= monthStart && d <= monthEnd;
    });
  }, [clients, monthStart, monthEnd]);

  const lostThisMonth = useMemo(() => {
    return clients.filter(c => {
      if (!isLost(c)) return false;
      const d = new Date(c.updated_at);
      return d >= monthStart && d <= monthEnd;
    });
  }, [clients, monthStart, monthEnd]);

  // Policies issued this month
  const policiesThisMonth = useMemo(() => {
    return policies.filter(p => {
      const dateStr = getPolicyBookingDate(p);
      const d = new Date(dateStr);
      return d >= monthStart && d <= monthEnd;
    });
  }, [policies, monthStart, monthEnd]);

  const totalLeadsMonth = monthClients.length;
  const wonCount = wonThisMonth.length;
  const lostCount = lostThisMonth.length;
  const convRate = totalLeadsMonth > 0 ? ((wonCount / totalLeadsMonth) * 100).toFixed(1) : "0";

  const totalPremium = wonThisMonth.reduce((sum, c) => sum + (c.current_premium || 0), 0);
  const avgPremium = wonCount > 0 ? Math.round(totalPremium / wonCount) : 0;

  // Incentive calculation
  const incentiveRate = getIncentiveRate(wonCount);
  const totalIncentive = getIncentiveAmount(wonCount);
  const currentSlab = getCurrentSlab(wonCount);
  const nextSlabInfo = INCENTIVE_SLABS.find(s => wonCount < s.min);

  // Breakdown by insurer
  const insurerBreakdown = useMemo(() => {
    const map: Record<string, { count: number; premium: number }> = {};
    wonThisMonth.forEach(c => {
      const key = c.current_insurer || "Unknown";
      if (!map[key]) map[key] = { count: 0, premium: 0 };
      map[key].count++;
      map[key].premium += c.current_premium || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [wonThisMonth]);

  // Breakdown by policy type
  const typeBreakdown = useMemo(() => {
    const map: Record<string, { count: number; premium: number }> = {};
    wonThisMonth.forEach(c => {
      const key = c.current_policy_type || "Comprehensive";
      if (!map[key]) map[key] = { count: 0, premium: 0 };
      map[key].count++;
      map[key].premium += c.current_premium || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [wonThisMonth]);

  // Breakdown by executive
  const execBreakdown = useMemo(() => {
    const map: Record<string, { count: number; premium: number; incentive: number }> = {};
    wonThisMonth.forEach(c => {
      const key = c.picked_up_by || c.assigned_executive || c.booked_by || "Unassigned";
      if (!map[key]) map[key] = { count: 0, premium: 0, incentive: 0 };
      map[key].count++;
      map[key].premium += c.current_premium || 0;
    });
    // Calculate incentive per exec
    Object.values(map).forEach(v => { v.incentive = getIncentiveAmount(v.count); });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
  }, [wonThisMonth]);

  // Month-over-month trend
  const monthTrend = useMemo(() => {
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const ms = startOfMonth(d);
      const me = endOfMonth(d);
      const total = clients.filter(c => { const cd = new Date(getClientRelevantDate(c)); return cd >= ms && cd <= me; }).length;
      const won = clients.filter(c => {
        if (!isWon(c)) return false;
        const dateStr = getClientWonDate(c);
        const cd = new Date(dateStr);
        return cd >= ms && cd <= me;
      }).length;
      trend.push({ month: format(d, "MMM"), total, won, rate: total > 0 ? ((won / total) * 100).toFixed(1) : "0" });
    }
    return trend;
  }, [clients]);

  return (
    <div className="space-y-4">
      {/* Month Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Performance Dashboard
        </h3>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                {wonThisMonth.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No won policies this month</TableCell></TableRow>
                ) : wonThisMonth.map((c, i) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="text-xs font-medium">{c.customer_name}</TableCell>
                    <TableCell className="text-xs">
                      <span className="font-mono">{c.vehicle_number || "—"}</span>
                      <br />
                      <span className="text-[10px] text-muted-foreground">{[c.vehicle_make, c.vehicle_model].filter(Boolean).join(" ")}</span>
                    </TableCell>
                    <TableCell className="text-xs">{c.current_insurer || "—"}</TableCell>
                    <TableCell className="text-xs font-mono">{c.current_policy_number || "—"}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold">
                      {c.current_premium ? `₹${c.current_premium.toLocaleString("en-IN")}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.booking_date ? format(new Date(c.booking_date), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.picked_up_by || c.booked_by || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
