import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, TrendingDown, IndianRupee, Users, Target,
  BarChart3, Activity, ArrowUpRight, ArrowDownRight, RefreshCw,
  Zap, ShieldCheck, AlertTriangle, Calendar, Wallet, Receipt,
  PiggyBank, Calculator, Building2, Car, Shield, Banknote,
  CreditCard, ShoppingBag, Truck,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart,
} from "recharts";
import { format, subDays, subMonths, subWeeks, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";

type Period = "today" | "week" | "month" | "quarter" | "half" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today", week: "This Week", month: "This Month",
  quarter: "This Quarter", half: "6 Months", year: "This Year",
};

const VERTICAL_COLORS: Record<string, string> = {
  HSRP: "hsl(262 83% 58%)", Rentals: "hsl(173 80% 40%)", Accessories: "hsl(330 80% 60%)",
  "Car Sales": "hsl(217 91% 60%)", Insurance: "hsl(142 76% 36%)", Loans: "hsl(38 92% 50%)",
  Driver: "hsl(200 80% 50%)",
};

const COLORS = Object.values(VERTICAL_COLORS);

const fmt = (n: number) => {
  if (Math.abs(n) >= 10000000) return `Rs. ${(n / 10000000).toFixed(2)}Cr`;
  if (Math.abs(n) >= 100000) return `Rs. ${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `Rs. ${(n / 1000).toFixed(1)}K`;
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
};

function getDateRange(period: Period): { from: string; to: string; prevFrom: string; prevTo: string } {
  const now = new Date();
  let from: Date, to: Date, prevFrom: Date, prevTo: Date;
  switch (period) {
    case "today":
      from = to = now;
      prevFrom = prevTo = subDays(now, 1);
      break;
    case "week":
      from = startOfWeek(now, { weekStartsOn: 1 });
      to = endOfWeek(now, { weekStartsOn: 1 });
      prevFrom = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      prevTo = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      break;
    case "month":
      from = startOfMonth(now);
      to = endOfMonth(now);
      prevFrom = startOfMonth(subMonths(now, 1));
      prevTo = endOfMonth(subMonths(now, 1));
      break;
    case "quarter":
      from = startOfQuarter(now);
      to = endOfQuarter(now);
      prevFrom = startOfQuarter(subMonths(now, 3));
      prevTo = endOfQuarter(subMonths(now, 3));
      break;
    case "half":
      from = subMonths(now, 6);
      to = now;
      prevFrom = subMonths(now, 12);
      prevTo = subMonths(now, 6);
      break;
    case "year":
      from = startOfYear(now);
      to = endOfYear(now);
      prevFrom = startOfYear(subMonths(now, 12));
      prevTo = endOfYear(subMonths(now, 12));
      break;
  }
  return {
    from: format(from, "yyyy-MM-dd"),
    to: format(to, "yyyy-MM-dd"),
    prevFrom: format(prevFrom, "yyyy-MM-dd"),
    prevTo: format(prevTo, "yyyy-MM-dd"),
  };
}

export const RevenueIntelligenceDashboard = () => {
  const [period, setPeriod] = useState<Period>("month");
  const [tab, setTab] = useState("overview");
  const { from, to, prevFrom, prevTo } = getDateRange(period);

  // ── Revenue Data ──
  const { data: revenueData, isLoading, refetch } = useQuery({
    queryKey: ["revIntel", period],
    queryFn: async () => {
      const sum = (rows: any[] | null, key: string) => rows?.reduce((s, r) => s + (Number(r[key]) || 0), 0) || 0;

      const [
        hsrpC, hsrpP, rentalC, rentalP, accC, accP, driverC, driverP,
        plEntries, expenses, invoices, leadsCurrent, leadsPrev, convertedCurrent,
      ] = await Promise.all([
        supabase.from("hsrp_bookings").select("payment_amount, service_price").eq("payment_status", "paid").gte("created_at", from).lte("created_at", to),
        supabase.from("hsrp_bookings").select("payment_amount").eq("payment_status", "paid").gte("created_at", prevFrom).lte("created_at", prevTo),
        supabase.from("rental_bookings").select("total_amount").eq("payment_status", "paid").gte("created_at", from).lte("created_at", to),
        supabase.from("rental_bookings").select("total_amount").eq("payment_status", "paid").gte("created_at", prevFrom).lte("created_at", prevTo),
        supabase.from("accessory_orders").select("total_amount, subtotal").eq("payment_status", "paid").gte("created_at", from).lte("created_at", to),
        supabase.from("accessory_orders").select("total_amount").eq("payment_status", "paid").gte("created_at", prevFrom).lte("created_at", prevTo),
        supabase.from("driver_bookings").select("total_amount").eq("payment_status", "paid").gte("created_at", from).lte("created_at", to),
        supabase.from("driver_bookings").select("total_amount").eq("payment_status", "paid").gte("created_at", prevFrom).lte("created_at", prevTo),
        (supabase as any).from("vertical_pl_entries").select("*").gte("entry_date", from).lte("entry_date", to),
        supabase.from("expense_entries").select("amount, category").gte("expense_date", from).lte("expense_date", to),
        supabase.from("invoices").select("total_amount, vertical_name, status").gte("invoice_date", from).lte("invoice_date", to),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", from).lte("created_at", to),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", prevFrom).lte("created_at", prevTo),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "converted").gte("created_at", from).lte("created_at", to),
      ]);

      // Revenue by vertical
      const hsrpRev = sum(hsrpC.data, "payment_amount");
      const rentalRev = sum(rentalC.data, "total_amount");
      const accRev = sum(accC.data, "total_amount");
      const driverRev = sum(driverC.data, "total_amount");

      // P&L entries profit
      const plProfit = (plEntries.data || []).reduce((s: number, e: any) => s + Number(e.profit || 0), 0);
      const plRevenue = (plEntries.data || []).reduce((s: number, e: any) => s + Number(e.gross_revenue || 0), 0);
      const plCost = (plEntries.data || []).reduce((s: number, e: any) => s + Number(e.cost_of_service || 0), 0);
      const plGST = (plEntries.data || []).reduce((s: number, e: any) => s + Number(e.gst_amount || 0), 0);

      // Expenses
      const totalExpenses = sum(expenses.data, "amount");
      const expenseByCategory: Record<string, number> = {};
      (expenses.data || []).forEach((e: any) => {
        const cat = e.category || "Other";
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(e.amount || 0);
      });

      // Invoiced revenue
      const invoicedRevenue = (invoices.data || []).filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);

      const grossRevenue = Math.max(hsrpRev + rentalRev + accRev + driverRev, plRevenue, invoicedRevenue);
      const prevGross = sum(hsrpP.data, "payment_amount") + sum(rentalP.data, "total_amount") + sum(accP.data, "total_amount") + sum(driverP.data, "total_amount");
      const growth = prevGross > 0 ? ((grossRevenue - prevGross) / prevGross) * 100 : 0;

      const netAfterExpense = grossRevenue - totalExpenses;
      const netProfitBeforeTax = plProfit > 0 ? plProfit : netAfterExpense - plCost;

      const leads = leadsCurrent.count || 0;
      const prevLeads = leadsPrev.count || 0;
      const converted = convertedCurrent.count || 0;

      // Per-vertical P&L from entries
      const verticalPL: Record<string, { revenue: number; cost: number; profit: number; count: number }> = {};
      (plEntries.data || []).forEach((e: any) => {
        const v = e.vertical_slug || "other";
        if (!verticalPL[v]) verticalPL[v] = { revenue: 0, cost: 0, profit: 0, count: 0 };
        verticalPL[v].revenue += Number(e.gross_revenue || 0);
        verticalPL[v].cost += Number(e.cost_of_service || 0);
        verticalPL[v].profit += Number(e.profit || 0);
        verticalPL[v].count++;
      });

      return {
        grossRevenue, prevGross, growth,
        totalExpenses, netAfterExpense, netProfitBeforeTax,
        plGST, plCost,
        breakdown: [
          { name: "HSRP", current: hsrpRev, previous: sum(hsrpP.data, "payment_amount") },
          { name: "Rentals", current: rentalRev, previous: sum(rentalP.data, "total_amount") },
          { name: "Accessories", current: accRev, previous: sum(accP.data, "total_amount") },
          { name: "Driver", current: driverRev, previous: sum(driverP.data, "total_amount") },
        ],
        verticalPL,
        expenseByCategory,
        leads, prevLeads, converted,
        conversionRate: leads > 0 ? (converted / leads) * 100 : 0,
        leadGrowth: prevLeads > 0 ? ((leads - prevLeads) / prevLeads) * 100 : 0,
      };
    },
  });

  // ── Monthly Trend ──
  const { data: monthlyTrend } = useQuery({
    queryKey: ["revTrend6m"],
    queryFn: async () => {
      const months: { month: string; revenue: number; expenses: number; profit: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const ms = format(startOfMonth(d), "yyyy-MM-dd");
        const me = format(endOfMonth(d), "yyyy-MM-dd");
        const [hsrp, rental, acc, exp] = await Promise.all([
          supabase.from("hsrp_bookings").select("payment_amount").eq("payment_status", "paid").gte("created_at", ms).lte("created_at", me),
          supabase.from("rental_bookings").select("total_amount").eq("payment_status", "paid").gte("created_at", ms).lte("created_at", me),
          supabase.from("accessory_orders").select("total_amount").eq("payment_status", "paid").gte("created_at", ms).lte("created_at", me),
          supabase.from("expense_entries").select("amount").gte("expense_date", ms).lte("expense_date", me),
        ]);
        const rev = (hsrp.data?.reduce((s, r) => s + (r.payment_amount || 0), 0) || 0) +
          (rental.data?.reduce((s, r) => s + (r.total_amount || 0), 0) || 0) +
          (acc.data?.reduce((s, r) => s + (r.total_amount || 0), 0) || 0);
        const totalExp = exp.data?.reduce((s, r) => s + (Number(r.amount) || 0), 0) || 0;
        months.push({ month: format(d, "MMM"), revenue: rev, expenses: totalExp, profit: rev - totalExp });
      }
      return months;
    },
  });

  const d = revenueData;
  const profitMargin = d && d.grossRevenue > 0 ? (d.netProfitBeforeTax / d.grossRevenue) * 100 : 0;

  const pieData = d?.breakdown.filter(b => b.current > 0).map((b, i) => ({
    name: b.name, value: b.current, fill: COLORS[i % COLORS.length],
  })) || [];

  const expensePie = d ? Object.entries(d.expenseByCategory).map(([name, value], i) => ({
    name, value, fill: COLORS[(i + 2) % COLORS.length],
  })) : [];

  const changeIcon = (val: number) => val > 0
    ? <ArrowUpRight className="h-3 w-3 text-emerald-500" />
    : val < 0 ? <ArrowDownRight className="h-3 w-3 text-red-500" /> : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            Revenue & P&L Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gross → Net → Profit • All verticals • Real-time</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border overflow-hidden">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <Button key={p} size="sm" variant={period === p ? "default" : "ghost"}
                onClick={() => setPeriod(p)} className="rounded-none text-[11px] px-2.5">
                {PERIOD_LABELS[p]}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── P&L Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            label: "Gross Revenue", value: fmt(d?.grossRevenue || 0),
            change: d?.growth || 0, icon: IndianRupee,
            color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30",
            tag: "GROSS", tagColor: "bg-emerald-100 text-emerald-700",
          },
          {
            label: "Total Expenses", value: fmt(d?.totalExpenses || 0),
            change: 0, icon: Receipt,
            color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30",
            tag: "OPEX", tagColor: "bg-red-100 text-red-700",
          },
          {
            label: "Net After Expense", value: fmt(d?.netAfterExpense || 0),
            change: 0, icon: Wallet,
            color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30",
            tag: "NET", tagColor: "bg-blue-100 text-blue-700",
          },
          {
            label: "Net Profit (Pre-Tax)", value: fmt(d?.netProfitBeforeTax || 0),
            change: profitMargin, icon: PiggyBank,
            color: (d?.netProfitBeforeTax || 0) >= 0 ? "text-emerald-600" : "text-red-600",
            bg: (d?.netProfitBeforeTax || 0) >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30",
            tag: "PROFIT", tagColor: (d?.netProfitBeforeTax || 0) >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
          },
          {
            label: "Profit Margin", value: `${profitMargin.toFixed(1)}%`,
            change: 0, icon: Calculator,
            color: profitMargin >= 20 ? "text-emerald-600" : profitMargin >= 10 ? "text-amber-600" : "text-red-600",
            bg: profitMargin >= 20 ? "bg-emerald-50 dark:bg-emerald-950/30" : profitMargin >= 10 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-red-50 dark:bg-red-950/30",
            tag: "%", tagColor: "bg-muted text-muted-foreground",
          },
        ].map(kpi => (
          <Card key={kpi.label} className={`${kpi.bg} border-none shadow-sm relative overflow-hidden`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <Badge className={`text-[9px] px-1.5 py-0 ${kpi.tagColor} border-none`}>{kpi.tag}</Badge>
              </div>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                {kpi.change !== 0 && (
                  <span className={`flex items-center text-[10px] font-medium ${kpi.change > 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {changeIcon(kpi.change)} {Math.abs(kpi.change).toFixed(1)}%
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── P&L Waterfall Visual ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" /> P&L Waterfall — {PERIOD_LABELS[period]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "Gross Revenue", value: d?.grossRevenue || 0, fill: "hsl(142 76% 36%)" },
                { name: "(-) Expenses", value: -(d?.totalExpenses || 0), fill: "hsl(0 84% 60%)" },
                { name: "(-) Cost of Service", value: -(d?.plCost || 0), fill: "hsl(24 95% 53%)" },
                { name: "(-) GST", value: -(d?.plGST || 0), fill: "hsl(38 92% 50%)" },
                { name: "Net Profit", value: d?.netProfitBeforeTax || 0, fill: (d?.netProfitBeforeTax || 0) >= 0 ? "hsl(173 80% 40%)" : "hsl(0 84% 60%)" },
              ]} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-[10px]" tick={{ fontSize: 10 }} />
                <YAxis className="text-xs" tickFormatter={v => fmt(Math.abs(v))} />
                <Tooltip formatter={(v: number) => [fmt(Math.abs(v)), v >= 0 ? "Add" : "Deduct"]} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {[
                    { fill: "hsl(142 76% 36%)" },
                    { fill: "hsl(0 84% 60%)" },
                    { fill: "hsl(24 95% 53%)" },
                    { fill: "hsl(38 92% 50%)" },
                    { fill: (d?.netProfitBeforeTax || 0) >= 0 ? "hsl(173 80% 40%)" : "hsl(0 84% 60%)" },
                  ].map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="verticals">🏢 By Vertical</TabsTrigger>
          <TabsTrigger value="trend">📈 Trend</TabsTrigger>
          <TabsTrigger value="expenses">💸 Expenses</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Leads & Conversions */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Leads & Conversions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <Users className="h-4 w-4 mx-auto text-blue-600 mb-1" />
                    <p className="text-lg font-bold text-blue-600">{d?.leads || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Total Leads</p>
                    {(d?.leadGrowth || 0) !== 0 && (
                      <span className={`text-[10px] ${d!.leadGrowth > 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {d!.leadGrowth > 0 ? "↑" : "↓"}{Math.abs(d!.leadGrowth).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                    <Target className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
                    <p className="text-lg font-bold text-emerald-600">{d?.converted || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Converted</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                    <Activity className="h-4 w-4 mx-auto text-purple-600 mb-1" />
                    <p className="text-lg font-bold text-purple-600">{d?.conversionRate.toFixed(1)}%</p>
                    <p className="text-[10px] text-muted-foreground">Conversion Rate</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Avg Revenue / Lead</span>
                    <span className="font-semibold">{d && d.leads > 0 ? fmt(d.grossRevenue / d.leads) : "Rs. 0"}</span>
                  </div>
                  <Progress value={Math.min(d?.conversionRate || 0, 100)} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Revenue Pie */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Vertical</CardTitle></CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [fmt(v), "Revenue"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* BY VERTICAL */}
        <TabsContent value="verticals">
          <div className="space-y-4">
            {/* Vertical comparison bar chart */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Current vs Previous Period</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d?.breakdown || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={v => fmt(v)} />
                      <Tooltip formatter={(v: number) => [fmt(v)]} />
                      <Legend />
                      <Bar dataKey="previous" fill="hsl(var(--muted-foreground) / 0.2)" radius={[4, 4, 0, 0]} name="Previous" />
                      <Bar dataKey="current" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Current" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Per-vertical P&L cards */}
            {d?.verticalPL && Object.keys(d.verticalPL).length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(d.verticalPL).map(([slug, vpl]) => {
                  const margin = vpl.revenue > 0 ? (vpl.profit / vpl.revenue) * 100 : 0;
                  const icon = slug === "car-sales" ? Car : slug === "insurance" ? Shield : slug === "loans" ? Banknote
                    : slug === "hsrp" ? CreditCard : slug === "accessories" ? ShoppingBag : slug === "self-drive" ? Truck : Building2;
                  const Icon = icon;
                  return (
                    <Card key={slug} className="relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: VERTICAL_COLORS[slug] || "hsl(var(--primary))" }} />
                      <CardContent className="p-4 pl-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-sm capitalize">{slug.replace(/-/g, " ")}</span>
                          <Badge variant="outline" className="text-[9px] ml-auto">{vpl.count} deals</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="text-sm font-bold text-emerald-600">{fmt(vpl.revenue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Cost</p>
                            <p className="text-sm font-bold text-red-600">{fmt(vpl.cost)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Profit</p>
                            <p className={`text-sm font-bold ${vpl.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(vpl.profit)}</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-muted-foreground">Margin</span>
                            <span className={`font-semibold ${margin >= 20 ? "text-emerald-600" : margin >= 10 ? "text-amber-600" : "text-red-600"}`}>{margin.toFixed(1)}%</span>
                          </div>
                          <Progress value={Math.min(Math.abs(margin), 100)} className="h-1.5" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TREND */}
        <TabsContent value="trend">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">6-Month Revenue vs Expenses vs Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={v => fmt(v)} />
                    <Tooltip formatter={(v: number, name: string) => [fmt(v), name]} />
                    <Legend />
                    <Bar dataKey="revenue" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} name="Revenue" />
                    <Bar dataKey="expenses" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} name="Expenses" />
                    <Line type="monotone" dataKey="profit" stroke="hsl(217 91% 60%)" strokeWidth={2.5} name="Profit" dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPENSES */}
        <TabsContent value="expenses">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Expense Breakdown</CardTitle></CardHeader>
              <CardContent>
                {expensePie.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={expensePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={35}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {expensePie.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => [fmt(v)]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-12">No expenses recorded this period</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Expense Categories</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {d && Object.entries(d.expenseByCategory).sort(([, a], [, b]) => b - a).map(([cat, amount]) => (
                    <div key={cat} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <span className="text-sm capitalize">{cat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-red-600">{fmt(amount)}</span>
                        <Badge variant="outline" className="text-[9px]">
                          {d.totalExpenses > 0 ? ((amount / d.totalExpenses) * 100).toFixed(0) : 0}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {(!d || Object.keys(d.expenseByCategory).length === 0) && (
                    <p className="text-center text-sm text-muted-foreground py-8">No expenses</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Actionable Insights ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" /> Smart Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {d && d.growth < 0 && (
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <TrendingDown className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div><p className="font-medium text-xs">Revenue Declining</p><p className="text-[10px] text-muted-foreground">Revenue dropped {Math.abs(d.growth).toFixed(1)}% vs previous period</p></div>
            </div>
          )}
          {d && profitMargin < 10 && d.grossRevenue > 0 && (
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div><p className="font-medium text-xs">Low Profit Margin</p><p className="text-[10px] text-muted-foreground">Only {profitMargin.toFixed(1)}% margin — review costs & pricing</p></div>
            </div>
          )}
          {d && d.totalExpenses > d.grossRevenue * 0.7 && d.grossRevenue > 0 && (
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <Receipt className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div><p className="font-medium text-xs">High Expense Ratio</p><p className="text-[10px] text-muted-foreground">Expenses are {((d.totalExpenses / d.grossRevenue) * 100).toFixed(0)}% of revenue — optimize spending</p></div>
            </div>
          )}
          {d && d.growth >= 10 && (
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div><p className="font-medium text-xs">Strong Growth!</p><p className="text-[10px] text-muted-foreground">Revenue up {d.growth.toFixed(1)}% — scale winning channels</p></div>
            </div>
          )}
          {d && profitMargin >= 20 && (
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div><p className="font-medium text-xs">Healthy Margins</p><p className="text-[10px] text-muted-foreground">{profitMargin.toFixed(1)}% profit margin — business is profitable</p></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
