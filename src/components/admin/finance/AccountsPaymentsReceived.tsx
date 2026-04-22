import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, Edit2, Trash2, TrendingUp, Calendar,
  CreditCard, ArrowDownLeft, Download, AlertCircle, Clock
} from "lucide-react";
import { generateBrandedReceipt } from "@/lib/pdf";

const fmt = (v: number) => `Rs. ${Math.round(v || 0).toLocaleString("en-IN")}`;
const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "NEFT", "RTGS", "IMPS"];
const PAYMENT_TYPES = [
  { value: "credit", label: "Credit (Received)" },
  { value: "debit", label: "Debit (Refund / Paid Out)" },
];

const AccountsPaymentsReceived = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "credit" | "debit">("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: payments = [] } = useQuery({
    queryKey: ["payments-received"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("payment_received") as any).select("*").order("payment_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Pull invoices to compute outstanding balance per linked invoice + grand pending
  const { data: invoices = [] } = useQuery({
    queryKey: ["acc-invoices-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("invoice_number, total_amount, amount_paid, balance_due, status, due_date, client_name");
      if (error) throw error;
      return data || [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const p = { ...rec };
      const isNew = !editing;
      if (isNew) {
        delete p.id;
        p.payment_number = `PAY-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }
      // Persist payment_type inside notes prefix if column missing
      const typePrefix = p.payment_type === "debit" ? "[DEBIT] " : "[CREDIT] ";
      const cleanNotes = String(p.notes || "").replace(/^\[(DEBIT|CREDIT)\]\s*/i, "");
      const persisted = { ...p, notes: typePrefix + cleanNotes };
      delete (persisted as any).payment_type;

      const { error } = await (supabase.from("payment_received") as any).upsert(persisted, { onConflict: "id" });
      if (error) throw error;

      // Auto-update linked invoice status if invoice_number provided (only for credits)
      if (persisted.invoice_number && p.payment_type !== "debit") {
        const { data: inv } = await supabase.from("invoices").select("id, total_amount, amount_paid").eq("invoice_number", persisted.invoice_number).maybeSingle();
        if (inv) {
          const newPaid = Number(inv.amount_paid || 0) + (isNew ? Number(p.amount || 0) : 0);
          const balance = Number(inv.total_amount || 0) - newPaid;
          await supabase.from("invoices").update({
            amount_paid: newPaid,
            balance_due: Math.max(balance, 0),
            status: balance <= 0 ? "paid" : "partial",
            paid_at: balance <= 0 ? new Date().toISOString() : null,
          } as any).eq("id", inv.id);
        }
      }
      return { ...persisted, payment_type: p.payment_type || "credit" };
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["payments-received"] });
      qc.invalidateQueries({ queryKey: ["acc-invoices-all"] });
      const isNew = !editing;
      toast.success(isNew ? "Payment recorded — receipt ready!" : "Updated");
      if (isNew) downloadReceipt(saved);
      setShowDialog(false); setEditing(null); setForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("payment_received") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payments-received"] }); toast.success("Deleted"); },
  });

  // Reads payment_type from notes prefix (compat without schema change)
  const detectType = (p: any): "credit" | "debit" =>
    /^\[DEBIT\]/i.test(String(p.notes || "")) ? "debit" : "credit";
  const cleanNotes = (p: any): string =>
    String(p.notes || "").replace(/^\[(DEBIT|CREDIT)\]\s*/i, "");

  const downloadReceipt = async (p: any) => {
    try {
      toast.loading("Generating branded receipt…");
      const linkedInv = invoices.find((i: any) => i.invoice_number === p.invoice_number);
      await generateBrandedReceipt({
        payment_number: p.payment_number,
        payment_date: p.payment_date,
        customer_name: p.customer_name,
        amount: Number(p.amount || 0),
        payment_mode: p.payment_mode,
        invoice_number: p.invoice_number,
        reference_number: p.reference_number,
        notes: cleanNotes(p) || null,
        payment_type: (p.payment_type || detectType(p)) as "credit" | "debit",
        invoice_total: linkedInv ? Number(linkedInv.total_amount || 0) : null,
        invoice_balance_after: linkedInv ? Math.max(0, Number(linkedInv.total_amount || 0) - Number(linkedInv.amount_paid || 0)) : null,
      });
      toast.dismiss();
      toast.success("Receipt downloaded");
    } catch (e: any) {
      toast.dismiss();
      toast.error(e?.message || "Failed");
    }
  };

  // ── KPIs
  const kpis = useMemo(() => {
    const credits = payments.filter((p: any) => detectType(p) === "credit");
    const debits = payments.filter((p: any) => detectType(p) === "debit");
    const totalReceived = credits.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const totalRefunded = debits.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const thisMonthKey = format(new Date(), "yyyy-MM");
    const thisMonth = payments
      .filter((p: any) => p.payment_date?.startsWith(thisMonthKey) && detectType(p) === "credit")
      .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    // Outstanding from invoices
    const outstanding = invoices
      .filter((i: any) => i.status !== "paid")
      .reduce((s: number, i: any) => s + Math.max(0, Number(i.total_amount || 0) - Number(i.amount_paid || 0)), 0);

    const overdueCount = invoices.filter((i: any) =>
      i.status !== "paid" && i.due_date && new Date(i.due_date) < new Date()
    ).length;

    const netFlow = totalReceived - totalRefunded;
    return { totalReceived, totalRefunded, thisMonth, outstanding, overdueCount, netFlow };
  }, [payments, invoices]);

  const filtered = useMemo(() => payments.filter((p: any) => {
    if (statusFilter !== "all" && detectType(p) !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return p.customer_name?.toLowerCase().includes(q) || p.payment_number?.toLowerCase().includes(q) || p.invoice_number?.toLowerCase().includes(q);
  }), [payments, search, statusFilter]);

  const filteredTotal = filtered.reduce((s: number, p: any) =>
    s + (detectType(p) === "credit" ? 1 : -1) * Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1"><ArrowDownLeft className="h-4 w-4 text-emerald-600" /><p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium uppercase tracking-wide">Received</p></div>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{fmt(kpis.totalReceived)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30 border-rose-200 dark:border-rose-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1"><CreditCard className="h-4 w-4 text-rose-600" /><p className="text-[10px] text-rose-700 dark:text-rose-400 font-medium uppercase tracking-wide">Refunded</p></div>
            <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{fmt(kpis.totalRefunded)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-blue-600" /><p className="text-[10px] text-blue-700 dark:text-blue-400 font-medium uppercase tracking-wide">Net Flow</p></div>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{fmt(kpis.netFlow)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4 text-purple-600" /><p className="text-[10px] text-purple-700 dark:text-purple-400 font-medium uppercase tracking-wide">This Month</p></div>
            <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{fmt(kpis.thisMonth)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-amber-600" /><p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium uppercase tracking-wide">Pending (Balance)</p></div>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{fmt(kpis.outstanding)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1"><AlertCircle className="h-4 w-4 text-orange-600" /><p className="text-[10px] text-orange-700 dark:text-orange-400 font-medium uppercase tracking-wide">Overdue Invoices</p></div>
            <p className="text-xl font-bold text-orange-700 dark:text-orange-300">{kpis.overdueCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + filter + Add */}
      <div className="flex gap-3 items-center justify-between flex-wrap">
        <div className="flex gap-2 items-center flex-1 max-w-2xl">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by customer, payment #, invoice…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="credit">Credit Only</SelectItem>
              <SelectItem value="debit">Debit Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ payment_date: format(new Date(), "yyyy-MM-dd"), payment_type: "credit" }); setShowDialog(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" /> Record Payment
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Payment #</TableHead>
                <TableHead className="text-xs font-semibold">Type</TableHead>
                <TableHead className="text-xs font-semibold">Customer</TableHead>
                <TableHead className="text-xs font-semibold">Date</TableHead>
                <TableHead className="text-xs font-semibold">Mode</TableHead>
                <TableHead className="text-xs font-semibold">Invoice #</TableHead>
                <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                <TableHead className="text-xs font-semibold text-right">Balance Left</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p: any) => {
                const type = detectType(p);
                const linked = invoices.find((i: any) => i.invoice_number === p.invoice_number);
                const balance = linked ? Math.max(0, Number(linked.total_amount || 0) - Number(linked.amount_paid || 0)) : null;
                return (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-medium">{p.payment_number || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={type === "debit" ? "destructive" : "default"} className={`text-[10px] ${type === "credit" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>
                        {type === "debit" ? "DEBIT" : "CREDIT"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{p.customer_name}</TableCell>
                    <TableCell className="text-xs">{p.payment_date ? format(new Date(p.payment_date), "dd MMM yyyy") : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{p.payment_mode || "—"}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{p.invoice_number || "—"}</TableCell>
                    <TableCell className={`text-right font-semibold ${type === "debit" ? "text-rose-600" : "text-emerald-600"}`}>
                      {type === "debit" ? "− " : "+ "}{fmt(p.amount)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {balance == null ? "—" : balance > 0
                        ? <span className="text-amber-600 font-medium">{fmt(balance)}</span>
                        : <span className="text-emerald-600">Settled</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Download Branded Receipt" onClick={() => downloadReceipt({ ...p, payment_type: type })}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(p); setForm({ ...p, payment_type: type, notes: cleanNotes(p) }); setShowDialog(true); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(p.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No payments found</TableCell></TableRow>}
              {filtered.length > 0 && (
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell colSpan={6} className="text-right text-xs uppercase tracking-wide">Filtered Total (Net):</TableCell>
                  <TableCell className={`text-right text-sm ${filteredTotal >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{fmt(filteredTotal)}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Payment" : "Record Payment"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type *</Label>
                <Select value={form.payment_type || "credit"} onValueChange={v => setForm(p => ({ ...p, payment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Customer Name *</Label><Input value={form.customer_name || ""} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount *</Label><Input type="number" value={form.amount || ""} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
              <div><Label>Date</Label><Input type="date" value={form.payment_date || ""} onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payment Mode</Label>
                <Select value={form.payment_mode || ""} onValueChange={v => setForm(p => ({ ...p, payment_mode: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Reference #</Label><Input value={form.reference_number || ""} onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Invoice # (auto-updates balance)</Label>
              <Input value={form.invoice_number || ""} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} placeholder="e.g. INV-20260423-AB12" />
              {form.invoice_number && (() => {
                const linked = invoices.find((i: any) => i.invoice_number === form.invoice_number);
                if (!linked) return <p className="text-[11px] text-amber-600 mt-1">No matching invoice — payment will still record.</p>;
                const bal = Math.max(0, Number(linked.total_amount || 0) - Number(linked.amount_paid || 0));
                return <p className="text-[11px] text-muted-foreground mt-1">Linked: {linked.client_name} • Total {fmt(linked.total_amount)} • Outstanding <span className="font-semibold text-amber-600">{fmt(bal)}</span></p>;
              })()}
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional context (purpose, partial reason, etc.)" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.customer_name || !form.amount}>{editing ? "Update" : "Record & Download Receipt"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsPaymentsReceived;
