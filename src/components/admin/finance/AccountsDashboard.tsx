import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, IndianRupee, FileText, Receipt, ArrowUpRight, ArrowDownRight } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

export const AccountsDashboard = () => {
  const { data: invoices = [] } = useQuery({
    queryKey: ["acc-invoices"],
    queryFn: async () => { const { data } = await supabase.from("invoices").select("*").order("invoice_date", { ascending: false }); return data || []; },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["acc-expenses"],
    queryFn: async () => { const { data } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false }); return data || []; },
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["acc-bills"],
    queryFn: async () => { const { data } = await (supabase.from("bills") as any).select("*").order("bill_date", { ascending: false }); return data || []; },
  });

  const { data: payrolls = [] } = useQuery({
    queryKey: ["acc-payrolls"],
    queryFn: async () => { const { data } = await supabase.from("payroll_records").select("*"); return data || []; },
  });

  const { data: paymentsReceived = [] } = useQuery({
    queryKey: ["acc-payments-received-dash"],
    queryFn: async () => { const { data } = await (supabase.from("payment_received") as any).select("*").order("payment_date", { ascending: false }); return data || []; },
  });

  const totalReceivable = invoices.filter((i: any) => i.status !== "paid").reduce((s: number, i: any) => s + Number(i.balance_due || i.total_amount || 0), 0);
  const totalPayable = bills.filter((b: any) => b.status !== "paid").reduce((s: number, b: any) => s + Number(b.balance_due || b.total_amount || 0), 0);
  const totalRevenue = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const totalPayroll = payrolls.reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0);
  const totalPaymentsIn = paymentsReceived.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses - totalPayroll;

  // Monthly data for charts
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; revenue: number; expenses: number; profit: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM");
      months[key] = { month: label, revenue: 0, expenses: 0, profit: 0 };
    }
    invoices.filter((i: any) => i.status === "paid").forEach((i: any) => {
      const key = i.invoice_date?.substring(0, 7);
      if (months[key]) months[key].revenue += Number(i.total_amount || 0);
    });
    expenses.forEach((e: any) => {
      const key = e.expense_date?.substring(0, 7);
      if (months[key]) months[key].expenses += Number(e.amount || 0);
    });
    Object.values(months).forEach(m => { m.profit = m.revenue - m.expenses; });
    return Object.values(months);
  }, [invoices, expenses]);

  // Expense by category
  const expenseByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach((e: any) => { cats[e.expense_type || "Other"] = (cats[e.expense_type || "Other"] || 0) + Number(e.amount || 0); });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Revenue by vertical
  const revenueByVertical = useMemo(() => {
    const verts: Record<string, number> = {};
    invoices.filter((i: any) => i.status === "paid").forEach((i: any) => { verts[i.vertical_name || "General"] = (verts[i.vertical_name || "General"] || 0) + Number(i.total_amount || 0); });
    return Object.entries(verts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [invoices]);

  const overdueInvoices = invoices.filter((i: any) => i.status !== "paid" && i.due_date && new Date(i.due_date) < new Date());
  const overdueBills = bills.filter((b: any) => b.status !== "paid" && b.due_date && new Date(b.due_date) < new Date());

  return (
    <div className="space-y-6">
      {/* Top Stats - Zoho Books style */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-green-700">{fmt(totalRevenue)}</p>
          <div className="flex items-center gap-1 mt-1"><ArrowUpRight className="h-3 w-3 text-green-500" /><span className="text-xs text-green-600">{invoices.filter((i: any) => i.status === "paid").length} paid</span></div>
        </CardContent></Card>

        <Card className="border-l-4 border-l-red-500"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
          <p className="text-xl font-bold text-red-700">{fmt(totalExpenses + totalPayroll)}</p>
          <div className="flex items-center gap-1 mt-1"><ArrowDownRight className="h-3 w-3 text-red-500" /><span className="text-xs text-red-600">incl. payroll</span></div>
        </CardContent></Card>

        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
          <p className={`text-xl font-bold ${netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(netProfit)}</p>
          <div className="flex items-center gap-1 mt-1">{netProfit >= 0 ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}</div>
        </CardContent></Card>

        <Card className="border-l-4 border-l-orange-500"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Receivables</p>
          <p className="text-xl font-bold text-orange-700">{fmt(totalReceivable)}</p>
          <span className="text-xs text-muted-foreground">{invoices.filter((i: any) => i.status !== "paid").length} unpaid</span>
        </CardContent></Card>

        <Card className="border-l-4 border-l-purple-500"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Payables</p>
          <p className="text-xl font-bold text-purple-700">{fmt(totalPayable)}</p>
          <span className="text-xs text-muted-foreground">{bills.filter((b: any) => b.status !== "paid").length} unpaid</span>
        </CardContent></Card>

        <Card className="border-l-4 border-l-yellow-500"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Overdue</p>
          <p className="text-xl font-bold text-yellow-700">{overdueInvoices.length + overdueBills.length}</p>
          <span className="text-xs text-muted-foreground">{overdueInvoices.length} inv / {overdueBills.length} bills</span>
        </CardContent></Card>
      </div>

      {/* Alerts */}
      {(overdueInvoices.length > 0 || overdueBills.length > 0) && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-400">Attention Required</p>
              <div className="text-sm text-yellow-700 dark:text-yellow-500 space-y-1 mt-1">
                {overdueInvoices.length > 0 && <p>• {overdueInvoices.length} overdue invoices worth {fmt(overdueInvoices.reduce((s: number, i: any) => s + Number(i.balance_due || i.total_amount || 0), 0))}</p>}
                {overdueBills.length > 0 && <p>• {overdueBills.length} overdue bills worth {fmt(overdueBills.reduce((s: number, b: any) => s + Number(b.balance_due || b.total_amount || 0), 0))}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue vs Expenses (6 Months)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} /><Tooltip formatter={(v: number) => fmt(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#ef444420" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Profit Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} /><Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]}>{monthlyData.map((entry, i) => <Cell key={i} fill={entry.profit >= 0 ? "#10b981" : "#ef4444"} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Expense Categories</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={expenseByCategory} cx="50%" cy="50%" outerRadius={100} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} dataKey="value">
                {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip formatter={(v: number) => fmt(v)} /></PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue by Vertical</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByVertical} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} /><YAxis type="category" dataKey="name" width={100} fontSize={11} /><Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Recent Invoices</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices.slice(0, 5).map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{inv.client_name}</p>
                    <p className="text-xs text-muted-foreground">{inv.invoice_number} • {inv.invoice_date ? format(new Date(inv.invoice_date), "dd MMM") : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{fmt(inv.total_amount)}</p>
                    <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="text-xs">{inv.status}</Badge>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && <p className="text-center text-muted-foreground py-4">No invoices</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" /> Recent Expenses</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenses.slice(0, 5).map((exp: any) => (
                <div key={exp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{exp.description || exp.expense_type}</p>
                    <p className="text-xs text-muted-foreground">{exp.vertical_name} • {exp.expense_date ? format(new Date(exp.expense_date), "dd MMM") : ""}</p>
                  </div>
                  <p className="text-sm font-medium text-red-600">{fmt(exp.amount)}</p>
                </div>
              ))}
              {expenses.length === 0 && <p className="text-center text-muted-foreground py-4">No expenses</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountsDashboard;
