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
import { FileText, Plus, Search, Edit2, Trash2 } from "lucide-react";

const STATUSES = ["pending", "approved", "partial", "paid", "overdue", "cancelled"];
const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800", approved: "bg-blue-100 text-blue-800",
  partial: "bg-orange-100 text-orange-800", paid: "bg-green-100 text-green-800", overdue: "bg-red-100 text-red-800", cancelled: "bg-gray-100 text-gray-500",
};

export const AccountsBillsModule = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [items, setItems] = useState<any[]>([{ description: "", quantity: 1, rate: 0, amount: 0 }]);

  const { data: bills = [] } = useQuery({
    queryKey: ["acc-bills-all"],
    queryFn: async () => { const { data, error } = await (supabase.from("bills") as any).select("*").order("bill_date", { ascending: false }); if (error) throw error; return data; },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const payload = { ...rec };
      if (!editing) { delete payload.id; payload.bill_number = `BILL-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`; }
      const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.rate)), 0);
      const taxAmount = Math.round(subtotal * 0.18);
      payload.items = items;
      payload.subtotal = subtotal;
      payload.tax_amount = taxAmount;
      payload.total_amount = subtotal + taxAmount;
      payload.balance_due = payload.total_amount - Number(payload.amount_paid || 0);
      if (payload.balance_due <= 0) payload.status = "paid";
      const { error } = await (supabase.from("bills") as any).upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["acc-bills-all"] }); toast.success(editing ? "Updated" : "Bill created"); setShowDialog(false); setEditing(null); setForm({}); setItems([{ description: "", quantity: 1, rate: 0, amount: 0 }]); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.from("bills") as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["acc-bills-all"] }); toast.success("Deleted"); },
  });

  const totalPayable = bills.filter((b: any) => b.status !== "paid" && b.status !== "cancelled").reduce((s: number, b: any) => s + Number(b.balance_due || b.total_amount || 0), 0);
  const filtered = bills.filter((b: any) => !search || b.vendor_name?.toLowerCase().includes(search.toLowerCase()) || b.bill_number?.toLowerCase().includes(search.toLowerCase()));

  const updateItem = (idx: number, key: string, val: any) => {
    const updated = [...items]; updated[idx] = { ...updated[idx], [key]: val }; updated[idx].amount = Number(updated[idx].quantity) * Number(updated[idx].rate); setItems(updated);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Bills</p><p className="text-2xl font-bold">{bills.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Payable</p><p className="text-2xl font-bold text-red-600">{fmt(totalPayable)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Paid</p><p className="text-2xl font-bold text-green-600">{bills.filter((b: any) => b.status === "paid").length}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search bills..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ bill_date: format(new Date(), "yyyy-MM-dd"), status: "pending", amount_paid: 0 }); setItems([{ description: "", quantity: 1, rate: 0, amount: 0 }]); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Bill</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Bill #</TableHead><TableHead>Vendor</TableHead><TableHead>Date</TableHead><TableHead>Due Date</TableHead><TableHead>Amount</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((b: any) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-sm">{b.bill_number || "—"}</TableCell>
                <TableCell className="font-medium text-sm">{b.vendor_name}</TableCell>
                <TableCell className="text-sm">{b.bill_date ? format(new Date(b.bill_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell className="text-sm">{b.due_date ? format(new Date(b.due_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell className="font-medium">{fmt(b.total_amount)}</TableCell>
                <TableCell className="text-red-600">{fmt(b.balance_due)}</TableCell>
                <TableCell><Badge className={statusColor[b.status] || ""}>{b.status}</Badge></TableCell>
                <TableCell className="text-right"><div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setForm({ ...b }); setItems(Array.isArray(b.items) ? b.items : [{ description: "", quantity: 1, rate: 0, amount: 0 }]); setShowDialog(true); }}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(b.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No bills found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Bill" : "New Vendor Bill"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vendor Name *</Label><Input value={form.vendor_name || ""} onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))} /></div>
              <div><Label>Vendor GSTIN</Label><Input value={form.vendor_gstin || ""} onChange={e => setForm(p => ({ ...p, vendor_gstin: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Bill Date</Label><Input type="date" value={form.bill_date || ""} onChange={e => setForm(p => ({ ...p, bill_date: e.target.value }))} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date || ""} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
              <div><Label>Status</Label><Select value={form.status || "pending"} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div>
              <Label className="mb-2 block">Line Items</Label>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center mb-2">
                  <Input className="col-span-5" placeholder="Description" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} />
                  <Input className="col-span-2" type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} />
                  <Input className="col-span-3" type="number" placeholder="Rate" value={item.rate} onChange={e => updateItem(idx, "rate", Number(e.target.value))} />
                  <span className="col-span-1 text-sm">{fmt(item.amount)}</span>
                  <Button size="icon" variant="ghost" className="col-span-1 text-destructive" onClick={() => setItems(items.filter((_, i) => i !== idx))}>×</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setItems([...items, { description: "", quantity: 1, rate: 0, amount: 0 }])}>+ Add Item</Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount Paid</Label><Input type="number" value={form.amount_paid || ""} onChange={e => setForm(p => ({ ...p, amount_paid: Number(e.target.value) }))} /></div>
              <div><Label>Payment Mode</Label><Select value={form.payment_mode || ""} onValueChange={v => setForm(p => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{["Cash", "UPI", "Bank Transfer", "Cheque", "Card"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.vendor_name}>{editing ? "Update" : "Create Bill"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsBillsModule;
