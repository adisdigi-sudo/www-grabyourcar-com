import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Trophy, Users, Target, Phone, TrendingUp, RefreshCw,
  Medal, Crown, Star, IndianRupee, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar,
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

type Period = "today" | "7d" | "30d" | "this_month" | "all";

const PERIOD_MAP: Record<Period, string> = {
  today: "Today", "7d": "Last 7 Days", "30d": "Last 30 Days",
  this_month: "This Month", all: "All Time",
};

const fmt = (n: number) => {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

const PODIUM_COLORS = ["hsl(38 92% 50%)", "hsl(0 0% 70%)", "hsl(25 50% 45%)"];
const PODIUM_ICONS = [Crown, Medal, Star];

function getDateRange(period: Period) {
  const now = new Date();
  if (period === "all") return { from: "2020-01-01", to: format(now, "yyyy-MM-dd'T'23:59:59") };
  if (period === "today") return { from: format(now, "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd'T'23:59:59") };
  if (period === "this_month") return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: format(endOfMonth(now), "yyyy-MM-dd'T'23:59:59") };
  const days = period === "7d" ? 7 : 30;
  return { from: format(subDays(now, days), "yyyy-MM-dd"), to: format(now, "yyyy-MM-dd'T'23:59:59") };
}

interface EmployeeMetrics {
  name: string;
  leadsHandled: number;
  callsMade: number;
  dealsWon: number;
  revenue: number;
  conversionRate: number;
  targetAchievement: number;
}

export const EmployeePerformanceDashboard = () => {
  const [period, setPeriod] = useState<Period>("this_month");
  const { from, to } = getDateRange(period);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["employeePerformance", period],
    queryFn: async () => {
      const teamMembers = await supabase.from("team_members").select("id, user_id, name, phone, role, vertical_name, is_active").eq("is_active", true);
      const callLogs = await supabase.from("call_logs").select("agent_id, disposition, duration_seconds, lead_type, created_at").gte("created_at", from).lte("created_at", to);
      const insuranceClients = await supabase.from("insurance_clients").select("assigned_executive, lead_status, current_premium, pipeline_stage, created_at, updated_at").gte("created_at", from).lte("created_at", to);
      const salesPipeline = await supabase.from("sales_pipeline").select("assigned_executive, pipeline_stage, deal_value, created_at, updated_at").gte("created_at", from).lte("created_at", to);
      const loanApps = await supabase.from("loan_applications").select("assigned_executive, stage, loan_amount, created_at").gte("created_at", from).lte("created_at", to);
      const [targets, leads] = await Promise.all([
        supabase.from("team_targets").select("team_member_name, target_count, target_revenue, month_year").eq("month_year", format(new Date(), "yyyy-MM")),
        supabase.from("leads").select("assigned_to, status, created_at").gte("created_at", from).lte("created_at", to),
      ]);

      const members = teamMembers.data || [];
      const calls = callLogs.data || [];
      const insurance = insuranceClients.data || [];
      const sales = salesPipeline.data || [];
      const loans = loanApps.data || [];
      const targetList = targets.data || [];
      const leadList = leads.data || [];

      // Build per-member metrics
      const metricsMap: Record<string, EmployeeMetrics> = {};

      members.forEach((m: any) => {
        metricsMap[m.user_id || m.name] = {
          name: m.name,
          leadsHandled: 0,
          callsMade: 0,
          dealsWon: 0,
          revenue: 0,
          conversionRate: 0,
          targetAchievement: 0,
        };
      });

      // Count calls per agent
      calls.forEach((c: any) => {
        if (metricsMap[c.agent_id]) {
          metricsMap[c.agent_id].callsMade++;
        }
      });

      // Count leads assigned
      leadList.forEach((l: any) => {
        if (l.assigned_to && metricsMap[l.assigned_to]) {
          metricsMap[l.assigned_to].leadsHandled++;
        }
      });

      // Insurance wins
      insurance.forEach((ic: any) => {
        const exec = ic.assigned_executive;
        const entry = Object.values(metricsMap).find(m => m.name === exec);
        if (entry) {
          entry.leadsHandled++;
          if (ic.lead_status === "won" || ic.pipeline_stage === "policy_issued") {
            entry.dealsWon++;
            entry.revenue += Number(ic.current_premium) || 0;
          }
        }
      });

      // Sales wins
      sales.forEach((s: any) => {
        const exec = s.assigned_executive;
        const entry = Object.values(metricsMap).find(m => m.name === exec);
        if (entry) {
          entry.leadsHandled++;
          if (s.pipeline_stage === "delivered" || s.pipeline_stage === "booked") {
            entry.dealsWon++;
            entry.revenue += Number(s.deal_value) || 0;
          }
        }
      });

      // Loan disbursements
      loans.forEach((l: any) => {
        const exec = l.assigned_executive;
        const entry = Object.values(metricsMap).find(m => m.name === exec);
        if (entry) {
          entry.leadsHandled++;
          if (l.stage === "disbursed") {
            entry.dealsWon++;
            entry.revenue += Number(l.loan_amount) || 0;
          }
        }
      });

      // Calculate conversion rates and target achievement
      const employeeList = Object.values(metricsMap)
        .map(m => {
          m.conversionRate = m.leadsHandled > 0 ? (m.dealsWon / m.leadsHandled) * 100 : 0;
          const target = targetList.find((t: any) => t.team_member_name === m.name);
          if (target) {
            const targetRevenue = Number((target as any).target_revenue) || Number((target as any).target_count) * 10000 || 100000;
            m.targetAchievement = targetRevenue > 0 ? (m.revenue / targetRevenue) * 100 : 0;
          }
          return m;
        })
        .filter(m => m.leadsHandled > 0 || m.callsMade > 0 || m.dealsWon > 0)
        .sort((a, b) => b.revenue - a.revenue);

      // Top 3 for podium
      const topPerformers = employeeList.slice(0, 3);

      // Team totals
      const totalLeads = employeeList.reduce((s, m) => s + m.leadsHandled, 0);
      const totalCalls = employeeList.reduce((s, m) => s + m.callsMade, 0);
      const totalDeals = employeeList.reduce((s, m) => s + m.dealsWon, 0);
      const totalRevenue = employeeList.reduce((s, m) => s + m.revenue, 0);
      const avgConversion = totalLeads > 0 ? (totalDeals / totalLeads) * 100 : 0;

      return {
        employees: employeeList,
        topPerformers,
        totalLeads, totalCalls, totalDeals, totalRevenue, avgConversion,
        teamCount: members.length,
      };
    },
  });

  const d = data || {
    employees: [], topPerformers: [], totalLeads: 0, totalCalls: 0,
    totalDeals: 0, totalRevenue: 0, avgConversion: 0, teamCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Employee Performance
          </h2>
          <p className="text-sm text-muted-foreground">Track team performance across all verticals</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PERIOD_MAP).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Team KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard icon={Users} label="Team Size" value={d.teamCount.toString()} color="text-blue-500" />
        <KPICard icon={Target} label="Leads Handled" value={d.totalLeads.toLocaleString()} color="text-purple-500" />
        <KPICard icon={Phone} label="Calls Made" value={d.totalCalls.toLocaleString()} color="text-green-500" />
        <KPICard icon={TrendingUp} label="Deals Won" value={d.totalDeals.toLocaleString()} color="text-orange-500" />
        <KPICard icon={IndianRupee} label="Revenue" value={fmt(d.totalRevenue)} color="text-emerald-500" />
        <KPICard icon={BarChart3} label="Conversion" value={`${d.avgConversion.toFixed(1)}%`} color="text-teal-500" />
      </div>

      {/* Top 3 Podium */}
      {d.topPerformers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-center gap-4 py-4">
              {[1, 0, 2].map((idx) => {
                const p = d.topPerformers[idx];
                if (!p) return null;
                const Icon = PODIUM_ICONS[idx];
                const height = idx === 0 ? "h-28" : idx === 1 ? "h-20" : "h-16";
                return (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Icon className="h-5 w-5" style={{ color: PODIUM_COLORS[idx] }} />
                      <span className="text-sm font-semibold">{p.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{fmt(p.revenue)}</span>
                    <span className="text-xs">{p.dealsWon} deals</span>
                    <div
                      className={`w-20 ${height} rounded-t-lg flex items-end justify-center pb-2`}
                      style={{ backgroundColor: PODIUM_COLORS[idx] + "33" }}
                    >
                      <span className="text-lg font-bold" style={{ color: PODIUM_COLORS[idx] }}>
                        #{idx + 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="leaderboard">
        <TabsList>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="chart">Performance Chart</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4">#</th>
                      <th className="text-left py-3 px-4">Employee</th>
                      <th className="text-right py-3 px-4">Leads</th>
                      <th className="text-right py-3 px-4">Calls</th>
                      <th className="text-right py-3 px-4">Won</th>
                      <th className="text-right py-3 px-4">Revenue</th>
                      <th className="text-right py-3 px-4">Conv %</th>
                      <th className="text-center py-3 px-4">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.employees.map((emp, i) => (
                      <tr key={emp.name} className="border-b hover:bg-muted/30">
                        <td className="py-3 px-4">
                          {i < 3 ? (
                            <span style={{ color: PODIUM_COLORS[i] }} className="font-bold">{i + 1}</span>
                          ) : (
                            <span className="text-muted-foreground">{i + 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium">{emp.name}</td>
                        <td className="py-3 px-4 text-right">{emp.leadsHandled}</td>
                        <td className="py-3 px-4 text-right">{emp.callsMade}</td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600">{emp.dealsWon}</td>
                        <td className="py-3 px-4 text-right font-semibold">{fmt(emp.revenue)}</td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant={emp.conversionRate > 20 ? "default" : emp.conversionRate > 10 ? "secondary" : "outline"} className="text-xs">
                            {emp.conversionRate.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(emp.targetAchievement, 100)} className="h-2 flex-1" />
                            <span className="text-xs w-10 text-right">{emp.targetAchievement.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {d.employees.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-muted-foreground">No performance data for this period</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Revenue by Employee</CardTitle>
            </CardHeader>
            <CardContent>
              {d.employees.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={d.employees.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dealsWon" fill="hsl(142 71% 45%)" name="Deals Won" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
