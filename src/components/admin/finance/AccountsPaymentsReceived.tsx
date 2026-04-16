import { useState } from "react";
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
  IndianRupee, Plus, Search, Edit2, Trash2, TrendingUp, Calendar,
  CreditCard, ArrowDownLeft, FileText, Download
} from "lucide-react";
import jsPDF from "jspdf";

const fmt = (v: number) => `Rs. ${Math.round(v || 0).toLocaleString("en-IN")}`;
const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "NEFT", "RTGS", "IMPS"];

const AccountsPaymentsReceived = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
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

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const p = { ...rec };
      if (!editing) {
        delete p.id;
        p.payment_number = `PAY-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }
      const { error } = await (supabase.from("payment_received") as any).upsert(p, { onConflict: "id" });
      if (error) throw error;

      // Auto-update linked invoice status if invoice_number provided
      if (p.invoice_number) {
        const { data: inv } = await supabase.from("invoices").select("id, total_amount, amount_paid").eq("invoice_number", p.invoice_number).maybeSingle();
        if (inv) {
          const newPaid = Number(inv.amount_paid || 0) + (editing ? 0 : Number(p.amount || 0));
          const balance = Number(inv.total_amount || 0) - newPaid;
          await supabase.from("invoices").update({
            amount_paid: newPaid,
            balance_due: Math.max(balance, 0),
            status: balance <= 0 ? "paid" : "partial",
            paid_at: balance <= 0 ? new Date().toISOString() : null,
          } as any).eq("id", inv.id);
        }
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["payments-received"] });
      qc.invalidateQueries({ queryKey: ["acc-invoices-all"] });
      const isNew = !editing;
      toast.success(isNew ? "Payment recorded — receipt ready!" : "Updated");
      if (isNew && variables) {
        // Auto-generate receipt for new payments
        const payData = { ...variables, payment_number: `PAY-${format(new Date(), "yyyyMMdd")}-AUTO` };
        generateReceipt(payData);
      }
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

  const generateReceipt = (p: any) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const m = 48;

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pw, 80, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("PAYMENT RECEIPT", m, 48);
    doc.setFontSize(10);
    doc.text(p.payment_number || "", pw - m, 36, { align: "right" });
    doc.text(p.payment_date ? format(new Date(p.payment_date), "dd MMM yyyy") : "", pw - m, 52, { align: "right" });

    // Body
    let y = 120;
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const row = (label: string, val: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, m, y);
      doc.setFont("helvetica", "normal");
      doc.text(val, m + 160, y);
      y += 24;
    };

    row("Received From:", p.customer_name || "—");
    row("Amount:", fmt(p.amount));
    row("Payment Mode:", p.payment_mode || "—");
    row("Invoice #:", p.invoice_number || "—");
    row("Reference #:", p.reference_number || "—");

    if (p.notes) {
      y += 10;
      row("Notes:", p.notes);
    }

    // Footer
    y += 40;
    doc.setDrawColor(226, 232, 240);
    doc.line(m, y, pw - m, y);
    y += 30;
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("This is a computer-generated receipt. No signature required.", pw / 2, y, { align: "center" });

    doc.save(`Receipt-${p.payment_number || "payment"}.pdf`);
    toast.success("Receipt downloaded");
  };

  const totalReceived = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const thisMonth = payments.filter((p: any) => p.payment_date?.startsWith(format(new Date(), "yyyy-MM"))).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const avgPayment = payments.length > 0 ? totalReceived / payments.length : 0;
  const filtered = payments.filter((p: any) => !search || p.customer_name?.toLowerCase().includes(search.toLowerCase()) || p.payment_number?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><ArrowDownLeft className="h-4 w-4 text-emerald-600" /><p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Total Received</p></div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{fmt(totalReceived)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4 text-blue-600" /><p className="text-xs text-blue-700 dark:text-blue-400 font-medium">This Month</p></div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{fmt(thisMonth)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-purple-600" /><p className="text-xs text-purple-700 dark:text-purple-400 font-medium">Avg Payment</p></div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{fmt(avgPayment)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><CreditCard className="h-4 w-4 text-amber-600" /><p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Transactions</p></div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{payments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Add */}
      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => { setEditing(null); setForm({ payment_date: format(new Date(), "yyyy-MM-dd") }); setShowDialog(true); }} className="gap-1.5">
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
                <TableHead className="text-xs font-semibold">Customer</TableHead>
                <TableHead className="text-xs font-semibold">Date</TableHead>
                <TableHead className="text-xs font-semibold">Mode</TableHead>
                <TableHead className="text-xs font-semibold">Invoice #</TableHead>
                <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p: any) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs font-medium">{p.payment_number || "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{p.customer_name}</TableCell>
                  <TableCell className="text-xs">{p.payment_date ? format(new Date(p.payment_date), "dd MMM yyyy") : "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{p.payment_mode || "—"}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{p.invoice_number || "—"}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600">{fmt(p.amount)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Download Receipt" onClick={() => generateReceipt(p)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(p); setForm({ ...p }); setShowDialog(true); }}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(p.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No payments found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Payment" : "Record Payment Received"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Customer Name *</Label><Input value={form.customer_name || ""} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
              <div><Label>Amount *</Label><Input type="number" value={form.amount || ""} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.payment_date || ""} onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} /></div>
              <div><Label>Payment Mode</Label>
                <Select value={form.payment_mode || ""} onValueChange={v => setForm(p => ({ ...p, payment_mode: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Invoice #</Label><Input value={form.invoice_number || ""} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} /></div>
              <div><Label>Reference #</Label><Input value={form.reference_number || ""} onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.customer_name || !form.amount}>{editing ? "Update" : "Record"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsPaymentsReceived;
