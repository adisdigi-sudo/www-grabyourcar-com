import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
const MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "NEFT", "RTGS"];

const AccountsPaymentsMade = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");

  const addPayment = () => {
    const pay = {
      id: crypto.randomUUID(),
      payment_number: `PMNT-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      vendor_name: form.vendor_name,
      amount: Number(form.amount || 0),
      payment_date: form.payment_date || format(new Date(), "yyyy-MM-dd"),
      payment_mode: form.payment_mode,
      bill_number: form.bill_number,
      reference: form.reference,
      notes: form.notes,
    };
    setPayments(prev => [pay, ...prev]);
    toast.success("Payment recorded");
    setShowDialog(false); setForm({});
  };

  const filtered = payments.filter(p => !search || p.vendor_name?.toLowerCase().includes(search.toLowerCase()));
  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Paid</p><p className="text-2xl font-bold text-red-600">{fmt(total)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Transactions</p><p className="text-2xl font-bold">{payments.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">This Month</p><p className="text-2xl font-bold">{payments.filter(p => p.payment_date?.startsWith(format(new Date(), "yyyy-MM"))).length}</p></CardContent></Card>
      </div>

      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setForm({ payment_date: format(new Date(), "yyyy-MM-dd") }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> Record Payment</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Payment #</TableHead><TableHead>Vendor</TableHead><TableHead>Date</TableHead><TableHead>Mode</TableHead><TableHead>Bill #</TableHead><TableHead className="text-right">Amount</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm">{p.payment_number}</TableCell>
                <TableCell className="font-medium text-sm">{p.vendor_name}</TableCell>
                <TableCell className="text-sm">{format(new Date(p.payment_date), "dd MMM yyyy")}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{p.payment_mode || "—"}</Badge></TableCell>
                <TableCell className="text-sm">{p.bill_number || "—"}</TableCell>
                <TableCell className="text-right font-semibold text-red-600">{fmt(p.amount)}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No payments made yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment Made</DialogTitle></DialogHeader>
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
            <Button onClick={addPayment} disabled={!form.vendor_name || !form.amount}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsPaymentsMade;
