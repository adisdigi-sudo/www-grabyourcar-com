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
import { IndianRupee, Plus, Search, Edit2, Trash2 } from "lucide-react";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "NEFT", "RTGS"];

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
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments-received"] });
      toast.success(editing ? "Updated" : "Payment recorded");
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

  const totalReceived = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const thisMonth = payments.filter((p: any) => p.payment_date?.startsWith(format(new Date(), "yyyy-MM"))).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const filtered = payments.filter((p: any) => !search || p.customer_name?.toLowerCase().includes(search.toLowerCase()) || p.payment_number?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Received</p><p className="text-2xl font-bold text-green-600">{fmt(totalReceived)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">This Month</p><p className="text-2xl font-bold text-blue-600">{fmt(thisMonth)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Transactions</p><p className="text-2xl font-bold">{payments.length}</p></CardContent></Card>
      </div>

      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ payment_date: format(new Date(), "yyyy-MM-dd") }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> Record Payment</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Payment #</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Mode</TableHead><TableHead>Invoice #</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm">{p.payment_number || "—"}</TableCell>
                <TableCell className="font-medium text-sm">{p.customer_name}</TableCell>
                <TableCell className="text-sm">{p.payment_date ? format(new Date(p.payment_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{p.payment_mode || "—"}</Badge></TableCell>
                <TableCell className="font-mono text-sm">{p.invoice_number || "—"}</TableCell>
                <TableCell className="text-right font-semibold text-green-600">{fmt(p.amount)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setForm({ ...p }); setShowDialog(true); }}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No payments found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

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
              <div><Label>Payment Mode</Label><Select value={form.payment_mode || ""} onValueChange={v => setForm(p => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Invoice #</Label><Input value={form.invoice_number || ""} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} placeholder="Link to invoice" /></div>
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
