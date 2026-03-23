import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TrendingUp, TrendingDown, AlertTriangle, IndianRupee,
  ArrowUpRight, ArrowDownRight, BarChart3, PieChart,
  Target, Zap, ShieldAlert, Activity
} from "lucide-react";

const fmt = (v: number) => `Rs. ${Math.round(v).toLocaleString("en-IN")}`;
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

interface MonthData {
  month: string;
  revenue: number;
  expense: number;
  profit: number;
}

export const FinancialIntelligenceDashboard = () => {
  const months = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), i);
      return format(d, "yyyy-MM");
    }).reverse();
  }, []);

  // Fetch 6 months of revenue
  const { data: allRevenues = [] } = useQuery({
    queryKey: ["fi-revenues-6m", months[0]],
    queryFn: async () => {
      const { data, error } = await supabase.from("revenue_entries").select("amount, month_year, category, revenue_date")
        .gte("revenue_date", `${months[0]}-01`).order("revenue_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ["fi-expenses-6m", months[0]],
    queryFn: async () => {
      const { data, error } = await supabase.from("expense_entries").select("amount, month_year, category, expense_date")
        .gte("expense_date", `${months[0]}-01`).order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["fi-invoices-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("total_amount, status, due_date, invoice_date")
        .gte("invoice_date", `${months[0]}-01`);
      if (error) throw error;
      return data;
    },
  });

  const { data: payrolls = [] } = useQuery({
    queryKey: ["fi-payroll-summary"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("payroll_records") as any).select("net_salary, gross_salary, payroll_month, payment_status");
      if (error) throw error;
      return data || [];
    },
  });

  // Monthly breakdown
  const monthlyData: MonthData[] = useMemo(() => {
    return months.map(m => {
      const rev = allRevenues.filter((r: any) => r.month_year === m).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const exp = allExpenses.filter((e: any) => e.month_year === m).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      return { month: m, revenue: rev, expense: exp, profit: rev - exp };
    });
  }, [months, allRevenues, allExpenses]);

  const currentMonth = monthlyData[monthlyData.length - 1];
  const prevMonth = monthlyData[monthlyData.length - 2];

  const revChange = prevMonth?.revenue > 0 ? ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100 : 0;
  const expChange = prevMonth?.expense > 0 ? ((currentMonth.expense - prevMonth.expense) / prevMonth.expense) * 100 : 0;
  const profitChange = prevMonth?.profit !== 0 ? ((currentMonth.profit - prevMonth.profit) / Math.abs(prevMonth.profit || 1)) * 100 : 0;

  // Revenue by category
  const revenueByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    const curM = months[months.length - 1];
    allRevenues.filter((r: any) => r.month_year === curM).forEach((r: any) => {
      const cat = r.category || "Other";
      cats[cat] = (cats[cat] || 0) + Number(r.amount || 0);
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [allRevenues, months]);

  // Expense by category
  const expenseByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    const curM = months[months.length - 1];
    allExpenses.filter((e: any) => e.month_year === curM).forEach((e: any) => {
      const cat = e.category || "Other";
      cats[cat] = (cats[cat] || 0) + Number(e.amount || 0);
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [allExpenses, months]);

  // Alerts
  const alerts = useMemo(() => {
    const list: { type: "danger" | "warning" | "info"; message: string }[] = [];

    if (currentMonth.profit < 0) {
      list.push({ type: "danger", message: `Net LOSS of ${fmt(Math.abs(currentMonth.profit))} this month` });
    }
    if (revChange < -10) {
      list.push({ type: "warning", message: `Revenue dropped ${Math.abs(revChange).toFixed(0)}% vs last month` });
    }
    if (expChange > 20) {
      list.push({ type: "warning", message: `Expenses increased ${expChange.toFixed(0)}% vs last month` });
    }

    const overdueInvoices = invoices.filter((i: any) => i.status !== "paid" && i.due_date && new Date(i.due_date) < new Date());
    if (overdueInvoices.length > 0) {
      const overdueTotal = overdueInvoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
      list.push({ type: "danger", message: `${overdueInvoices.length} overdue invoices totaling ${fmt(overdueTotal)}` });
    }

    const pendingPayroll = payrolls.filter((p: any) => p.payment_status === "pending");
    if (pendingPayroll.length > 0) {
      list.push({ type: "warning", message: `${pendingPayroll.length} pending payroll payments` });
    }

    const totalPayroll = payrolls.filter((p: any) => p.payroll_month === months[months.length - 1])
      .reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0);
    if (totalPayroll > 0 && currentMonth.revenue > 0 && (totalPayroll / currentMonth.revenue) > 0.6) {
      list.push({ type: "warning", message: `Payroll is ${((totalPayroll / currentMonth.revenue) * 100).toFixed(0)}% of revenue — high burn` });
    }

    if (list.length === 0) {
      list.push({ type: "info", message: "All financial metrics healthy this month" });
    }

    return list;
  }, [currentMonth, revChange, expChange, invoices, payrolls, months]);

  // Invoice Summary
  const totalInvoiced = invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const paidInvoices = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const collectionRate = totalInvoiced > 0 ? (paidInvoices / totalInvoiced) * 100 : 0;

  const maxProfit = Math.max(...monthlyData.map(m => Math.abs(m.profit)), 1);
  const maxRev = Math.max(...monthlyData.map(m => m.revenue), 1);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white"><Zap className="h-5 w-5" /></div>
          Financial Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Auto-generated insights • Trend analysis • Smart alerts</p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <Card key={i} className={`border-l-4 ${
              alert.type === "danger" ? "border-l-red-500 bg-red-50/50 dark:bg-red-950/20" :
              alert.type === "warning" ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20" :
              "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
            }`}>
              <CardContent className="p-3 flex items-center gap-3">
                {alert.type === "danger" ? <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" /> :
                 alert.type === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" /> :
                 <Activity className="h-4 w-4 text-blue-600 shrink-0" />}
                <span className="text-sm font-medium">{alert.message}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Revenue", value: fmt(currentMonth.revenue), change: pct(revChange), up: revChange >= 0, icon: ArrowUpRight, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Expenses", value: fmt(currentMonth.expense), change: pct(expChange), up: expChange <= 0, icon: ArrowDownRight, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Net P&L", value: fmt(currentMonth.profit), change: pct(profitChange), up: currentMonth.profit >= 0, icon: currentMonth.profit >= 0 ? TrendingUp : TrendingDown, color: currentMonth.profit >= 0 ? "text-emerald-600" : "text-red-600", bg: currentMonth.profit >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30" },
          { label: "Collection Rate", value: `${collectionRate.toFixed(0)}%`, change: `${fmt(paidInvoices)} / ${fmt(totalInvoiced)}`, up: collectionRate >= 70, icon: Target, color: collectionRate >= 70 ? "text-emerald-600" : "text-amber-600", bg: collectionRate >= 70 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-amber-50 dark:bg-amber-950/30" },
        ].map(kpi => (
          <Card key={kpi.label} className={`${kpi.bg} border-none shadow-sm`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><kpi.icon className={`h-4 w-4 ${kpi.color}`} /><span className="text-xs font-medium text-muted-foreground">{kpi.label}</span></div>
              <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className={`text-[10px] mt-1 ${kpi.up ? "text-emerald-600" : "text-red-500"}`}>{kpi.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* 6-Month P&L Trend (text-based chart) */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> 6-Month P&L Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyData.map(m => (
                <div key={m.month} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{format(new Date(`${m.month}-01`), "MMM yy")}</span>
                    <span className={m.profit >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>{fmt(m.profit)}</span>
                  </div>
                  <div className="flex gap-1 h-4">
                    <div className="bg-emerald-200 dark:bg-emerald-800 rounded-sm" style={{ width: `${Math.max((m.revenue / maxRev) * 100, 2)}%` }} title={`Rev: ${fmt(m.revenue)}`} />
                    <div className="bg-red-200 dark:bg-red-800 rounded-sm" style={{ width: `${Math.max((m.expense / maxRev) * 100, 2)}%` }} title={`Exp: ${fmt(m.expense)}`} />
                  </div>
                  <div className="flex gap-4 text-[10px] text-muted-foreground">
                    <span>📈 {fmt(m.revenue)}</span>
                    <span>📉 {fmt(m.expense)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue & Expense Breakdown */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4 text-emerald-600" /> Revenue by Category</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[120px]">
                {revenueByCategory.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No revenue data</p>}
                {revenueByCategory.map(([cat, amount]) => (
                  <div key={cat} className="flex justify-between items-center py-1.5 border-b last:border-0">
                    <span className="text-xs capitalize">{cat}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(amount / (currentMonth.revenue || 1)) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold w-20 text-right">{fmt(amount)}</span>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4 text-red-600" /> Expense by Category</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[120px]">
                {expenseByCategory.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No expense data</p>}
                {expenseByCategory.map(([cat, amount]) => (
                  <div key={cat} className="flex justify-between items-center py-1.5 border-b last:border-0">
                    <span className="text-xs capitalize">{cat}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${(amount / (currentMonth.expense || 1)) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold w-20 text-right">{fmt(amount)}</span>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payroll Summary */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Payroll Cost Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {months.slice(-4).map(m => {
              const monthPayroll = payrolls.filter((p: any) => p.payroll_month === m);
              const total = monthPayroll.reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0);
              const headcount = monthPayroll.length;
              return (
                <div key={m} className="text-center p-3 rounded-lg border">
                  <p className="text-[10px] text-muted-foreground">{format(new Date(`${m}-01`), "MMM yy")}</p>
                  <p className="text-lg font-bold">{fmt(total)}</p>
                  <p className="text-[10px] text-muted-foreground">{headcount} employees</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
