import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Edit2, Trash2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
const MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "NEFT", "RTGS", "IMPS"];

const AccountsPaymentsMade = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: payments = [] } = useQuery({
    queryKey: ["payments-made"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("payments_made") as any).select("*").order("payment_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const p = { ...rec };
      if (!editing) {
        delete p.id;
        p.payment_number = `PMNT-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      }
      p.amount = Number(p.amount || 0);
      const { error } = await (supabase.from("payments_made") as any).upsert(p, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments-made"] });
      toast.success(editing ? "Updated" : "Payment recorded");
      setShowDialog(false); setEditing(null); setForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("payments_made") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payments-made"] }); toast.success("Deleted"); },
  });

  const generateVoucher = (p: any) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const m = 48;
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, pw, 70, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PAYMENT VOUCHER", m, 40);
    doc.setFontSize(10);
    doc.text(p.payment_number, pw - m, 30, { align: "right" });
    doc.text(p.payment_date ? format(new Date(p.payment_date), "dd MMM yyyy") : "", pw - m, 48, { align: "right" });

    let y = 110;
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(11);
    const row = (l: string, v: string) => { doc.setFont("helvetica", "bold"); doc.text(l, m, y); doc.setFont("helvetica", "normal"); doc.text(v, m + 150, y); y += 24; };
    row("Paid To:", p.vendor_name || "—");
    row("Amount:", fmt(p.amount));
    row("Mode:", p.payment_mode || "—");
    row("Bill #:", p.bill_number || "—");
    row("Reference:", p.reference || "—");
    if (p.notes) row("Notes:", p.notes);

    y += 30;
    doc.setDrawColor(226, 232, 240); doc.line(m, y, pw - m, y); y += 20;
    doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text("Computer generated payment voucher", pw / 2, y, { align: "center" });
    doc.save(`PaymentVoucher_${p.payment_number}.pdf`);
    toast.success("Voucher downloaded");
  };

  const filtered = payments.filter((p: any) => !search || p.vendor_name?.toLowerCase().includes(search.toLowerCase()) || p.payment_number?.toLowerCase().includes(search.toLowerCase()));
  const total = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const thisMonth = payments.filter((p: any) => p.payment_date?.startsWith(format(new Date(), "yyyy-MM"))).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Paid</p><p className="text-2xl font-bold text-red-600">{fmt(total)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Transactions</p><p className="text-2xl font-bold">{payments.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">This Month</p><p className="text-2xl font-bold">{fmt(thisMonth)}</p></CardContent></Card>
      </div>

      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ payment_date: format(new Date(), "yyyy-MM-dd") }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> Record Payment</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Payment #</TableHead><TableHead>Vendor</TableHead><TableHead>Date</TableHead><TableHead>Mode</TableHead><TableHead>Bill #</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm">{p.payment_number}</TableCell>
                <TableCell className="font-medium text-sm">{p.vendor_name}</TableCell>
                <TableCell className="text-sm">{p.payment_date ? format(new Date(p.payment_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{p.payment_mode || "—"}</Badge></TableCell>
                <TableCell className="text-sm">{p.bill_number || "—"}</TableCell>
                <TableCell className="text-right font-semibold text-red-600">{fmt(p.amount)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => generateVoucher(p)}><Download className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(p); setForm({ ...p }); setShowDialog(true); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(p.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No payments made yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Payment" : "Record Payment Made"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vendor Name *</Label><Input value={form.vendor_name || ""} onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))} /></div>
              <div><Label>Amount *</Label><Input type="number" value={form.amount || ""} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.payment_date || ""} onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} /></div>
              <div><Label>Mode</Label><Select value={form.payment_mode || ""} onValueChange={v => setForm(p => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Bill #</Label><Input value={form.bill_number || ""} onChange={e => setForm(p => ({ ...p, bill_number: e.target.value }))} /></div>
              <div><Label>Reference</Label><Input value={form.reference || ""} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.vendor_name || !form.amount}>{editing ? "Update" : "Record"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsPaymentsMade;
