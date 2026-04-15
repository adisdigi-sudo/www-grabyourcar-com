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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  IndianRupee, TrendingUp, TrendingDown, Plus,
  Download, Receipt, BookOpen, ArrowUpRight,
  ArrowDownRight, CheckCircle2, Clock, Building2
} from "lucide-react";

const fmt = (v: number) => `Rs. ${Math.round(v).toLocaleString("en-IN")}`;

export const AccountsDeepWorkspace = ({ initialTab = "overview" }: { initialTab?: string }) => {
  const qc = useQueryClient();
  const [tab, setTab] = useState(initialTab);
  const [showDialog, setShowDialog] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [filterMonth, setFilterMonth] = useState(format(new Date(), "yyyy-MM"));
  const resetForm = () => setForm({});

  // ── Queries ──
  const { data: accounts = [] } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_of_accounts").select("*").order("account_code");
      if (error) throw error;
      return data;
    },
  });

  const { data: journals = [] } = useQuery({
    queryKey: ["journal-entries", filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase.from("journal_entries").select("*, journal_entry_lines(*)")
        .gte("entry_date", `${filterMonth}-01`).lte("entry_date", `${filterMonth}-31`).order("entry_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", filterMonth],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*")
        .gte("invoice_date", `${filterMonth}-01`).lte("invoice_date", `${filterMonth}-31`).order("invoice_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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

  // ── Computed ──
  const totalRevenue = revenues.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const totalExpense = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const netPL = totalRevenue - totalExpense;
  const totalInvoiced = invoices.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const paidInvoices = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const pendingInvoices = totalInvoiced - paidInvoices;

  // ── Balance Sheet Computation ──
  const balanceSheet = useMemo(() => {
    const totalAssets = accounts.filter((a: any) => a.account_type === "asset").reduce((s: number, a: any) => s + Number(a.current_balance || 0), 0);
    const totalLiabilities = accounts.filter((a: any) => a.account_type === "liability").reduce((s: number, a: any) => s + Number(a.current_balance || 0), 0);
    const totalEquity = accounts.filter((a: any) => a.account_type === "equity").reduce((s: number, a: any) => s + Number(a.current_balance || 0), 0);
    return { totalAssets, totalLiabilities, totalEquity, balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 };
  }, [accounts]);

  // ── Mutations ──
  const addJournal = useMutation({
    mutationFn: async (entry: any) => {
      const { data, error } = await supabase.from("journal_entries").insert({
        entry_number: entry.entry_number || `JE-${Date.now().toString(36).toUpperCase()}`,
        entry_date: entry.entry_date || format(new Date(), "yyyy-MM-dd"),
        reference_number: entry.reference_number,
        description: entry.description,
        narration: entry.narration,
        status: "posted",
      } as any).select().single();
      if (error) throw error;

      const lines = [
        { journal_entry_id: data.id, account_id: entry.debit_account, debit_amount: Number(entry.amount), credit_amount: 0, description: entry.description },
        { journal_entry_id: data.id, account_id: entry.credit_account, debit_amount: 0, credit_amount: Number(entry.amount), description: entry.description },
      ];
      const { error: lineErr } = await supabase.from("journal_entry_lines").insert(lines);
      if (lineErr) throw lineErr;

      // Update account balances
      const amt = Number(entry.amount);
      const debitAcct = accounts.find((a: any) => a.id === entry.debit_account);
      const creditAcct = accounts.find((a: any) => a.id === entry.credit_account);
      if (debitAcct) {
        const newBal = debitAcct.normal_side === "debit" 
          ? Number(debitAcct.current_balance || 0) + amt 
          : Number(debitAcct.current_balance || 0) - amt;
        await supabase.from("chart_of_accounts").update({ current_balance: newBal } as any).eq("id", debitAcct.id);
      }
      if (creditAcct) {
        const newBal = creditAcct.normal_side === "credit" 
          ? Number(creditAcct.current_balance || 0) + amt 
          : Number(creditAcct.current_balance || 0) - amt;
        await supabase.from("chart_of_accounts").update({ current_balance: newBal } as any).eq("id", creditAcct.id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["journal-entries"] }); qc.invalidateQueries({ queryKey: ["chart-of-accounts"] }); setShowDialog(null); resetForm(); toast.success("Journal entry posted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addRevenue = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await supabase.from("revenue_entries").insert({
        description: entry.description,
        amount: Number(entry.amount),
        category: entry.category || "general",
        revenue_date: entry.revenue_date || format(new Date(), "yyyy-MM-dd"),
        payment_method: entry.payment_method || "bank_transfer",
        reference_number: entry.reference_number,
        vertical: entry.vertical,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-revenues"] }); setShowDialog(null); resetForm(); toast.success("Revenue recorded"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addExpense = useMutation({
    mutationFn: async (entry: any) => {
      const { error } = await supabase.from("expense_entries").insert({
        description: entry.description,
        amount: Number(entry.amount),
        category: entry.category || "general",
        expense_date: entry.expense_date || format(new Date(), "yyyy-MM-dd"),
        payment_method: entry.payment_method || "bank_transfer",
        vendor_name: entry.vendor_name,
        reference_number: entry.reference_number,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance-expenses"] }); setShowDialog(null); resetForm(); toast.success("Expense recorded"); },
    onError: (e: any) => toast.error(e.message),
  });

  const addInvoice = useMutation({
    mutationFn: async (entry: any) => {
      const subtotal = Number(entry.amount);
      const taxRate = Number(entry.tax_rate || 18) / 100;
      const taxAmount = subtotal * taxRate;
      const discount = Number(entry.discount || 0);
      const total = subtotal + taxAmount - discount;

      const { error } = await supabase.from("invoices").insert({
        invoice_number: entry.invoice_number || `INV-${Date.now().toString(36).toUpperCase()}`,
        invoice_date: entry.invoice_date || format(new Date(), "yyyy-MM-dd"),
        due_date: entry.due_date,
        client_name: entry.client_name,
        client_phone: entry.client_phone,
        client_email: entry.client_email,
        client_address: entry.client_address,
        gstin: entry.gstin,
        description: entry.description,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discount,
        total_amount: total,
        balance_due: total,
        status: "pending",
        invoice_type: entry.invoice_type || "service",
        vertical_name: entry.vertical_name,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); setShowDialog(null); resetForm(); toast.success("Invoice created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateInvoiceStatus = useMutation({
    mutationFn: async ({ id, status, amount_paid }: { id: string; status: string; amount_paid?: number }) => {
      const inv = invoices.find((i: any) => i.id === id);
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === "paid") {
        updates.paid_at = new Date().toISOString();
        updates.amount_paid = inv?.total_amount || 0;
        updates.balance_due = 0;
      } else if (amount_paid !== undefined) {
        updates.amount_paid = amount_paid;
        updates.balance_due = Number(inv?.total_amount || 0) - amount_paid;
      }
      const { error } = await supabase.from("invoices").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success("Invoice updated"); },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white"><IndianRupee className="h-5 w-5" /></div>
            Accounts & Finance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Tally-style Double Entry • Invoices • P&L • Balance Sheet</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const m = format(new Date(2026, i, 1), "yyyy-MM");
                return <SelectItem key={m} value={m}>{format(new Date(2026, i, 1), "MMM yyyy")}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Revenue", value: fmt(totalRevenue), icon: ArrowUpRight, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Expenses", value: fmt(totalExpense), icon: ArrowDownRight, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
          { label: "Net P&L", value: fmt(netPL), icon: netPL >= 0 ? TrendingUp : TrendingDown, color: netPL >= 0 ? "text-emerald-600" : "text-red-600", bg: netPL >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30" },
          { label: "Invoiced", value: fmt(totalInvoiced), icon: Receipt, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Pending", value: fmt(pendingInvoices), icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
        ].map(kpi => (
          <Card key={kpi.label} className={`${kpi.bg} border-none shadow-sm`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><kpi.icon className={`h-4 w-4 ${kpi.color}`} /><span className="text-xs font-medium text-muted-foreground">{kpi.label}</span></div>
              <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview" className="text-xs">📊 P&L</TabsTrigger>
          <TabsTrigger value="journal" className="text-xs">📒 Journal</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs">🧾 Invoices</TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs">📖 Ledger</TabsTrigger>
          <TabsTrigger value="balance-sheet" className="text-xs">📋 Balance Sheet</TabsTrigger>
          <TabsTrigger value="reconciliation" className="text-xs">🏦 Bank</TabsTrigger>
        </TabsList>

        {/* ── P&L OVERVIEW ── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => { resetForm(); setShowDialog("revenue"); }}><Plus className="h-3 w-3 mr-1" /> Revenue</Button>
            <Button size="sm" variant="outline" onClick={() => { resetForm(); setShowDialog("expense"); }}><Plus className="h-3 w-3 mr-1" /> Expense</Button>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Profit & Loss Statement — {format(new Date(`${filterMonth}-01`), "MMMM yyyy")}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-semibold text-sm text-emerald-700">INCOME</span>
                  <span className="font-bold text-emerald-700">{fmt(totalRevenue)}</span>
                </div>
                {revenues.slice(0, 15).map((r: any) => (
                  <div key={r.id} className="flex justify-between text-xs pl-4">
                    <span className="text-muted-foreground">{r.description || r.category} — {format(new Date(r.revenue_date), "dd MMM")}</span>
                    <span className="font-medium">{fmt(r.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center border-b pb-2 pt-3">
                  <span className="font-semibold text-sm text-red-700">EXPENSES</span>
                  <span className="font-bold text-red-700">{fmt(totalExpense)}</span>
                </div>
                {expenses.slice(0, 15).map((e: any) => (
                  <div key={e.id} className="flex justify-between text-xs pl-4">
                    <span className="text-muted-foreground">{e.description || e.category} — {format(new Date(e.expense_date), "dd MMM")}</span>
                    <span className="font-medium">{fmt(e.amount)}</span>
                  </div>
                ))}
                <div className={`flex justify-between items-center border-t-2 pt-3 font-bold text-lg ${netPL >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  <span>NET {netPL >= 0 ? "PROFIT" : "LOSS"}</span>
                  <span>{fmt(Math.abs(netPL))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── JOURNAL ENTRIES ── */}
        <TabsContent value="journal" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4" /> Journal Entries</h3>
            <Button size="sm" onClick={() => { resetForm(); setShowDialog("journal"); }}><Plus className="h-4 w-4 mr-1" /> New Entry</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Entry #</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Debit</TableHead>
                    <TableHead className="text-xs text-right">Credit</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journals.map((j: any) => {
                    const totalDebit = (j.journal_entry_lines || []).reduce((s: number, l: any) => s + Number(l.debit_amount || 0), 0);
                    const totalCredit = (j.journal_entry_lines || []).reduce((s: number, l: any) => s + Number(l.credit_amount || 0), 0);
                    const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
                    return (
                      <TableRow key={j.id}>
                        <TableCell className="text-xs">{format(new Date(j.entry_date), "dd MMM yy")}</TableCell>
                        <TableCell className="text-xs font-mono">{j.entry_number || j.reference_number || "-"}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{j.description}</TableCell>
                        <TableCell className="text-xs text-right font-medium text-emerald-600">{fmt(totalDebit)}</TableCell>
                        <TableCell className="text-xs text-right font-medium text-red-600">{fmt(totalCredit)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-[9px]">{j.status}</Badge>
                            {!balanced && <Badge variant="destructive" className="text-[9px]">UNBALANCED</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {journals.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">No journal entries this month</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── INVOICES ── */}
        <TabsContent value="invoices" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2"><Receipt className="h-4 w-4" /> Invoices</h3>
            <Button size="sm" onClick={() => { resetForm(); setShowDialog("invoice"); }}><Plus className="h-4 w-4 mr-1" /> New Invoice</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Invoice #</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Client</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs text-right">Paid</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-xs font-mono">{inv.invoice_number}</TableCell>
                      <TableCell className="text-xs">{format(new Date(inv.invoice_date), "dd MMM yy")}</TableCell>
                      <TableCell className="text-xs font-medium">{inv.client_name}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{inv.description || "-"}</TableCell>
                      <TableCell className="text-xs text-right font-bold">{fmt(inv.total_amount)}</TableCell>
                      <TableCell className="text-xs text-right text-emerald-600">{fmt(inv.amount_paid || 0)}</TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] ${inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : inv.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-1">
                        {inv.status !== "paid" && (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-emerald-600"
                            onClick={() => updateInvoiceStatus.mutate({ id: inv.id, status: "paid" })}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Paid
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]"
                          onClick={() => {
                            import("@/lib/generateInvoicePDF").then(({ generateInvoicePDF }) => {
                              generateInvoicePDF({
                                invoice_number: inv.invoice_number,
                                invoice_date: inv.invoice_date,
                                due_date: inv.due_date,
                                client_name: inv.client_name,
                                client_phone: inv.client_phone,
                                client_email: inv.client_email,
                                client_address: inv.client_address,
                                gstin: inv.gstin,
                                items: inv.items as any,
                                subtotal: inv.subtotal,
                                tax_amount: inv.tax_amount,
                                discount_amount: inv.discount_amount,
                                total_amount: inv.total_amount,
                                amount_paid: inv.amount_paid,
                                balance_due: inv.balance_due,
                                description: inv.description,
                                vertical_name: inv.vertical_name,
                                notes: inv.notes,
                                invoice_type: inv.invoice_type,
                              });
                            });
                          }}>
                          <Download className="h-3 w-3 mr-1" /> PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {invoices.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">No invoices this month</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CHART OF ACCOUNTS / LEDGER ── */}
        <TabsContent value="ledger" className="mt-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4" /> Chart of Accounts</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {["asset", "liability", "equity", "revenue", "expense"].map(type => {
              const typeAccounts = accounts.filter((a: any) => a.account_type === type);
              const typeTotal = typeAccounts.reduce((s: number, a: any) => s + Number(a.current_balance || 0), 0);
              return (
                <Card key={type}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm capitalize flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px]">{typeAccounts.length}</Badge> {type}
                      </CardTitle>
                      <span className="font-bold text-sm">{fmt(typeTotal)}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-[200px]">
                      <div className="divide-y">
                        {typeAccounts.map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between px-4 py-2">
                            <div>
                              <p className="text-xs font-medium">{a.account_name}</p>
                              <p className="text-[10px] text-muted-foreground">{a.account_code}</p>
                            </div>
                            <span className="text-xs font-semibold">{fmt(a.current_balance || 0)}</span>
                          </div>
                        ))}
                        {typeAccounts.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">No accounts</p>}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ── BALANCE SHEET ── */}
        <TabsContent value="balance-sheet" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Balance Sheet</CardTitle>
                <Badge className={balanceSheet.balanced ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                  {balanceSheet.balanced ? "✓ Balanced" : "✗ Unbalanced"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-bold text-sm border-b pb-2">ASSETS</h4>
                  {accounts.filter((a: any) => a.account_type === "asset").map((a: any) => (
                    <div key={a.id} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{a.account_name}</span>
                      <span className="font-medium">{fmt(a.current_balance || 0)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-sm border-t pt-2 text-emerald-700">
                    <span>Total Assets</span>
                    <span>{fmt(balanceSheet.totalAssets)}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-bold text-sm border-b pb-2">LIABILITIES & EQUITY</h4>
                  <p className="text-xs font-semibold text-muted-foreground">Liabilities</p>
                  {accounts.filter((a: any) => a.account_type === "liability").map((a: any) => (
                    <div key={a.id} className="flex justify-between text-xs pl-2">
                      <span className="text-muted-foreground">{a.account_name}</span>
                      <span className="font-medium">{fmt(a.current_balance || 0)}</span>
                    </div>
                  ))}
                  <p className="text-xs font-semibold text-muted-foreground pt-2">Equity</p>
                  {accounts.filter((a: any) => a.account_type === "equity").map((a: any) => (
                    <div key={a.id} className="flex justify-between text-xs pl-2">
                      <span className="text-muted-foreground">{a.account_name}</span>
                      <span className="font-medium">{fmt(a.current_balance || 0)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs pl-2 text-emerald-600">
                    <span className="italic">+ Retained Earnings (Current P&L)</span>
                    <span className="font-medium">{fmt(netPL)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm border-t pt-2 text-blue-700">
                    <span>Total L + E</span>
                    <span>{fmt(balanceSheet.totalLiabilities + balanceSheet.totalEquity + netPL)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BANK RECONCILIATION ── */}
        <TabsContent value="reconciliation" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Bank Reconciliation</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                Upload bank statements to match with journal entries.
              </p>
              <Button variant="outline" className="w-full" disabled><Download className="h-4 w-4 mr-2" /> Upload Bank Statement (Coming Soon)</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── DIALOGS ── */}
      {/* Journal Entry */}
      <Dialog open={showDialog === "journal"} onOpenChange={() => setShowDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-emerald-600" /> New Journal Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Date</Label><Input type="date" value={form.entry_date || format(new Date(), "yyyy-MM-dd")} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} /></div>
              <div><Label className="text-xs">Reference #</Label><Input value={form.reference_number || ""} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} placeholder="e.g. JV-001" /></div>
            </div>
            <div><Label className="text-xs">Description *</Label><Input value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Salary payment, purchase, etc." /></div>
            <div><Label className="text-xs">Amount (Rs.) *</Label><Input type="number" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Debit Account *</Label>
                <Select value={form.debit_account || ""} onValueChange={v => setForm(f => ({ ...f, debit_account: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select debit A/C" /></SelectTrigger>
                  <SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Credit Account *</Label>
                <Select value={form.credit_account || ""} onValueChange={v => setForm(f => ({ ...f, credit_account: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select credit A/C" /></SelectTrigger>
                  <SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Narration</Label><Textarea value={form.narration || ""} onChange={e => setForm(f => ({ ...f, narration: e.target.value }))} rows={2} /></div>
            <Button onClick={() => addJournal.mutate(form)} disabled={!form.description || !form.amount || !form.debit_account || !form.credit_account || addJournal.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {addJournal.isPending ? "Posting..." : "Post Journal Entry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice */}
      <Dialog open={showDialog === "invoice"} onOpenChange={() => setShowDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-blue-600" /> New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Invoice Date</Label><Input type="date" value={form.invoice_date || format(new Date(), "yyyy-MM-dd")} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} /></div>
              <div><Label className="text-xs">Due Date</Label><Input type="date" value={form.due_date || ""} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Client Name *</Label><Input value={form.client_name || ""} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} /></div>
              <div><Label className="text-xs">Phone</Label><Input value={form.client_phone || ""} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Email</Label><Input value={form.client_email || ""} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} /></div>
              <div><Label className="text-xs">GSTIN</Label><Input value={form.gstin || ""} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))} placeholder="e.g. 09XXXXX1234Z5XX" /></div>
            </div>
            <div><Label className="text-xs">Client Address</Label><Input value={form.client_address || ""} onChange={e => setForm(f => ({ ...f, client_address: e.target.value }))} /></div>
            <div><Label className="text-xs">Description</Label><Input value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Amount (before tax) *</Label><Input type="number" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label className="text-xs">GST %</Label><Input type="number" value={form.tax_rate || "18"} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} /></div>
              <div><Label className="text-xs">Discount</Label><Input type="number" value={form.discount || "0"} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} /></div>
            </div>
            <div>
              <Label className="text-xs">Vertical</Label>
              <Select value={form.vertical_name || ""} onValueChange={v => setForm(f => ({ ...f, vertical_name: v }))}>
                <SelectTrigger><SelectValue placeholder="Select vertical" /></SelectTrigger>
                <SelectContent>
                  {["Car Sales", "Insurance", "HSRP", "Rentals", "Accessories", "Loans", "Corporate"].map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.amount && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded space-y-1">
                <div className="flex justify-between"><span>Subtotal:</span><span>{fmt(Number(form.amount))}</span></div>
                <div className="flex justify-between"><span>CGST ({Number(form.tax_rate || 18) / 2}%):</span><span>{fmt(Number(form.amount) * (Number(form.tax_rate || 18) / 200))}</span></div>
                <div className="flex justify-between"><span>SGST ({Number(form.tax_rate || 18) / 2}%):</span><span>{fmt(Number(form.amount) * (Number(form.tax_rate || 18) / 200))}</span></div>
                {Number(form.discount || 0) > 0 && <div className="flex justify-between text-emerald-600"><span>Discount:</span><span>-{fmt(Number(form.discount))}</span></div>}
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>{fmt(Number(form.amount) * (1 + Number(form.tax_rate || 18) / 100) - Number(form.discount || 0))}</span></div>
              </div>
            )}
            <Button onClick={() => addInvoice.mutate(form)} disabled={!form.client_name || !form.amount || addInvoice.isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {addInvoice.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revenue Entry */}
      <Dialog open={showDialog === "revenue"} onOpenChange={() => setShowDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowUpRight className="h-5 w-5 text-emerald-600" /> Record Revenue</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Description *</Label><Input value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Amount *</Label><Input type="number" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label className="text-xs">Date</Label><Input type="date" value={form.revenue_date || format(new Date(), "yyyy-MM-dd")} onChange={e => setForm(f => ({ ...f, revenue_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Category</Label><Input value={form.category || ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="car_sales, insurance, etc." /></div>
              <div><Label className="text-xs">Reference #</Label><Input value={form.reference_number || ""} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} /></div>
            </div>
            <Button onClick={() => addRevenue.mutate(form)} disabled={!form.description || !form.amount || addRevenue.isPending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              {addRevenue.isPending ? "Saving..." : "Record Revenue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Entry */}
      <Dialog open={showDialog === "expense"} onOpenChange={() => setShowDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowDownRight className="h-5 w-5 text-red-600" /> Record Expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Description *</Label><Input value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Amount *</Label><Input type="number" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label className="text-xs">Date</Label><Input type="date" value={form.expense_date || format(new Date(), "yyyy-MM-dd")} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Category</Label><Input value={form.category || ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="rent, salary, marketing, etc." /></div>
              <div><Label className="text-xs">Vendor Name</Label><Input value={form.vendor_name || ""} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} /></div>
            </div>
            <Button onClick={() => addExpense.mutate(form)} disabled={!form.description || !form.amount || addExpense.isPending} className="w-full bg-red-600 hover:bg-red-700 text-white">
              {addExpense.isPending ? "Saving..." : "Record Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};