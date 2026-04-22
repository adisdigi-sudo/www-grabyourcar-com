import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, subWeeks, startOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, AlertTriangle, IndianRupee,
  ArrowUpRight, ArrowDownRight, BarChart3, PieChart,
  Target, Zap, ShieldAlert, Activity, History
} from "lucide-react";

const fmt = (v: number) => `Rs. ${Math.round(v).toLocaleString("en-IN")}`;
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

type PeriodMode = "weekly" | "monthly" | "till_date";

interface BucketData {
  key: string;
  label: string;
  revenue: number;
  expense: number;
  profit: number;
  _revBreakdown?: Record<string, number>;
  _expBreakdown?: Record<string, number>;
}

const monthKey = (d: string | Date | null | undefined): string | null => {
  if (!d) return null;
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (isNaN(dt.getTime())) return null;
    return format(dt, "yyyy-MM");
  } catch { return null; }
};

const weekKey = (d: string | Date | null | undefined): string | null => {
  if (!d) return null;
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (isNaN(dt.getTime())) return null;
    return format(startOfWeek(dt, { weekStartsOn: 1 }), "yyyy-MM-dd");
  } catch { return null; }
};

export const FinancialIntelligenceDashboard = () => {
  const [periodMode, setPeriodMode] = useState<PeriodMode>("monthly");

  const lookbackMonths = periodMode === "till_date" ? 24 : 6;
  const buckets = useMemo(() => {
    if (periodMode === "weekly") {
      return Array.from({ length: 12 }, (_, i) =>
        format(startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 }), "yyyy-MM-dd")
      ).reverse();
    }
    return Array.from({ length: lookbackMonths }, (_, i) =>
      format(subMonths(new Date(), i), "yyyy-MM")
    ).reverse();
  }, [periodMode, lookbackMonths]);
  const startDate = periodMode === "weekly"
    ? buckets[0]
    : `${buckets[0]}-01`;

  // ── LIVE REVENUE SOURCES (paid/received only)
  const { data: invoices = [] } = useQuery({
    queryKey: ["fi-invoices", startDate],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices")
        .select("total_amount, status, due_date, invoice_date, paid_at, vertical_name, amount_paid, balance_due")
        .gte("invoice_date", startDate);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["fi-payments", startDate],
    queryFn: async () => {
      const { data, error } = await (supabase.from("payment_received") as any)
        .select("amount, payment_date, notes, invoice_number")
        .gte("payment_date", startDate);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["fi-deals", startDate],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals")
        .select("payment_received_amount, payment_status, closed_at, created_at, vertical_name")
        .eq("payment_status", "received")
        .gte("created_at", startDate);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: hsrp = [] } = useQuery({
    queryKey: ["fi-hsrp", startDate],
    queryFn: async () => {
      const { data, error } = await supabase.from("hsrp_bookings")
        .select("payment_amount, service_price, payment_status, created_at")
        .eq("payment_status", "paid")
        .gte("created_at", startDate);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: accessory = [] } = useQuery({
    queryKey: ["fi-accessory", startDate],
    queryFn: async () => {
      const { data, error } = await supabase.from("accessory_orders")
        .select("total_amount, payment_status, created_at")
        .eq("payment_status", "paid")
        .gte("created_at", startDate);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: rentals = [] } = useQuery({
    queryKey: ["fi-rentals", startDate],
    queryFn: async () => {
      const { data, error } = await (supabase.from("rental_bookings") as any)
        .select("total_amount, payment_status, created_at")
        .eq("payment_status", "paid")
        .gte("created_at", startDate);
      if (error) throw error;
      return data || [];
    },
  });

  // ── EXPENSES — payroll + (refunds = debit payments)
  const { data: payrolls = [] } = useQuery({
    queryKey: ["fi-payroll-summary"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("payroll_records") as any)
        .select("net_salary, gross_salary, payroll_month, payment_status");
      if (error) throw error;
      return data || [];
    },
  });

  // Resolve which key fn to use based on period
  const keyFn = periodMode === "weekly" ? weekKey : monthKey;
  const labelFn = (k: string) =>
    periodMode === "weekly"
      ? `W/o ${format(new Date(k), "dd MMM")}`
      : format(new Date(`${k}-01`), "MMM yy");

  const bucketData: BucketData[] = useMemo(() => {
    return buckets.map(b => {
      let rev = 0;
      const revBreakdown: Record<string, number> = {};
      const add = (cat: string, amount: number) => {
        rev += amount;
        revBreakdown[cat] = (revBreakdown[cat] || 0) + amount;
      };
      invoices
        .filter((i: any) => i.status === "paid" && keyFn(i.paid_at || i.invoice_date) === b)
        .forEach((i: any) => add(i.vertical_name || "Invoiced", Number(i.total_amount || 0)));
      payments
        .filter((p: any) => !p.invoice_number && keyFn(p.payment_date) === b && !/^\[DEBIT\]/i.test(String(p.notes || "")))
        .forEach((p: any) => add("Direct Payments", Number(p.amount || 0)));
      deals
        .filter((d: any) => keyFn(d.closed_at || d.created_at) === b)
        .forEach((d: any) => add(d.vertical_name || "Deals", Number(d.payment_received_amount || 0)));
      hsrp
        .filter((h: any) => keyFn(h.created_at) === b)
        .forEach((h: any) => add("HSRP", Number(h.payment_amount || h.service_price || 0)));
      accessory
        .filter((a: any) => keyFn(a.created_at) === b)
        .forEach((a: any) => add("Accessories", Number(a.total_amount || 0)));
      rentals
        .filter((r: any) => keyFn(r.created_at) === b)
        .forEach((r: any) => add("Self Drive", Number(r.total_amount || 0)));

      let exp = 0;
      const expBreakdown: Record<string, number> = {};
      // Payroll only aligns to months — for weekly view, distribute monthly payroll evenly
      if (periodMode === "weekly") {
        const m = format(new Date(b), "yyyy-MM");
        const monthPayroll = payrolls
          .filter((p: any) => p.payroll_month === m)
          .reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0);
        const weeklyShare = monthPayroll / 4;
        if (weeklyShare > 0) { exp += weeklyShare; expBreakdown["Payroll (1/4 mo)"] = weeklyShare; }
      } else {
        const monthPayroll = payrolls
          .filter((p: any) => p.payroll_month === b)
          .reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0);
        if (monthPayroll > 0) { exp += monthPayroll; expBreakdown["Payroll"] = monthPayroll; }
      }

      const refunds = payments
        .filter((p: any) => keyFn(p.payment_date) === b && /^\[DEBIT\]/i.test(String(p.notes || "")))
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      if (refunds > 0) { exp += refunds; expBreakdown["Refunds"] = refunds; }

      return { key: b, label: labelFn(b), revenue: rev, expense: exp, profit: rev - exp, _revBreakdown: revBreakdown, _expBreakdown: expBreakdown };
    });
  }, [buckets, periodMode, invoices, payments, deals, hsrp, accessory, rentals, payrolls]);

  const currentMonth = bucketData[bucketData.length - 1] || { key: "", label: "", revenue: 0, expense: 0, profit: 0 };
  const prevMonth = bucketData[bucketData.length - 2];

  // Cumulative till-date totals across the active bucket window
  const tillDate = useMemo(() => {
    const rev = bucketData.reduce((s, b) => s + b.revenue, 0);
    const exp = bucketData.reduce((s, b) => s + b.expense, 0);
    return { revenue: rev, expense: exp, profit: rev - exp };
  }, [bucketData]);

  // (currentMonth/prevMonth resolved above from bucketData)

  const revChange = prevMonth?.revenue > 0 ? ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100 : 0;
  const expChange = prevMonth?.expense > 0 ? ((currentMonth.expense - prevMonth.expense) / prevMonth.expense) * 100 : 0;
  const profitChange = prevMonth?.profit !== 0 ? ((currentMonth.profit - prevMonth.profit) / Math.abs(prevMonth.profit || 1)) * 100 : 0;

  const revenueByCategory = useMemo(() => {
    const cats = (currentMonth as any)._revBreakdown || {};
    return Object.entries(cats).sort((a: any, b: any) => b[1] - a[1]) as [string, number][];
  }, [currentMonth]);

  const expenseByCategory = useMemo(() => {
    const cats = (currentMonth as any)._expBreakdown || {};
    return Object.entries(cats).sort((a: any, b: any) => b[1] - a[1]) as [string, number][];
  }, [currentMonth]);

  const alerts = useMemo(() => {
    const list: { type: "danger" | "warning" | "info"; message: string }[] = [];
    if (currentMonth.profit < 0) list.push({ type: "danger", message: `Net LOSS of ${fmt(Math.abs(currentMonth.profit))} this month` });
    if (revChange < -10) list.push({ type: "warning", message: `Revenue dropped ${Math.abs(revChange).toFixed(0)}% vs last month` });
    if (expChange > 20) list.push({ type: "warning", message: `Expenses increased ${expChange.toFixed(0)}% vs last month` });

    const overdue = invoices.filter((i: any) => i.status !== "paid" && i.due_date && new Date(i.due_date) < new Date());
    if (overdue.length > 0) {
      const total = overdue.reduce((s: number, i: any) => s + Number(i.balance_due || i.total_amount || 0), 0);
      list.push({ type: "danger", message: `${overdue.length} overdue invoice(s) totaling ${fmt(total)}` });
    }
    const pendingPayroll = payrolls.filter((p: any) => p.payment_status === "pending");
    if (pendingPayroll.length > 0) list.push({ type: "warning", message: `${pendingPayroll.length} pending payroll payments` });

    if (list.length === 0) list.push({ type: "info", message: "All financial metrics healthy this month" });
    return list;
  }, [currentMonth, revChange, expChange, invoices, payrolls]);

  const totalInvoiced = invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const paidInvoices = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const collectionRate = totalInvoiced > 0 ? (paidInvoices / totalInvoiced) * 100 : 0;

  const maxRev = Math.max(...bucketData.map(m => Math.max(m.revenue, m.expense)), 1);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white"><Zap className="h-5 w-5" /></div>
          Financial Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Live data from invoices • payments • deals • bookings • payroll</p>
      </div>

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
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> 6-Month P&L Trend (Live)</CardTitle></CardHeader>
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

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4 text-emerald-600" /> Revenue by Source (this month)</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[120px]">
                {revenueByCategory.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No revenue this month</p>}
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
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PieChart className="h-4 w-4 text-red-600" /> Expense Breakdown</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[120px]">
                {expenseByCategory.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No expenses recorded</p>}
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
