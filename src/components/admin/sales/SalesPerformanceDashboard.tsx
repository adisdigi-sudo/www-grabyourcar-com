import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import { IndianRupee, TrendingUp, Users, CheckCircle2, XCircle } from "lucide-react";
import { ExecutiveLeaderboard } from "../shared/ExecutiveLeaderboard";
import { format } from "date-fns";

interface SalesPerformanceDashboardProps {
  leads: any[];
  dateFilter: string;
}

const PIE_COLORS = [
  "hsl(210, 70%, 55%)", "hsl(40, 85%, 55%)", "hsl(185, 65%, 50%)",
  "hsl(265, 60%, 55%)", "hsl(230, 60%, 55%)", "hsl(150, 60%, 45%)",
  "hsl(0, 65%, 55%)", "hsl(330, 60%, 55%)",
];

const formatINR = (amt: number) => {
  if (!amt) return "₹0";
  if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)}Cr`;
  if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
  if (amt >= 1000) return `₹${(amt / 1000).toFixed(0)}K`;
  return `₹${amt.toLocaleString("en-IN")}`;
};

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  requirement_understood: "Req. Understood",
  quote_shared: "Quote Shared",
  follow_up: "Follow-Up",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export function SalesPerformanceDashboard({ leads, dateFilter }: SalesPerformanceDashboardProps) {
  const wonLeads = useMemo(() => leads.filter(l => l.pipeline_stage === "won"), [leads]);
  const lostLeads = useMemo(() => leads.filter(l => l.pipeline_stage === "lost"), [leads]);
  const activeLeads = useMemo(() => leads.filter(l => !["won", "lost"].includes(l.pipeline_stage)), [leads]);

  const totalWonValue = useMemo(() =>
    wonLeads.reduce((s, l) => s + (Number(l.deal_value) || Number(l.quoted_price) || 0), 0), [wonLeads]);
  const avgDealSize = wonLeads.length > 0 ? totalWonValue / wonLeads.length : 0;
  const conversionRate = leads.length > 0 ? ((wonLeads.length / leads.length) * 100) : 0;
  const pipelineValue = useMemo(() =>
    activeLeads.reduce((s, l) => s + (Number(l.deal_value) || Number(l.quoted_price) || 0), 0), [activeLeads]);

  // Funnel
  const funnelData = useMemo(() => {
    const stages = ["new_lead", "contacted", "requirement_understood", "quote_shared", "follow_up", "negotiation", "won"];
    return stages.map((stage, i) => ({
      stage: STAGE_LABELS[stage] || stage,
      count: leads.filter(l => l.pipeline_stage === stage).length,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [leads]);

  // Pie
  const pieData = useMemo(() =>
    Object.entries(STAGE_LABELS).map(([key, label], i) => ({
      name: label,
      value: leads.filter(l => l.pipeline_stage === key).length,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    })).filter(d => d.value > 0), [leads]);

  // Executive stats
  const executiveStats = useMemo(() => {
    const map: Record<string, { totalLeads: number; wonDeals: number; lostDeals: number; revenue: number }> = {};
    leads.forEach(l => {
      const exec = l.assigned_to || "Unassigned";
      if (!map[exec]) map[exec] = { totalLeads: 0, wonDeals: 0, lostDeals: 0, revenue: 0 };
      map[exec].totalLeads++;
      if (l.pipeline_stage === "won") {
        map[exec].wonDeals++;
        map[exec].revenue += Number(l.deal_value) || Number(l.quoted_price) || 0;
      }
      if (l.pipeline_stage === "lost") map[exec].lostDeals++;
    });
    return Object.entries(map)
      .filter(([name]) => name !== "Unassigned")
      .map(([name, s]) => ({
        name,
        ...s,
        conversionRate: s.totalLeads > 0 ? (s.wonDeals / s.totalLeads) * 100 : 0,
      }));
  }, [leads]);

  // Source performance
  const sourceStats = useMemo(() => {
    const map: Record<string, { total: number; won: number; revenue: number }> = {};
    leads.forEach(l => {
      const src = l.source || "Unknown";
      if (!map[src]) map[src] = { total: 0, won: 0, revenue: 0 };
      map[src].total++;
      if (l.pipeline_stage === "won") {
        map[src].won++;
        map[src].revenue += Number(l.deal_value) || Number(l.quoted_price) || 0;
      }
    });
    return Object.entries(map)
      .map(([source, s]) => ({ source, ...s, convRate: s.total > 0 ? ((s.won / s.total) * 100).toFixed(1) : "0" }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [leads]);

  return (
    <div className="space-y-4">
      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Won Value", value: formatINR(totalWonValue), icon: IndianRupee, color: "text-emerald-600", bg: "from-emerald-500/10" },
          { label: "Won Deals", value: wonLeads.length, icon: CheckCircle2, color: "text-emerald-600", bg: "from-emerald-500/10" },
          { label: "Lost Deals", value: lostLeads.length, icon: XCircle, color: "text-red-600", bg: "from-red-500/10" },
          { label: "Conversion", value: `${conversionRate.toFixed(1)}%`, icon: TrendingUp, color: "text-violet-600", bg: "from-violet-500/10" },
          { label: "Pipeline Value", value: formatINR(pipelineValue), icon: Users, color: "text-blue-600", bg: "from-blue-500/10" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border overflow-hidden">
            <CardContent className="p-3 relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.bg} to-transparent opacity-50`} />
              <div className="relative flex items-center gap-2">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <div>
                  <p className="text-lg font-bold leading-none">{kpi.value}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Conversion Funnel</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="stage" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Stage Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Source Performance */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Source Performance</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Source</TableHead>
                <TableHead className="text-[11px] text-center">Leads</TableHead>
                <TableHead className="text-[11px] text-center">Won</TableHead>
                <TableHead className="text-[11px] text-center">Conv %</TableHead>
                <TableHead className="text-[11px] text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourceStats.map(s => (
                <TableRow key={s.source}>
                  <TableCell className="text-xs font-medium">{s.source}</TableCell>
                  <TableCell className="text-xs text-center">{s.total}</TableCell>
                  <TableCell className="text-xs text-center">
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">{s.won}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-center">{s.convRate}%</TableCell>
                  <TableCell className="text-xs text-right font-semibold">{formatINR(s.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Executive Leaderboard */}
      <ExecutiveLeaderboard verticalName="Car Sales" executiveStats={executiveStats} />

      {/* Won Cases */}
      {wonLeads.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Won Cases</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Customer</TableHead>
                  <TableHead className="text-[11px]">Car</TableHead>
                  <TableHead className="text-[11px]">Source</TableHead>
                  <TableHead className="text-[11px] text-right">Deal Value</TableHead>
                  <TableHead className="text-[11px]">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wonLeads.slice(0, 20).map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs font-medium">{l.customer_name}</TableCell>
                    <TableCell className="text-xs">{[l.car_brand, l.car_model].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell className="text-xs">{l.source || "—"}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">{formatINR(Number(l.deal_value) || Number(l.quoted_price) || 0)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.updated_at ? format(new Date(l.updated_at), "dd MMM yy") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
