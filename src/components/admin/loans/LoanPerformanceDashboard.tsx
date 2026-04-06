import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
  ResponsiveContainer, LineChart, Line, Tooltip, Legend,
} from "recharts";
import {
  IndianRupee, TrendingUp, Users, CheckCircle2, XCircle,
  ArrowRight, Phone, Car,
} from "lucide-react";
import { STAGE_LABELS, LOAN_STAGES, type LoanStage, normalizeStage } from "./LoanStageConfig";

interface LoanPerformanceDashboardProps {
  applications: any[];
  dateFilter: string;
}

const PIE_COLORS = [
  "hsl(210, 70%, 55%)", "hsl(40, 85%, 55%)", "hsl(185, 65%, 50%)",
  "hsl(265, 60%, 55%)", "hsl(230, 60%, 55%)", "hsl(150, 60%, 45%)",
  "hsl(0, 65%, 55%)",
];

const formatINR = (amt: number) => {
  if (!amt) return "₹0";
  if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)}Cr`;
  if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
  if (amt >= 1000) return `₹${(amt / 1000).toFixed(0)}K`;
  return `₹${amt}`;
};

export function LoanPerformanceDashboard({ applications, dateFilter }: LoanPerformanceDashboardProps) {
  // ── Revenue KPIs ──
  const disbursedApps = useMemo(() => applications.filter(a => a.stage === "disbursed"), [applications]);
  const lostApps = useMemo(() => applications.filter(a => a.stage === "lost"), [applications]);
  const inPipelineApps = useMemo(() => applications.filter(a => !["disbursed", "lost"].includes(a.stage)), [applications]);

  const totalDisbursedValue = useMemo(() =>
    disbursedApps.reduce((s, a) => s + (Number(a.disbursement_amount) || Number(a.loan_amount) || 0), 0),
    [disbursedApps]
  );
  const avgLoanSize = disbursedApps.length > 0 ? totalDisbursedValue / disbursedApps.length : 0;
  const conversionRate = applications.length > 0 ? ((disbursedApps.length / applications.length) * 100) : 0;
  const pipelineValue = useMemo(() =>
    inPipelineApps.reduce((s, a) => s + (Number(a.loan_amount) || 0), 0),
    [inPipelineApps]
  );

  // ── Conversion Funnel ──
  const funnelData = useMemo(() => {
    const stages: LoanStage[] = ["new_lead", "smart_calling", "interested", "offer_shared", "loan_application", "disbursed"];
    return stages.map((stage, i) => {
      const count = applications.filter(a => a.stage === stage).length;
      const pct = applications.length > 0 ? Math.round((count / applications.length) * 100) : 0;
      return { stage: STAGE_LABELS[stage], count, pct, fill: PIE_COLORS[i] };
    });
  }, [applications]);

  // ── Stage Distribution (Pie) ──
  const pieData = useMemo(() =>
    LOAN_STAGES.map((stage, i) => ({
      name: STAGE_LABELS[stage],
      value: applications.filter(a => a.stage === stage).length,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    })).filter(d => d.value > 0),
    [applications]
  );

  // ── Revenue Trend (by day/week) ──
  const revenueTrend = useMemo(() => {
    const map: Record<string, number> = {};
    disbursedApps.forEach(a => {
      const d = a.disbursement_date || a.stage_updated_at || a.created_at;
      if (!d) return;
      const key = new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      map[key] = (map[key] || 0) + (Number(a.disbursement_amount) || Number(a.loan_amount) || 0);
    });
    return Object.entries(map).map(([date, value]) => ({ date, value })).slice(-15);
  }, [disbursedApps]);

  // ── Source Performance ──
  const sourcePerf = useMemo(() => {
    const map: Record<string, { total: number; disbursed: number; value: number }> = {};
    applications.forEach(a => {
      const src = a.source || a.lead_source_tag || "Unknown";
      if (!map[src]) map[src] = { total: 0, disbursed: 0, value: 0 };
      map[src].total++;
      if (a.stage === "disbursed") {
        map[src].disbursed++;
        map[src].value += Number(a.disbursement_amount) || Number(a.loan_amount) || 0;
      }
    });
    return Object.entries(map)
      .map(([source, d]) => ({ source, ...d, convRate: d.total > 0 ? ((d.disbursed / d.total) * 100).toFixed(1) : "0" }))
      .sort((a, b) => b.total - a.total);
  }, [applications]);

  // ── Team Performance ──
  const teamPerf = useMemo(() => {
    const map: Record<string, { total: number; disbursed: number; lost: number; value: number }> = {};
    applications.forEach(a => {
      const exec = a.assigned_to || a.assigned_executive || "Unassigned";
      if (!map[exec]) map[exec] = { total: 0, disbursed: 0, lost: 0, value: 0 };
      map[exec].total++;
      if (a.stage === "disbursed") {
        map[exec].disbursed++;
        map[exec].value += Number(a.disbursement_amount) || Number(a.loan_amount) || 0;
      }
      if (a.stage === "lost") map[exec].lost++;
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d, convRate: d.total > 0 ? ((d.disbursed / d.total) * 100).toFixed(1) : "0" }))
      .sort((a, b) => b.value - a.value);
  }, [applications]);

  // ── Won Cases ──
  const wonCases = useMemo(() =>
    disbursedApps
      .sort((a, b) => new Date(b.stage_updated_at || b.created_at).getTime() - new Date(a.stage_updated_at || a.created_at).getTime()),
    [disbursedApps]
  );

  return (
    <div className="space-y-5">
      {/* Revenue KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Disbursed", value: formatINR(totalDisbursedValue), icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Avg Loan Size", value: formatINR(avgLoanSize), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10" },
          { label: "Conversion Rate", value: `${conversionRate.toFixed(1)}%`, icon: CheckCircle2, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-500/10" },
          { label: "Pipeline Value", value: formatINR(pipelineValue), icon: Users, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-500/10" },
        ].map(k => (
          <Card key={k.label} className="border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center`}>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{k.label}</span>
              </div>
              <p className="text-xl font-bold mt-1">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              {funnelData.map((d, i) => (
                <div key={d.stage} className="flex items-center gap-2">
                  <span className="text-[11px] w-28 truncate text-muted-foreground">{d.stage}</span>
                  <div className="flex-1 h-7 bg-muted/50 rounded-md overflow-hidden relative">
                    <div
                      className="h-full rounded-md transition-all"
                      style={{ width: `${Math.max(d.pct, 3)}%`, backgroundColor: d.fill }}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-[11px] font-semibold">
                      {d.count} ({d.pct}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stage Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={2}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [`${v} leads`, name]} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend */}
      {revenueTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Disbursement Trend</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatINR(v)} />
                  <Tooltip formatter={(v: number) => [formatINR(v), "Disbursed"]} />
                  <Bar dataKey="value" fill="hsl(150, 60%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Source Performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Source Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Source</TableHead>
                <TableHead className="text-[11px] text-center">Total</TableHead>
                <TableHead className="text-[11px] text-center">Disbursed</TableHead>
                <TableHead className="text-[11px] text-center">Conv %</TableHead>
                <TableHead className="text-[11px] text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourcePerf.map(s => (
                <TableRow key={s.source}>
                  <TableCell className="text-xs font-medium">{s.source}</TableCell>
                  <TableCell className="text-xs text-center">{s.total}</TableCell>
                  <TableCell className="text-xs text-center">
                    <Badge variant="secondary" className="text-[10px]">{s.disbursed}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-center">{s.convRate}%</TableCell>
                  <TableCell className="text-xs text-right font-medium">{formatINR(s.value)}</TableCell>
                </TableRow>
              ))}
              {sourcePerf.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Team Performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Team / Executive Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Executive</TableHead>
                <TableHead className="text-[11px] text-center">Leads</TableHead>
                <TableHead className="text-[11px] text-center">Disbursed</TableHead>
                <TableHead className="text-[11px] text-center">Lost</TableHead>
                <TableHead className="text-[11px] text-center">Conv %</TableHead>
                <TableHead className="text-[11px] text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamPerf.map(t => (
                <TableRow key={t.name}>
                  <TableCell className="text-xs font-medium">{t.name}</TableCell>
                  <TableCell className="text-xs text-center">{t.total}</TableCell>
                  <TableCell className="text-xs text-center">
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">{t.disbursed}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-center">
                    <Badge variant="destructive" className="text-[10px]">{t.lost}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-center">{t.convRate}%</TableCell>
                  <TableCell className="text-xs text-right font-medium">{formatINR(t.value)}</TableCell>
                </TableRow>
              ))}
              {teamPerf.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">No data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Won Cases List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Won / Disbursed Cases ({wonCases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Customer</TableHead>
                  <TableHead className="text-[11px]">Car / Model</TableHead>
                  <TableHead className="text-[11px]">Bank</TableHead>
                  <TableHead className="text-[11px] text-right">Amount</TableHead>
                  <TableHead className="text-[11px]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wonCases.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="text-xs">
                      <div className="font-medium">{w.customer_name || "—"}</div>
                      <div className="text-muted-foreground">{w.phone || ""}</div>
                    </TableCell>
                    <TableCell className="text-xs">{w.car_model || w.car_variant || "—"}</TableCell>
                    <TableCell className="text-xs">{w.bank_name || w.selected_bank || "—"}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">
                      {formatINR(Number(w.disbursement_amount) || Number(w.loan_amount) || 0)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {w.disbursement_date || w.stage_updated_at
                        ? new Date(w.disbursement_date || w.stage_updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {wonCases.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">No disbursed cases yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
