import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, TrendingUp, Users, Phone, Target, Clock,
  Trophy, Flame, ArrowUpRight, ArrowDownRight, CalendarDays,
  CheckCircle2, XCircle, Zap, Star, Activity, PieChart,
  PhoneCall, Timer, Award, Shield
} from "lucide-react";
import { format, subDays, differenceInDays, startOfDay, endOfDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Area, AreaChart, Legend } from "recharts";
import { useVerticalAccess } from "@/hooks/useVerticalAccess";
import { motion } from "framer-motion";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
];

export function ManagerDashboard() {
  const { activeVertical } = useVerticalAccess();
  const [period, setPeriod] = useState("30");

  const fromDate = useMemo(() => format(subDays(new Date(), parseInt(period)), "yyyy-MM-dd"), [period]);
  const toDate = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  // ── Fetch call logs ──
  const { data: callLogs = [] } = useQuery({
    queryKey: ["mgr-calls", fromDate, toDate, activeVertical?.id],
    queryFn: async () => {
      let q = supabase.from("call_logs").select("*")
        .gte("created_at", fromDate).lte("created_at", toDate + "T23:59:59");
      if (activeVertical?.id) q = q.eq("vertical_id", activeVertical.id);
      const { data } = await q.order("created_at", { ascending: false }).limit(1000);
      return data || [];
    },
  });

  // ── Fetch leads ──
  const { data: leads = [] } = useQuery({
    queryKey: ["mgr-leads", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("id, status, source, created_at, assigned_to")
        .gte("created_at", fromDate).lte("created_at", toDate + "T23:59:59")
        .limit(1000);
      return data || [];
    },
  });

  // ── Fetch team members ──
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["mgr-team"],
    queryFn: async () => {
      const { data } = await supabase.from("team_members").select("*").eq("is_active", true);
      return data || [];
    },
  });

  // ── Fetch insurance clients ──
  const { data: insClients = [] } = useQuery({
    queryKey: ["mgr-ins-clients", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("insurance_clients")
        .select("id, lead_status, created_at, current_premium")
        .gte("created_at", fromDate).lte("created_at", toDate + "T23:59:59")
        .limit(1000);
      return data || [];
    },
  });

  // ── Fetch loan applications ──
  const { data: loanApps = [] } = useQuery({
    queryKey: ["mgr-loan-apps", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("loan_applications")
        .select("id, stage, created_at, loan_amount, assigned_to")
        .gte("created_at", fromDate).lte("created_at", toDate + "T23:59:59")
        .limit(1000);
      return data || [];
    },
  });

  // ═══ COMPUTED STATS ═══

  // Calls
  const totalCalls = callLogs.length;
  const answeredCalls = callLogs.filter((c: any) => c.disposition === "answered" || c.disposition === "interested" || c.disposition === "converted" || c.disposition === "callback_scheduled").length;
  const avgCallDuration = totalCalls > 0 
    ? Math.round(callLogs.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / totalCalls) 
    : 0;
  const callsByAgent = useMemo(() => {
    const map = new Map<string, { total: number; answered: number; duration: number; conversions: number }>();
    callLogs.forEach((c: any) => {
      const agent = c.agent_id || "Unknown";
      const existing = map.get(agent) || { total: 0, answered: 0, duration: 0, conversions: 0 };
      existing.total++;
      if (c.disposition === "answered" || c.disposition === "interested" || c.disposition === "converted" || c.disposition === "callback_scheduled") existing.answered++;
      if (c.disposition === "converted") existing.conversions++;
      existing.duration += c.duration_seconds || 0;
      map.set(agent, existing);
    });
    return Array.from(map.entries()).map(([agentId, stats]) => {
      const member = teamMembers.find((m: any) => m.user_id === agentId);
      return { agentId, name: member?.display_name || agentId.slice(0, 8), ...stats, avgDuration: stats.total > 0 ? Math.round(stats.duration / stats.total) : 0 };
    }).sort((a, b) => b.total - a.total);
  }, [callLogs, teamMembers]);

  // Pipeline
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l: any) => l.status === "converted" || l.status === "won").length;
  const lostLeads = leads.filter((l: any) => l.status === "lost" || l.status === "closed").length;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0";

  // Insurance
  const insConverted = insClients.filter((c: any) => c.lead_status === "converted" || c.lead_status === "won").length;
  const insPremiumTotal = insClients.reduce((s: number, c: any) => s + (c.current_premium || 0), 0);

  // Loans
  const loanConverted = loanApps.filter((l: any) => l.stage === "converted" || l.stage === "disbursed").length;
  const loanAmountTotal = loanApps.reduce((s: number, l: any) => s + (l.loan_amount || 0), 0);

  // Daily call trend
  const dailyCallTrend = useMemo(() => {
    const map = new Map<string, number>();
    const days = parseInt(period);
    for (let i = 0; i < Math.min(days, 30); i++) {
      const d = format(subDays(new Date(), i), "dd MMM");
      map.set(d, 0);
    }
    callLogs.forEach((c: any) => {
      const d = format(new Date(c.created_at), "dd MMM");
      map.set(d, (map.get(d) || 0) + 1);
    });
    return Array.from(map.entries()).reverse().map(([date, calls]) => ({ date, calls }));
  }, [callLogs, period]);

  // Lead source breakdown
  const leadSourceData = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach((l: any) => {
      const src = l.source || "Direct";
      map.set(src, (map.get(src) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [leads]);

  // Call disposition breakdown
  const dispositionData = useMemo(() => {
    const map = new Map<string, number>();
    callLogs.forEach((c: any) => {
      const d = c.disposition || "no_answer";
      map.set(d, (map.get(d) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name: name.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()), value })).sort((a, b) => b.value - a.value);
  }, [callLogs]);

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = "primary" }: any) => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}/10`}>
              <Icon className={`h-5 w-5 text-${color}`} />
            </div>
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-3 pt-3 border-t">
              {trend >= 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className={`text-xs font-medium ${trend >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {Math.abs(trend)}%
              </span>
              <span className="text-xs text-muted-foreground">vs previous period</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Manager Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeVertical ? `${activeVertical.name} — ` : ""}Performance overview & team analytics
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]">
            <CalendarDays className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Calls" value={totalCalls} subtitle={`${answeredCalls} answered`} icon={PhoneCall} color="primary" />
        <StatCard title="New Leads" value={totalLeads} subtitle={`${conversionRate}% conversion`} icon={Users} color="primary" />
        <StatCard title="Conversions" value={convertedLeads + insConverted + loanConverted} subtitle="Across all verticals" icon={Trophy} color="primary" />
        <StatCard title="Avg Call Time" value={`${Math.floor(avgCallDuration / 60)}m ${avgCallDuration % 60}s`} subtitle={`${totalCalls} total calls`} icon={Timer} color="primary" />
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Insurance Revenue</span>
            </div>
            <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">₹{(insPremiumTotal / 100000).toFixed(1)}L</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{insConverted} policies converted</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-800/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Loan Pipeline</span>
            </div>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">₹{(loanAmountTotal / 100000).toFixed(1)}L</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{loanConverted} loans disbursed</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50 dark:border-amber-800/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Conversion Rate</span>
            </div>
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">{conversionRate}%</p>
            <Progress value={parseFloat(conversionRate)} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="calls" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="calls" className="gap-1.5"><PhoneCall className="h-3.5 w-3.5" /> Calls</TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Pipeline</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Team</TabsTrigger>
        </TabsList>

        {/* Calls Tab */}
        <TabsContent value="calls" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Daily Call Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Daily Call Volume</CardTitle>
                <CardDescription>Calls made per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyCallTrend}>
                      <defs>
                        <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      <Area type="monotone" dataKey="calls" stroke="hsl(var(--primary))" fill="url(#callGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Call Disposition Pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Call Dispositions</CardTitle>
                <CardDescription>Outcome breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  {dispositionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie data={dispositionData} cx="50%" cy="50%" outerRadius={90} innerRadius={55} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {dispositionData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No call data yet</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Lead Source Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Lead Sources</CardTitle>
                <CardDescription>Where leads are coming from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  {leadSourceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leadSourceData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} className="text-muted-foreground" />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No lead data</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Funnel */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pipeline Summary</CardTitle>
                <CardDescription>Lead progression overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Total Leads", value: totalLeads, icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
                  { label: "In Pipeline", value: totalLeads - convertedLeads - lostLeads, icon: Activity, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
                  { label: "Converted", value: convertedLeads, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
                  { label: "Lost", value: lostLeads, icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg}`}>
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{item.label}</span>
                        <span className="text-sm font-bold text-foreground">{item.value}</span>
                      </div>
                      <Progress value={totalLeads > 0 ? (item.value / totalLeads) * 100 : 0} className="h-1.5 mt-1" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Agent Leaderboard
              </CardTitle>
              <CardDescription>Top performers by calls & conversions</CardDescription>
            </CardHeader>
            <CardContent>
              {callsByAgent.length > 0 ? (
                <div className="space-y-3">
                  {callsByAgent.slice(0, 10).map((agent, i) => (
                    <motion.div
                      key={agent.agentId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      {/* Rank */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                        i === 1 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" :
                        i === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.answered}/{agent.total} answered · {agent.avgDuration}s avg
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs gap-1">
                          <PhoneCall className="h-3 w-3" />
                          {agent.total}
                        </Badge>
                        {agent.conversions > 0 && (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs gap-1">
                            <Trophy className="h-3 w-3" />
                            {agent.conversions}
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No call data for this period</p>
                  <p className="text-xs mt-1">Team performance will appear here once calls are logged</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Activity Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="text-center p-4">
              <Users className="h-5 w-5 mx-auto text-primary mb-2" />
              <p className="text-xl font-bold text-foreground">{teamMembers.length}</p>
              <p className="text-xs text-muted-foreground">Active Team</p>
            </Card>
            <Card className="text-center p-4">
              <PhoneCall className="h-5 w-5 mx-auto text-primary mb-2" />
              <p className="text-xl font-bold text-foreground">{callsByAgent.length}</p>
              <p className="text-xs text-muted-foreground">Agents Active</p>
            </Card>
            <Card className="text-center p-4">
              <Star className="h-5 w-5 mx-auto text-amber-500 mb-2" />
              <p className="text-xl font-bold text-foreground">
                {callsByAgent.length > 0 ? callsByAgent[0]?.name : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Top Performer</p>
            </Card>
            <Card className="text-center p-4">
              <Activity className="h-5 w-5 mx-auto text-emerald-500 mb-2" />
              <p className="text-xl font-bold text-foreground">
                {totalCalls > 0 && callsByAgent.length > 0 ? Math.round(totalCalls / callsByAgent.length) : 0}
              </p>
              <p className="text-xs text-muted-foreground">Avg Calls/Agent</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
