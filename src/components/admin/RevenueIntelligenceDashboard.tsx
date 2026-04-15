import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, TrendingDown, DollarSign, Users, Target,
  BarChart3, Activity, ArrowUpRight, ArrowDownRight, RefreshCw,
  Zap, ShieldCheck, AlertTriangle,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";

// ── Health Score Calculator ──────────────────────────────────
function calcHealthScore(metrics: {
  conversionRate: number;
  revenueGrowth: number;
  customerRetention: number;
  leadVelocity: number;
}) {
  const w = { conversion: 0.3, revenue: 0.3, retention: 0.25, velocity: 0.15 };
  const score =
    Math.min(metrics.conversionRate / 15, 1) * w.conversion * 100 +
    Math.min((metrics.revenueGrowth + 50) / 100, 1) * w.revenue * 100 +
    Math.min(metrics.customerRetention / 80, 1) * w.retention * 100 +
    Math.min(metrics.leadVelocity / 50, 1) * w.velocity * 100;
  return Math.round(Math.min(score, 100));
}

function healthLabel(score: number) {
  if (score >= 80) return { text: "Excellent", color: "text-green-500", bg: "bg-green-500/10" };
  if (score >= 60) return { text: "Good", color: "text-blue-500", bg: "bg-blue-500/10" };
  if (score >= 40) return { text: "Fair", color: "text-yellow-500", bg: "bg-yellow-500/10" };
  return { text: "Needs Attention", color: "text-red-500", bg: "bg-red-500/10" };
}

const COLORS = [
  "hsl(217.2 91.2% 59.8%)",
  "hsl(142.1 76.2% 36.3%)",
  "hsl(24.6 95% 53.1%)",
  "hsl(280 67% 50%)",
  "hsl(0 84.2% 60.2%)",
];

export const RevenueIntelligenceDashboard = () => {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const daysBack = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const fromDate = format(subDays(new Date(), daysBack), "yyyy-MM-dd");
  const toDate = format(new Date(), "yyyy-MM-dd");
  const prevFrom = format(subDays(new Date(), daysBack * 2), "yyyy-MM-dd");

  // ── Revenue data ────────────────────────────────────────────
  const { data: revenueData, isLoading, refetch } = useQuery({
    queryKey: ["revenueIntelligence", period],
    queryFn: async () => {
      const [
        hsrpCurrent, hsrpPrev,
        rentalCurrent, rentalPrev,
        accessoryCurrent, accessoryPrev,
        leadsCurrent, leadsPrev,
        convertedCurrent,
        driverCurrent, driverPrev,
      ] = await Promise.all([
        supabase.from("hsrp_bookings").select("payment_amount").eq("payment_status", "paid").gte("created_at", fromDate).lte("created_at", toDate),
        supabase.from("hsrp_bookings").select("payment_amount").eq("payment_status", "paid").gte("created_at", prevFrom).lt("created_at", fromDate),
        supabase.from("rental_bookings").select("total_amount").eq("payment_status", "paid").gte("created_at", fromDate).lte("created_at", toDate),
        supabase.from("rental_bookings").select("total_amount").eq("payment_status", "paid").gte("created_at", prevFrom).lt("created_at", fromDate),
        supabase.from("accessory_orders").select("total_amount").eq("payment_status", "paid").gte("created_at", fromDate).lte("created_at", toDate),
        supabase.from("accessory_orders").select("total_amount").eq("payment_status", "paid").gte("created_at", prevFrom).lt("created_at", fromDate),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", fromDate).lte("created_at", toDate),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", prevFrom).lt("created_at", fromDate),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "converted").gte("created_at", fromDate).lte("created_at", toDate),
        supabase.from("driver_bookings").select("total_amount").eq("payment_status", "paid").gte("created_at", fromDate).lte("created_at", toDate),
        supabase.from("driver_bookings").select("total_amount").eq("payment_status", "paid").gte("created_at", prevFrom).lt("created_at", fromDate),
      ]);

      const sum = (rows: any[] | null, key: string) => rows?.reduce((s, r) => s + (r[key] || 0), 0) || 0;

      const hsrpRev = sum(hsrpCurrent.data, "payment_amount");
      const hsrpPrevRev = sum(hsrpPrev.data, "payment_amount");
      const rentalRev = sum(rentalCurrent.data, "total_amount");
      const rentalPrevRev = sum(rentalPrev.data, "total_amount");
      const accRev = sum(accessoryCurrent.data, "total_amount");
      const accPrevRev = sum(accessoryPrev.data, "total_amount");
      const driverRev = sum(driverCurrent.data, "total_amount");
      const driverPrevRev = sum(driverPrev.data, "total_amount");

      const totalRev = hsrpRev + rentalRev + accRev + driverRev;
      const totalPrev = hsrpPrevRev + rentalPrevRev + accPrevRev + driverPrevRev;
      const growth = totalPrev > 0 ? ((totalRev - totalPrev) / totalPrev) * 100 : 0;

      const leads = leadsCurrent.count || 0;
      const prevLeads = leadsPrev.count || 0;
      const converted = convertedCurrent.count || 0;
      const conversionRate = leads > 0 ? (converted / leads) * 100 : 0;
      const leadGrowth = prevLeads > 0 ? ((leads - prevLeads) / prevLeads) * 100 : 0;

      return {
        totalRevenue: totalRev,
        previousRevenue: totalPrev,
        revenueGrowth: growth,
        breakdown: [
          { name: "HSRP", current: hsrpRev, previous: hsrpPrevRev },
          { name: "Rentals", current: rentalRev, previous: rentalPrevRev },
          { name: "Accessories", current: accRev, previous: accPrevRev },
          { name: "Driver", current: driverRev, previous: driverPrevRev },
        ],
        leads,
        prevLeads,
        leadGrowth,
        converted,
        conversionRate,
        healthScore: calcHealthScore({
          conversionRate,
          revenueGrowth: growth,
          customerRetention: 65,
          leadVelocity: leads / daysBack,
        }),
      };
    },
  });

  // ── Monthly trend (6 months) ────────────────────────────────
  const { data: monthlyTrend } = useQuery({
    queryKey: ["monthlyRevenueTrend"],
    queryFn: async () => {
      const months: { month: string; revenue: number; leads: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const ms = format(startOfMonth(d), "yyyy-MM-dd");
        const me = format(endOfMonth(d), "yyyy-MM-dd");
        const [hsrp, rental, acc, ld] = await Promise.all([
          supabase.from("hsrp_bookings").select("payment_amount").eq("payment_status", "paid").gte("created_at", ms).lte("created_at", me),
          supabase.from("rental_bookings").select("total_amount").eq("payment_status", "paid").gte("created_at", ms).lte("created_at", me),
          supabase.from("accessory_orders").select("total_amount").eq("payment_status", "paid").gte("created_at", ms).lte("created_at", me),
          supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", ms).lte("created_at", me),
        ]);
        const rev =
          (hsrp.data?.reduce((s, r) => s + (r.payment_amount || 0), 0) || 0) +
          (rental.data?.reduce((s, r) => s + (r.total_amount || 0), 0) || 0) +
          (acc.data?.reduce((s, r) => s + (r.total_amount || 0), 0) || 0);
        months.push({ month: format(d, "MMM"), revenue: rev, leads: ld.count || 0 });
      }
      return months;
    },
  });

  const hl = revenueData ? healthLabel(revenueData.healthScore) : healthLabel(0);
  const fmt = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(1)}K`;

  const pieData = revenueData?.breakdown.filter(b => b.current > 0).map((b, i) => ({
    name: b.name, value: b.current, fill: COLORS[i % COLORS.length],
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Revenue Intelligence
          </h1>
          <p className="text-muted-foreground text-sm">
            Real-time revenue insights, forecasting & business health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            {(["7d", "30d", "90d"] as const).map(p => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? "default" : "ghost"}
                onClick={() => setPeriod(p)}
                className="rounded-none text-xs"
              >
                {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Business Health Score */}
      <Card className={hl.bg}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20">
                <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${revenueData?.healthScore || 0}, 100`}
                    className={hl.color}
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${hl.color}`}>
                  {revenueData?.healthScore || 0}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Business Health Score</h3>
                <Badge variant="outline" className={hl.color}>{hl.text}</Badge>
              </div>
            </div>
            <div className="hidden md:flex gap-6 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Conversion</p>
                <p className="font-bold text-lg">{revenueData?.conversionRate.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Rev Growth</p>
                <p className="font-bold text-lg">{revenueData?.revenueGrowth.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Lead Velocity</p>
                <p className="font-bold text-lg">{((revenueData?.leads || 0) / daysBack).toFixed(1)}/day</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Total Revenue",
            value: fmt(revenueData?.totalRevenue || 0),
            change: revenueData?.revenueGrowth || 0,
            icon: DollarSign,
            color: "text-green-500",
          },
          {
            title: "Total Leads",
            value: revenueData?.leads?.toString() || "0",
            change: revenueData?.leadGrowth || 0,
            icon: Users,
            color: "text-blue-500",
          },
          {
            title: "Conversions",
            value: revenueData?.converted?.toString() || "0",
            change: revenueData?.conversionRate || 0,
            icon: Target,
            suffix: "rate",
            color: "text-purple-500",
          },
          {
            title: "Avg Rev/Lead",
            value: revenueData && revenueData.leads > 0
              ? fmt(revenueData.totalRevenue / revenueData.leads)
              : "₹0",
            change: 0,
            icon: Activity,
            color: "text-orange-500",
          },
        ].map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                {kpi.change !== 0 && (
                  <span className={`flex items-center text-xs font-medium ${kpi.change > 0 ? "text-green-500" : "text-red-500"}`}>
                    {kpi.change > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(kpi.change).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">Revenue Trend</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">6-Month Revenue & Lead Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis yAxisId="rev" className="text-xs" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <YAxis yAxisId="leads" orientation="right" className="text-xs" />
                    <Tooltip formatter={(v: number, name: string) => name === "revenue" ? [`₹${v.toLocaleString()}`, "Revenue"] : [v, "Leads"]} />
                    <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="hsl(217.2 91.2% 59.8%)" fill="hsl(217.2 91.2% 59.8% / 0.2)" />
                    <Line yAxisId="leads" type="monotone" dataKey="leads" stroke="hsl(142.1 76.2% 36.3%)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue by Vertical</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current vs Previous Period</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData?.breakdown || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`]} />
                      <Bar dataKey="previous" fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]} name="Previous" />
                      <Bar dataKey="current" fill="hsl(217.2 91.2% 59.8%)" radius={[4, 4, 0, 0]} name="Current" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecast">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Revenue Forecast (Next 3 Months)
              </CardTitle>
              <CardDescription>
                Based on {period} growth rate of {revenueData?.revenueGrowth.toFixed(1)}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const base = revenueData?.totalRevenue || 0;
                const rate = (revenueData?.revenueGrowth || 0) / 100;
                const forecast = [1, 2, 3].map(i => {
                  const d = new Date();
                  d.setMonth(d.getMonth() + i);
                  return {
                    month: format(d, "MMM yyyy"),
                    optimistic: Math.round(base * Math.pow(1 + Math.abs(rate) * 1.5, i)),
                    expected: Math.round(base * Math.pow(1 + rate, i)),
                    conservative: Math.round(base * Math.pow(1 + rate * 0.5, i)),
                  };
                });
                return (
                  <div className="space-y-6">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={forecast}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" />
                          <YAxis className="text-xs" tickFormatter={(v) => fmt(v)} />
                          <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`]} />
                          <Line type="monotone" dataKey="optimistic" stroke="hsl(142.1 76.2% 36.3%)" strokeDasharray="5 5" name="Optimistic" />
                          <Line type="monotone" dataKey="expected" stroke="hsl(217.2 91.2% 59.8%)" strokeWidth={2} name="Expected" />
                          <Line type="monotone" dataKey="conservative" stroke="hsl(0 84.2% 60.2%)" strokeDasharray="5 5" name="Conservative" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {forecast.map(f => (
                        <Card key={f.month} className="bg-muted/50">
                          <CardContent className="p-3 text-center">
                            <p className="text-xs text-muted-foreground">{f.month}</p>
                            <p className="text-lg font-bold">{fmt(f.expected)}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {fmt(f.conservative)} – {fmt(f.optimistic)}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actionable Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Actionable Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {revenueData && revenueData.revenueGrowth < 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Revenue Declining</p>
                  <p className="text-xs text-muted-foreground">
                    Revenue dropped {Math.abs(revenueData.revenueGrowth).toFixed(1)}% vs previous period. Consider launching promotions or re-engaging cold leads.
                  </p>
                </div>
              </div>
            )}
            {revenueData && revenueData.conversionRate < 5 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Low Conversion Rate</p>
                  <p className="text-xs text-muted-foreground">
                    Only {revenueData.conversionRate.toFixed(1)}% of leads convert. Use Journey Automation to nurture leads with WhatsApp follow-ups.
                  </p>
                </div>
              </div>
            )}
            {revenueData && revenueData.revenueGrowth > 10 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <TrendingUp className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Strong Growth!</p>
                  <p className="text-xs text-muted-foreground">
                    Revenue grew {revenueData.revenueGrowth.toFixed(1)}%. Double down on top-performing channels and scale cross-sell bundles.
                  </p>
                </div>
              </div>
            )}
            {revenueData && revenueData.breakdown.some(b => b.current === 0 && b.previous > 0) && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Zap className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Dormant Revenue Stream</p>
                  <p className="text-xs text-muted-foreground">
                    Some verticals had revenue last period but none now. Re-activate with targeted campaigns.
                  </p>
                </div>
              </div>
            )}
            {(!revenueData || (revenueData.revenueGrowth >= 0 && revenueData.conversionRate >= 5 && revenueData.revenueGrowth <= 10)) && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Activity className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Steady Performance</p>
                  <p className="text-xs text-muted-foreground">
                    Business metrics are stable. Focus on increasing lead volume and testing new cross-sell opportunities.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
