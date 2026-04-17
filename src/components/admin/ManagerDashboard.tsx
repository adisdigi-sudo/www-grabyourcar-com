import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, TrendingUp, Users, Target, Trophy, ArrowUpRight, ArrowDownRight,
  CalendarDays, CheckCircle2, XCircle, Zap, Star, Activity, PhoneCall, Timer,
  Shield, Wallet, ShoppingBag, Car, Megaphone, Mail, MessageSquare, IndianRupee,
  Eye, MousePointerClick, AlertCircle
} from "lucide-react";
import { format, subDays } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Area, AreaChart
} from "recharts";
import { useVerticalAccess } from "@/hooks/useVerticalAccess";
import { motion } from "framer-motion";
import { TeamEngagement } from "./TeamEngagement";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
];

const fmtINR = (n: number) => {
  if (!n || isNaN(n)) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

export function ManagerDashboard() {
  const { activeVertical } = useVerticalAccess();
  const [period, setPeriod] = useState("30");

  const fromDate = useMemo(() => format(subDays(new Date(), parseInt(period)), "yyyy-MM-dd"), [period]);
  const toDate = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const fromIso = `${fromDate}T00:00:00`;
  const toIso = `${toDate}T23:59:59`;

  // ═══ DATA FETCHING — ALL REVENUE SOURCES ═══
  const { data: callLogs = [] } = useQuery({
    queryKey: ["mgr-calls", fromDate, toDate, activeVertical?.id],
    queryFn: async () => {
      let q = supabase.from("call_logs").select("agent_id, disposition, duration_seconds, created_at")
        .gte("created_at", fromIso).lte("created_at", toIso);
      if (activeVertical?.id) q = q.eq("vertical_id", activeVertical.id);
      const { data } = await q.limit(1000);
      return data || [];
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["mgr-leads", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("id, status, source, created_at, assigned_to")
        .gte("created_at", fromIso).lte("created_at", toIso).limit(2000);
      return data || [];
    },
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["mgr-team"],
    queryFn: async () => {
      const { data } = await supabase.from("team_members").select("user_id, display_name, department").eq("is_active", true);
      return data || [];
    },
  });

  // 1. Insurance — paid premium from policies
  const { data: insClients = [] } = useQuery({
    queryKey: ["mgr-ins", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("insurance_clients")
        .select("id, lead_status, pipeline_stage, current_premium, created_at")
        .gte("created_at", fromIso).lte("created_at", toIso).limit(2000);
      return data || [];
    },
  });

  // 2. Loans
  const { data: loanApps = [] } = useQuery({
    queryKey: ["mgr-loans", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("loan_applications")
        .select("id, stage, loan_amount, created_at")
        .gte("created_at", fromIso).lte("created_at", toIso).limit(2000);
      return data || [];
    },
  });

  // 3. Sales — actual deals closed
  const { data: deals = [] } = useQuery({
    queryKey: ["mgr-deals", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("deals")
        .select("id, vertical_name, deal_status, deal_value, payment_received_amount, payment_status, created_at, closed_at")
        .gte("created_at", fromIso).lte("created_at", toIso).limit(2000);
      return data || [];
    },
  });

  // 4. Accessories
  const { data: accOrders = [] } = useQuery({
    queryKey: ["mgr-acc", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("accessory_orders")
        .select("id, total_amount, payment_status, order_status, created_at")
        .gte("created_at", fromIso).lte("created_at", toIso).limit(2000);
      return data || [];
    },
  });

  // 5. HSRP
  const { data: hsrpBookings = [] } = useQuery({
    queryKey: ["mgr-hsrp", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("hsrp_bookings")
        .select("id, payment_amount, service_price, payment_status, created_at")
        .gte("created_at", fromIso).lte("created_at", toIso).limit(2000);
      return data || [];
    },
  });

  // 6. Rentals
  const { data: rentalBookings = [] } = useQuery({
    queryKey: ["mgr-rental", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("rental_bookings")
        .select("id, total_amount, payment_status, created_at")
        .gte("created_at", fromIso).lte("created_at", toIso).limit(2000);
      return data || [];
    },
  });

  // ═══ MARKETING CAMPAIGNS ═══
  const { data: emailCampaigns = [] } = useQuery({
    queryKey: ["mgr-email-camp", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("email_campaigns")
        .select("id, name, status, total_recipients, open_count, click_count, created_at")
        .gte("created_at", fromIso).lte("created_at", toIso).limit(200);
      return data || [];
    },
  });

  const { data: waCampaigns = [] } = useQuery({
    queryKey: ["mgr-wa-camp", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("campaigns")
        .select("id, name, status, channel, total_recipients, delivered_count, read_count, created_at")
        .gte("created_at", fromIso).lte("created_at", toIso).limit(200);
      return data || [];
    },
  });

  const { data: adCampaigns = [] } = useQuery({
    queryKey: ["mgr-ads", fromDate, toDate],
    queryFn: async () => {
      const { data } = await supabase.from("ad_campaigns")
        .select("id, campaign_name, platform, total_spend, leads_generated, clicks, impressions, conversions, cost_per_lead, status, created_at")
        .gte("created_at", fromIso).lte("created_at", toIso).limit(200);
      return data || [];
    },
  });

  // ═══ COMPUTED REVENUE — REAL DATA, ALL SOURCES ═══
  const revenue = useMemo(() => {
    const insurance = insClients
      .filter((c: any) => ["won", "policy_issued"].includes((c.lead_status || c.pipeline_stage || "").toLowerCase()))
      .reduce((s: number, c: any) => s + Number(c.current_premium || 0), 0);

    const loans = loanApps
      .filter((l: any) => ["disbursed", "converted"].includes((l.stage || "").toLowerCase()))
      .reduce((s: number, l: any) => s + Number(l.loan_amount || 0), 0);

    const sales = deals
      .filter((d: any) => d.payment_status === "received" || d.payment_status === "partial")
      .reduce((s: number, d: any) => s + Number(d.payment_received_amount || d.deal_value || 0), 0);

    const accessories = accOrders
      .filter((o: any) => o.payment_status === "paid")
      .reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);

    const hsrp = hsrpBookings
      .filter((b: any) => b.payment_status === "paid")
      .reduce((s: number, b: any) => s + Number(b.payment_amount || b.service_price || 0), 0);

    const rentals = rentalBookings
      .filter((b: any) => b.payment_status === "paid")
      .reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0);

    return {
      insurance, loans, sales, accessories, hsrp, rentals,
      total: insurance + loans + sales + accessories + hsrp + rentals,
    };
  }, [insClients, loanApps, deals, accOrders, hsrpBookings, rentalBookings]);

  // Conversions
  const totalConversions = useMemo(() => {
    const ins = insClients.filter((c: any) => ["won", "policy_issued"].includes((c.lead_status || c.pipeline_stage || "").toLowerCase())).length;
    const lon = loanApps.filter((l: any) => ["disbursed", "converted"].includes((l.stage || "").toLowerCase())).length;
    const sal = deals.filter((d: any) => d.payment_status === "received").length;
    const acc = accOrders.filter((o: any) => o.payment_status === "paid").length;
    const hs = hsrpBookings.filter((b: any) => b.payment_status === "paid").length;
    const rn = rentalBookings.filter((b: any) => b.payment_status === "paid").length;
    return { ins, lon, sal, acc, hs, rn, total: ins + lon + sal + acc + hs + rn };
  }, [insClients, loanApps, deals, accOrders, hsrpBookings, rentalBookings]);

  // Calls
  const totalCalls = callLogs.length;
  const answeredCalls = callLogs.filter((c: any) => c.disposition === "connected" || c.disposition === "callback_requested").length;
  const avgCallDuration = totalCalls > 0
    ? Math.round(callLogs.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / totalCalls)
    : 0;

  // Pipeline
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l: any) => l.status === "converted" || l.status === "won").length;
  const lostLeads = leads.filter((l: any) => l.status === "lost" || l.status === "closed").length;
  const conversionRate = totalLeads > 0 ? ((totalConversions.total / totalLeads) * 100).toFixed(1) : "0";

  // Marketing aggregates
  const marketingStats = useMemo(() => {
    const emailSent = emailCampaigns.reduce((s: number, c: any) => s + (c.total_recipients || 0), 0);
    const emailOpens = emailCampaigns.reduce((s: number, c: any) => s + (c.open_count || 0), 0);
    const emailClicks = emailCampaigns.reduce((s: number, c: any) => s + (c.click_count || 0), 0);
    const waSent = waCampaigns.reduce((s: number, c: any) => s + (c.total_recipients || 0), 0);
    const waDelivered = waCampaigns.reduce((s: number, c: any) => s + (c.delivered_count || 0), 0);
    const waRead = waCampaigns.reduce((s: number, c: any) => s + (c.read_count || 0), 0);
    const adSpend = adCampaigns.reduce((s: number, c: any) => s + Number(c.total_spend || 0), 0);
    const adLeads = adCampaigns.reduce((s: number, c: any) => s + (c.leads_generated || 0), 0);
    const adClicks = adCampaigns.reduce((s: number, c: any) => s + (c.clicks || 0), 0);
    const adImpressions = adCampaigns.reduce((s: number, c: any) => s + (c.impressions || 0), 0);
    return {
      emailSent, emailOpens, emailClicks,
      emailOpenRate: emailSent > 0 ? ((emailOpens / emailSent) * 100).toFixed(1) : "0",
      waSent, waDelivered, waRead,
      waReadRate: waDelivered > 0 ? ((waRead / waDelivered) * 100).toFixed(1) : "0",
      adSpend, adLeads, adClicks, adImpressions,
      cpl: adLeads > 0 ? adSpend / adLeads : 0,
      roi: adSpend > 0 ? ((revenue.total - adSpend) / adSpend) * 100 : 0,
    };
  }, [emailCampaigns, waCampaigns, adCampaigns, revenue.total]);

  // Daily revenue trend
  const dailyRevenueTrend = useMemo(() => {
    const map = new Map<string, number>();
    const days = Math.min(parseInt(period), 30);
    for (let i = days - 1; i >= 0; i--) {
      map.set(format(subDays(new Date(), i), "dd MMM"), 0);
    }
    const addTo = (dateStr: string, amount: number) => {
      const d = format(new Date(dateStr), "dd MMM");
      if (map.has(d)) map.set(d, (map.get(d) || 0) + amount);
    };
    deals.filter((d: any) => d.payment_status === "received").forEach((d: any) =>
      addTo(d.closed_at || d.created_at, Number(d.payment_received_amount || d.deal_value || 0)));
    accOrders.filter((o: any) => o.payment_status === "paid").forEach((o: any) =>
      addTo(o.created_at, Number(o.total_amount || 0)));
    hsrpBookings.filter((b: any) => b.payment_status === "paid").forEach((b: any) =>
      addTo(b.created_at, Number(b.payment_amount || b.service_price || 0)));
    rentalBookings.filter((b: any) => b.payment_status === "paid").forEach((b: any) =>
      addTo(b.created_at, Number(b.total_amount || 0)));
    return Array.from(map.entries()).map(([date, value]) => ({ date, value }));
  }, [deals, accOrders, hsrpBookings, rentalBookings, period]);

  // Revenue by vertical
  const revenueByVertical = useMemo(() => [
    { name: "Insurance", value: revenue.insurance, icon: Shield, color: "emerald" },
    { name: "Loans", value: revenue.loans, icon: Wallet, color: "blue" },
    { name: "Sales", value: revenue.sales, icon: Car, color: "purple" },
    { name: "Accessories", value: revenue.accessories, icon: ShoppingBag, color: "amber" },
    { name: "HSRP", value: revenue.hsrp, icon: Target, color: "rose" },
    { name: "Rentals", value: revenue.rentals, icon: Activity, color: "indigo" },
  ].filter(v => v.value > 0), [revenue]);

  // Lead source breakdown
  const leadSourceData = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach((l: any) => {
      const src = l.source || "Direct";
      map.set(src, (map.get(src) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 6);
  }, [leads]);

  // Team performance
  const callsByAgent = useMemo(() => {
    const map = new Map<string, { total: number; answered: number; duration: number }>();
    callLogs.forEach((c: any) => {
      const agent = c.agent_id || "Unknown";
      const existing = map.get(agent) || { total: 0, answered: 0, duration: 0 };
      existing.total++;
      if (c.disposition === "connected" || c.disposition === "callback_requested") existing.answered++;
      existing.duration += c.duration_seconds || 0;
      map.set(agent, existing);
    });
    return Array.from(map.entries()).map(([agentId, stats]) => {
      const member = teamMembers.find((m: any) => m.user_id === agentId);
      return {
        agentId,
        name: member?.display_name || agentId.slice(0, 8),
        dept: member?.department || "—",
        ...stats,
        avgDuration: stats.total > 0 ? Math.round(stats.duration / stats.total) : 0,
        answerRate: stats.total > 0 ? Math.round((stats.answered / stats.total) * 100) : 0,
      };
    }).sort((a, b) => b.total - a.total);
  }, [callLogs, teamMembers]);

  const StatCard = ({ title, value, subtitle, icon: Icon, accent = "primary" }: any) => (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
              <p className="text-2xl font-bold text-foreground truncate">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${accent}/10 shrink-0`}>
              <Icon className={`h-5 w-5 text-${accent}`} />
            </div>
          </div>
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
            {activeVertical ? `${activeVertical.name} — ` : ""}360° Marketing + Sales unified view
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

      {/* HERO REVENUE BANNER */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-emerald-500/5">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Revenue (All Verticals)</p>
                <p className="text-4xl font-bold text-foreground">{fmtINR(revenue.total)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {totalConversions.total} conversions · {totalLeads} leads · {conversionRate}% rate
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Marketing Spend</p>
                <p className="text-2xl font-bold text-foreground">{fmtINR(marketingStats.adSpend)}</p>
                <Badge variant={marketingStats.roi >= 0 ? "default" : "destructive"} className="gap-1">
                  {marketingStats.roi >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  ROI {marketingStats.roi.toFixed(0)}%
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cost per Lead</p>
                <p className="text-2xl font-bold text-foreground">{fmtINR(marketingStats.cpl)}</p>
                <p className="text-xs text-muted-foreground">{marketingStats.adLeads} leads from ads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Calls" value={totalCalls} subtitle={`${answeredCalls} answered`} icon={PhoneCall} accent="primary" />
        <StatCard title="New Leads" value={totalLeads} subtitle={`${conversionRate}% conversion`} icon={Users} accent="primary" />
        <StatCard title="Conversions" value={totalConversions.total} subtitle="Across all verticals" icon={Trophy} accent="primary" />
        <StatCard title="Avg Call Time" value={`${Math.floor(avgCallDuration / 60)}m ${avgCallDuration % 60}s`} subtitle={`${totalCalls} total calls`} icon={Timer} accent="primary" />
      </div>

      {/* REVENUE BY VERTICAL */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Insurance", val: revenue.insurance, n: totalConversions.ins, icon: Shield, cls: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
          { label: "Loans", val: revenue.loans, n: totalConversions.lon, icon: Wallet, cls: "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400" },
          { label: "Sales", val: revenue.sales, n: totalConversions.sal, icon: Car, cls: "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-600 dark:text-purple-400" },
          { label: "Accessories", val: revenue.accessories, n: totalConversions.acc, icon: ShoppingBag, cls: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400" },
          { label: "HSRP", val: revenue.hsrp, n: totalConversions.hs, icon: Target, cls: "from-rose-500/10 to-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400" },
          { label: "Rentals", val: revenue.rentals, n: totalConversions.rn, icon: Activity, cls: "from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 text-indigo-600 dark:text-indigo-400" },
        ].map((v) => (
          <Card key={v.label} className={`bg-gradient-to-br ${v.cls}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <v.icon className="h-4 w-4" />
                <span className="text-xs font-medium">{v.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{fmtINR(v.val)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{v.n} closed</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TABS */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="marketing" className="gap-1.5"><Megaphone className="h-3.5 w-3.5" /> Marketing</TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Pipeline</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Team</TabsTrigger>
          <TabsTrigger value="engagement" className="gap-1.5"><Trophy className="h-3.5 w-3.5" /> Live Engagement</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><IndianRupee className="h-4 w-4 text-emerald-600" /> Daily Revenue Trend</CardTitle>
                <CardDescription>Paid revenue across all verticals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyRevenueTrend}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtINR(v)} />
                      <Tooltip
                        formatter={(v: number) => fmtINR(v)}
                        contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                      />
                      <Area type="monotone" dataKey="value" stroke="hsl(142, 71%, 45%)" fill="url(#revGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue Mix</CardTitle>
                <CardDescription>Vertical contribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  {revenueByVertical.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie data={revenueByVertical} cx="50%" cy="50%" outerRadius={90} innerRadius={55} dataKey="value"
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                          {revenueByVertical.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmtINR(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                      <AlertCircle className="h-8 w-8 opacity-40" />
                      <p>No revenue in this period</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* MARKETING */}
        <TabsContent value="marketing" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <Mail className="h-4 w-4 text-blue-500 mb-2" />
              <p className="text-xl font-bold">{marketingStats.emailSent.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground">Emails Sent</p>
              <p className="text-xs text-emerald-600 mt-1">{marketingStats.emailOpenRate}% open rate</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <MessageSquare className="h-4 w-4 text-emerald-500 mb-2" />
              <p className="text-xl font-bold">{marketingStats.waSent.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground">WhatsApp Sent</p>
              <p className="text-xs text-emerald-600 mt-1">{marketingStats.waReadRate}% read rate</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <Eye className="h-4 w-4 text-purple-500 mb-2" />
              <p className="text-xl font-bold">{marketingStats.adImpressions.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground">Ad Impressions</p>
              <p className="text-xs text-muted-foreground mt-1">{marketingStats.adClicks.toLocaleString("en-IN")} clicks</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <MousePointerClick className="h-4 w-4 text-amber-500 mb-2" />
              <p className="text-xl font-bold">{marketingStats.adLeads}</p>
              <p className="text-xs text-muted-foreground">Leads from Ads</p>
              <p className="text-xs text-muted-foreground mt-1">{fmtINR(marketingStats.cpl)}/lead</p>
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top Ad Campaigns</CardTitle>
                <CardDescription>Spend vs leads generated</CardDescription>
              </CardHeader>
              <CardContent>
                {adCampaigns.length > 0 ? (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {adCampaigns.slice(0, 8).map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.campaign_name}</p>
                          <p className="text-xs text-muted-foreground">{c.platform} · {c.leads_generated || 0} leads</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-sm font-bold">{fmtINR(Number(c.total_spend || 0))}</p>
                          <p className="text-xs text-muted-foreground">{fmtINR(Number(c.cost_per_lead || 0))}/lead</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No ad campaigns yet</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Lead Sources</CardTitle>
                <CardDescription>Where leads originate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  {leadSourceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leadSourceData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No lead data</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PIPELINE */}
        <TabsContent value="pipeline" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pipeline Funnel</CardTitle>
              <CardDescription>Lead progression overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Total Leads", value: totalLeads, icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
                { label: "In Pipeline", value: Math.max(0, totalLeads - convertedLeads - lostLeads), icon: Activity, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
                { label: "Converted (Paid)", value: totalConversions.total, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
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
        </TabsContent>

        {/* TEAM */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" /> Agent Leaderboard
              </CardTitle>
              <CardDescription>Top performers by call volume & answer rate</CardDescription>
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
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                        i === 1 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" :
                        i === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.dept} · {agent.answered}/{agent.total} answered · {agent.avgDuration}s avg
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs gap-1">
                          <PhoneCall className="h-3 w-3" />
                          {agent.total}
                        </Badge>
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs">
                          {agent.answerRate}%
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No call data for this period</p>
                </div>
              )}
            </CardContent>
          </Card>

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
              <p className="text-xl font-bold text-foreground truncate">
                {callsByAgent.length > 0 ? callsByAgent[0]?.name : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Top Performer</p>
            </Card>
            <Card className="text-center p-4">
              <Zap className="h-5 w-5 mx-auto text-emerald-500 mb-2" />
              <p className="text-xl font-bold text-foreground">
                {totalCalls > 0 && callsByAgent.length > 0 ? Math.round(totalCalls / callsByAgent.length) : 0}
              </p>
              <p className="text-xs text-muted-foreground">Avg Calls/Agent</p>
            </Card>
          </div>
        </TabsContent>

        {/* LIVE ENGAGEMENT */}
        <TabsContent value="engagement" className="space-y-4">
          <TeamEngagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
