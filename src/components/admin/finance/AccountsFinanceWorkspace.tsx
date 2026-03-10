import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  IndianRupee, TrendingUp, TrendingDown, Wallet, Users, Plus, Search,
  Download, Filter, ArrowUpRight, ArrowDownRight, CreditCard, Receipt,
  PiggyBank, Calculator, CalendarDays, CheckCircle2, Clock, XCircle,
  BarChart3, FileText, Building2
} from "lucide-react";

const REVENUE_CATEGORIES = ["service_revenue", "car_sale", "insurance_commission", "loan_commission", "rental_income", "hsrp_service", "accessory_sale", "other"];
const EXPENSE_CATEGORIES = ["operational", "salary", "rent", "utilities", "marketing", "software", "travel", "maintenance", "legal", "other"];
const PAYMENT_MODES = ["cash", "bank_transfer", "upi", "cheque", "card", "other"];
const MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"];

export const AccountsFinanceWorkspace = ({ initialTab = "overview" }: { initialTab?: string }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showAddDialog, setShowAddDialog] = useState<"revenue" | "expense" | "payout" | "commission" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));

  // Form state
  const [form, setForm] = useState<Record<string, any>>({});
  const resetForm = () => setForm({});

  // ── Queries ──
  const { data: revenues = [] } = useQuery({
    queryKey: ["finance-revenues", filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase.from("revenue_entries").select("*")
        .ilike("month_year", `${filterMonth}%`).order("revenue_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["finance-expenses", filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase.from("expense_entries").select("*")
        .ilike("month_year", `${filterMonth}%`).order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["finance-payouts", filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase.from("payout_records").select("*")
        .eq("payout_month", filterMonth).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["finance-commissions", filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase.from("commission_ledger").select("*")
        .ilike("month_year", `${filterMonth}%`).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // ── Mutations ──
  const addRevenue = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await supabase.from("revenue_entries").insert({
        ...entry,
        month_year: entry.revenue_date?.slice(0, 7) || filterMonth,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["finance-revenues"] }); setShowAddDialog(null); resetForm(); toast.success("Revenue recorded"); },
  });

  const addExpense = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await supabase.from("expense_entries").insert({
        ...entry,
        month_year: entry.expense_date?.slice(0, 7) || filterMonth,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["finance-expenses"] }); setShowAddDialog(null); resetForm(); toast.success("Expense recorded"); },
  });

  const addPayout = useMutation({
    mutationFn: async (entry: any) => {
      const net = (Number(entry.base_amount) || 0) + (Number(entry.bonus_amount) || 0) - (Number(entry.deductions) || 0);
      const { error } = await supabase.from("payout_records").insert({ ...entry, net_amount: net, payout_month: filterMonth });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["finance-payouts"] }); setShowAddDialog(null); resetForm(); toast.success("Payout recorded"); },
  });

  const addCommission = useMutation({
    mutationFn: async (entry: any) => {
      const amt = (Number(entry.deal_value) || 0) * (Number(entry.commission_percentage) || 0) / 100;
      const { error } = await supabase.from("commission_ledger").insert({
        ...entry, commission_amount: amt || Number(entry.commission_amount) || 0, month_year: filterMonth,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["finance-commissions"] }); setShowAddDialog(null); resetForm(); toast.success("Commission recorded"); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ table, id, status }: { table: string; id: string; status: string }) => {
      const { error } = await supabase.from(table as any).update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["finance-payouts"] }); queryClient.invalidateQueries({ queryKey: ["finance-commissions"] }); toast.success("Status updated"); },
  });

  // ── Computed Stats ──
  const totalRevenue = useMemo(() => revenues.reduce((s: number, r: any) => s + Number(r.amount || 0), 0), [revenues]);
  const totalExpenses = useMemo(() => expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0), [expenses]);
  const totalPayouts = useMemo(() => payouts.reduce((s: number, p: any) => s + Number(p.net_amount || 0), 0), [payouts]);
  const totalCommissions = useMemo(() => commissions.reduce((s: number, c: any) => s + Number(c.commission_amount || 0), 0), [commissions]);
  const netProfit = totalRevenue - totalExpenses - totalPayouts - totalCommissions;

  const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

  // Revenue by vertical
  const revenueByVertical = useMemo(() => {
    const map: Record<string, number> = {};
    revenues.forEach((r: any) => { map[r.vertical_name || "general"] = (map[r.vertical_name || "general"] || 0) + Number(r.amount || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [revenues]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white"><IndianRupee className="h-5 w-5" /></div>
            Accounts & Finance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Revenue • Expenses • Payouts • Commissions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{format(new Date(m + "-01"), "MMM yyyy")}</SelectItem>)}</SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 w-[180px]" />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Revenue", value: totalRevenue, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Expenses", value: totalExpenses, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Payouts", value: totalPayouts, icon: Wallet, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
          { label: "Commissions", value: totalCommissions, icon: Calculator, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Net Profit", value: netProfit, icon: PiggyBank, color: netProfit >= 0 ? "text-emerald-700" : "text-red-700", bg: netProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30" },
        ].map(kpi => (
          <Card key={kpi.label} className={`${kpi.bg} border-none shadow-sm`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={`text-lg font-bold ${kpi.color}`}>{fmt(kpi.value)}</p>
              <p className="text-[10px] text-muted-foreground">{format(new Date(filterMonth + "-01"), "MMMM yyyy")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview" className="text-xs">📊 Overview</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs">💰 Revenue</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs">📤 Expenses</TabsTrigger>
          <TabsTrigger value="payouts" className="text-xs">💳 Payouts</TabsTrigger>
          <TabsTrigger value="commissions" className="text-xs">🏆 Commissions</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Revenue by Vertical */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue by Vertical</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {revenueByVertical.length === 0 && <p className="text-xs text-muted-foreground">No revenue entries yet</p>}
                {revenueByVertical.map(([v, amount]) => (
                  <div key={v} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm capitalize">{v.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={(amount / (totalRevenue || 1)) * 100} className="w-20 h-2" />
                      <span className="text-sm font-semibold">{fmt(amount)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Transactions</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[240px]">
                  <div className="space-y-2">
                    {[...revenues.slice(0, 5).map((r: any) => ({ ...r, _type: "revenue" })), ...expenses.slice(0, 5).map((e: any) => ({ ...e, _type: "expense" }))]
                      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 8)
                      .map((t: any) => (
                        <div key={t.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            {t._type === "revenue" ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-red-500" />}
                            <div>
                              <p className="text-sm font-medium truncate max-w-[180px]">{t.description}</p>
                              <p className="text-[10px] text-muted-foreground">{t.category?.replace(/_/g, " ")}</p>
                            </div>
                          </div>
                          <span className={`text-sm font-semibold ${t._type === "revenue" ? "text-emerald-600" : "text-red-600"}`}>
                            {t._type === "revenue" ? "+" : "-"}{fmt(Number(t.amount))}
                          </span>
                        </div>
                      ))}
                    {revenues.length === 0 && expenses.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No transactions yet</p>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* P&L Summary Card */}
          <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none">
            <CardContent className="p-6">
              <h3 className="text-sm font-medium opacity-80 mb-4">Profit & Loss Summary — {format(new Date(filterMonth + "-01"), "MMMM yyyy")}</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div><p className="text-[10px] opacity-60">Gross Revenue</p><p className="text-xl font-bold text-emerald-400">{fmt(totalRevenue)}</p></div>
                <div><p className="text-[10px] opacity-60">Total Expenses</p><p className="text-xl font-bold text-red-400">{fmt(totalExpenses)}</p></div>
                <div><p className="text-[10px] opacity-60">Team Payouts</p><p className="text-xl font-bold text-orange-400">{fmt(totalPayouts)}</p></div>
                <div><p className="text-[10px] opacity-60">Commissions</p><p className="text-xl font-bold text-blue-400">{fmt(totalCommissions)}</p></div>
                <div><p className="text-[10px] opacity-60">Net Profit</p><p className={`text-xl font-bold ${netProfit >= 0 ? "text-emerald-300" : "text-red-300"}`}>{fmt(netProfit)}</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REVENUE TAB */}
        <TabsContent value="revenue" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Revenue Entries</h3>
            <Button size="sm" onClick={() => { resetForm(); setShowAddDialog("revenue"); }}><Plus className="h-4 w-4 mr-1" /> Add Revenue</Button>
          </div>
          <div className="space-y-2">
            {revenues.filter((r: any) => !searchQuery || r.description?.toLowerCase().includes(searchQuery.toLowerCase())).map((r: any) => (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30"><ArrowUpRight className="h-4 w-4 text-emerald-600" /></div>
                    <div>
                      <p className="font-medium text-sm">{r.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px]">{r.category?.replace(/_/g, " ")}</Badge>
                        <Badge variant="outline" className="text-[10px]">{r.vertical_name}</Badge>
                        {r.client_name && <span className="text-[10px] text-muted-foreground">• {r.client_name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{fmt(Number(r.amount))}</p>
                    <p className="text-[10px] text-muted-foreground">{r.revenue_date} • {r.payment_mode}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {revenues.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">No revenue entries for this month</p>}
          </div>
        </TabsContent>

        {/* EXPENSES TAB */}
        <TabsContent value="expenses" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-600" /> Expense Entries</h3>
            <Button size="sm" onClick={() => { resetForm(); setShowAddDialog("expense"); }}><Plus className="h-4 w-4 mr-1" /> Add Expense</Button>
          </div>
          <div className="space-y-2">
            {expenses.filter((e: any) => !searchQuery || e.description?.toLowerCase().includes(searchQuery.toLowerCase())).map((e: any) => (
              <Card key={e.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30"><ArrowDownRight className="h-4 w-4 text-red-600" /></div>
                    <div>
                      <p className="font-medium text-sm">{e.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px]">{e.category}</Badge>
                        <Badge variant={e.status === "approved" ? "default" : "outline"} className="text-[10px]">{e.status}</Badge>
                        {e.paid_to && <span className="text-[10px] text-muted-foreground">→ {e.paid_to}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{fmt(Number(e.amount))}</p>
                    <p className="text-[10px] text-muted-foreground">{e.expense_date} • {e.payment_mode}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {expenses.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">No expense entries for this month</p>}
          </div>
        </TabsContent>

        {/* PAYOUTS TAB */}
        <TabsContent value="payouts" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2"><Wallet className="h-4 w-4 text-orange-600" /> Team Payouts</h3>
            <Button size="sm" onClick={() => { resetForm(); setShowAddDialog("payout"); }}><Plus className="h-4 w-4 mr-1" /> Add Payout</Button>
          </div>
          <div className="space-y-2">
            {payouts.map((p: any) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30"><Users className="h-4 w-4 text-orange-600" /></div>
                    <div>
                      <p className="font-medium text-sm">{p.team_member_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px]">{p.payout_type}</Badge>
                        <Badge variant={p.status === "paid" ? "default" : p.status === "approved" ? "secondary" : "outline"} className="text-[10px]">
                          {p.status === "paid" ? <><CheckCircle2 className="h-3 w-3 mr-0.5" /> Paid</> : p.status === "approved" ? <><Clock className="h-3 w-3 mr-0.5" /> Approved</> : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="font-bold text-orange-600">{fmt(Number(p.net_amount))}</p>
                      <p className="text-[10px] text-muted-foreground">Base: {fmt(Number(p.base_amount))} {Number(p.bonus_amount) > 0 && `+ ₹${p.bonus_amount}`}</p>
                    </div>
                    {p.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ table: "payout_records", id: p.id, status: "approved" })}>Approve</Button>
                    )}
                    {p.status === "approved" && (
                      <Button size="sm" onClick={() => updateStatus.mutate({ table: "payout_records", id: p.id, status: "paid" })}>Mark Paid</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {payouts.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">No payouts for this month</p>}
          </div>
        </TabsContent>

        {/* COMMISSIONS TAB */}
        <TabsContent value="commissions" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2"><Calculator className="h-4 w-4 text-blue-600" /> Commissions</h3>
            <Button size="sm" onClick={() => { resetForm(); setShowAddDialog("commission"); }}><Plus className="h-4 w-4 mr-1" /> Add Commission</Button>
          </div>
          <div className="space-y-2">
            {commissions.map((c: any) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30"><Calculator className="h-4 w-4 text-blue-600" /></div>
                    <div>
                      <p className="font-medium text-sm">{c.team_member_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="text-[10px]">{c.vertical_name}</Badge>
                        {c.deal_reference && <span className="text-[10px] text-muted-foreground">Deal: {c.deal_reference}</span>}
                        <Badge variant={c.status === "paid" ? "default" : "outline"} className="text-[10px]">{c.status}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="font-bold text-blue-600">{fmt(Number(c.commission_amount))}</p>
                      <p className="text-[10px] text-muted-foreground">{c.commission_percentage}% of {fmt(Number(c.deal_value))}</p>
                    </div>
                    {c.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ table: "commission_ledger", id: c.id, status: "approved" })}>Approve</Button>
                    )}
                    {c.status === "approved" && (
                      <Button size="sm" onClick={() => updateStatus.mutate({ table: "commission_ledger", id: c.id, status: "paid" })}>Pay</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {commissions.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">No commissions for this month</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ ADD DIALOGS ═══ */}

      {/* Revenue Dialog */}
      <Dialog open={showAddDialog === "revenue"} onOpenChange={() => setShowAddDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-600" /> Add Revenue</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Description *" value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Amount *" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              <Input type="date" value={form.revenue_date || format(new Date(), "yyyy-MM-dd")} onChange={e => setForm(f => ({ ...f, revenue_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.category || "service_revenue"} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REVENUE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.payment_mode || "cash"} onValueChange={v => setForm(f => ({ ...f, payment_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input placeholder="Vertical (e.g. sales, insurance)" value={form.vertical_name || ""} onChange={e => setForm(f => ({ ...f, vertical_name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Client Name" value={form.client_name || ""} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
              <Input placeholder="Client Phone" value={form.client_phone || ""} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} />
            </div>
            <Input placeholder="Reference / Invoice No" value={form.reference_number || ""} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} />
            <Textarea placeholder="Notes" value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(null)}>Cancel</Button>
            <Button disabled={!form.description || !form.amount} onClick={() => addRevenue.mutate({ ...form, amount: Number(form.amount), revenue_date: form.revenue_date || format(new Date(), "yyyy-MM-dd") })}>
              Save Revenue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={showAddDialog === "expense"} onOpenChange={() => setShowAddDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-600" /> Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Description *" value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Amount *" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              <Input type="date" value={form.expense_date || format(new Date(), "yyyy-MM-dd")} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.category || "operational"} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.payment_mode || "cash"} onValueChange={v => setForm(f => ({ ...f, payment_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input placeholder="Paid To" value={form.paid_to || ""} onChange={e => setForm(f => ({ ...f, paid_to: e.target.value }))} />
            <Input placeholder="Reference No" value={form.reference_number || ""} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} />
            <Textarea placeholder="Notes" value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(null)}>Cancel</Button>
            <Button disabled={!form.description || !form.amount} onClick={() => addExpense.mutate({ ...form, amount: Number(form.amount), expense_date: form.expense_date || format(new Date(), "yyyy-MM-dd") })}>
              Save Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout Dialog */}
      <Dialog open={showAddDialog === "payout"} onOpenChange={() => setShowAddDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-orange-600" /> Add Payout</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Team Member Name *" value={form.team_member_name || ""} onChange={e => setForm(f => ({ ...f, team_member_name: e.target.value }))} />
            <Input placeholder="Phone" value={form.team_member_phone || ""} onChange={e => setForm(f => ({ ...f, team_member_phone: e.target.value }))} />
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" placeholder="Base Amount" value={form.base_amount || ""} onChange={e => setForm(f => ({ ...f, base_amount: e.target.value }))} />
              <Input type="number" placeholder="Bonus" value={form.bonus_amount || ""} onChange={e => setForm(f => ({ ...f, bonus_amount: e.target.value }))} />
              <Input type="number" placeholder="Deductions" value={form.deductions || ""} onChange={e => setForm(f => ({ ...f, deductions: e.target.value }))} />
            </div>
            <div className="text-right text-sm font-semibold text-orange-600">
              Net: {fmt((Number(form.base_amount) || 0) + (Number(form.bonus_amount) || 0) - (Number(form.deductions) || 0))}
            </div>
            <Select value={form.payout_type || "salary"} onValueChange={v => setForm(f => ({ ...f, payout_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="salary">Salary</SelectItem>
                <SelectItem value="bonus">Bonus</SelectItem>
                <SelectItem value="incentive">Incentive</SelectItem>
                <SelectItem value="reimbursement">Reimbursement</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.payment_mode || "bank_transfer"} onValueChange={v => setForm(f => ({ ...f, payment_mode: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea placeholder="Notes" value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(null)}>Cancel</Button>
            <Button disabled={!form.team_member_name} onClick={() => addPayout.mutate(form)}>Save Payout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commission Dialog */}
      <Dialog open={showAddDialog === "commission"} onOpenChange={() => setShowAddDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-blue-600" /> Add Commission</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Team Member Name *" value={form.team_member_name || ""} onChange={e => setForm(f => ({ ...f, team_member_name: e.target.value }))} />
            <Input placeholder="Vertical *" value={form.vertical_name || ""} onChange={e => setForm(f => ({ ...f, vertical_name: e.target.value }))} />
            <Input placeholder="Deal Reference" value={form.deal_reference || ""} onChange={e => setForm(f => ({ ...f, deal_reference: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Deal Value" value={form.deal_value || ""} onChange={e => setForm(f => ({ ...f, deal_value: e.target.value }))} />
              <Input type="number" placeholder="Commission %" value={form.commission_percentage || ""} onChange={e => setForm(f => ({ ...f, commission_percentage: e.target.value }))} />
            </div>
            <div className="text-right text-sm font-semibold text-blue-600">
              Commission: {fmt((Number(form.deal_value) || 0) * (Number(form.commission_percentage) || 0) / 100)}
            </div>
            <Textarea placeholder="Notes" value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(null)}>Cancel</Button>
            <Button disabled={!form.team_member_name || !form.vertical_name} onClick={() => addCommission.mutate(form)}>Save Commission</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
