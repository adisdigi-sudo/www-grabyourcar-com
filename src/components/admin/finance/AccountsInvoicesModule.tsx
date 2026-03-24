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
import { FileText, Plus, Search, Edit2, Trash2, Download, Send, Zap } from "lucide-react";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";

const STATUSES = ["draft", "sent", "viewed", "partial", "paid", "overdue", "cancelled"];
const VERTICALS = ["Car Sales", "Insurance", "Car Loans", "HSRP", "Rental", "Accessories", "Service"];
const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800", sent: "bg-blue-100 text-blue-800", viewed: "bg-purple-100 text-purple-800",
  partial: "bg-orange-100 text-orange-800", paid: "bg-green-100 text-green-800", overdue: "bg-red-100 text-red-800", cancelled: "bg-gray-100 text-gray-500",
};

export const AccountsInvoicesModule = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [items, setItems] = useState<any[]>([{ description: "", hsn: "", quantity: 1, rate: 0, amount: 0 }]);
  const [tab, setTab] = useState("all");

  const { data: invoices = [] } = useQuery({
    queryKey: ["acc-invoices-all"],
    queryFn: async () => { const { data, error } = await supabase.from("invoices").select("*").order("invoice_date", { ascending: false }); if (error) throw error; return data; },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const payload = { ...rec };
      if (!editing) { delete payload.id; payload.invoice_number = `INV-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`; }
      const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.rate)), 0);
      const taxAmount = Math.round(subtotal * 0.18);
      payload.items = items;
      payload.subtotal = subtotal;
      payload.tax_amount = taxAmount;
      payload.total_amount = subtotal + taxAmount - Number(payload.discount_amount || 0);
      payload.balance_due = payload.total_amount - Number(payload.amount_paid || 0);
      if (payload.balance_due <= 0) payload.status = "paid";
      const { error } = await (supabase.from("invoices") as any).upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["acc-invoices-all"] }); toast.success(editing ? "Updated" : "Invoice created"); setShowDialog(false); setEditing(null); setForm({}); setItems([{ description: "", hsn: "", quantity: 1, rate: 0, amount: 0 }]); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("invoices").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["acc-invoices-all"] }); toast.success("Deleted"); },
  });

  const totalReceivable = invoices.filter((i: any) => i.status !== "paid" && i.status !== "cancelled").reduce((s: number, i: any) => s + Number(i.balance_due || i.total_amount || 0), 0);
  const totalPaid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);

  const filtered = invoices.filter((i: any) => {
    const matchSearch = !search || i.client_name?.toLowerCase().includes(search.toLowerCase()) || i.invoice_number?.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || i.status === tab;
    return matchSearch && matchTab;
  });

  const updateItem = (idx: number, key: string, val: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [key]: val };
    updated[idx].amount = Number(updated[idx].quantity) * Number(updated[idx].rate);
    setItems(updated);
  };

  const openEdit = (inv: any) => {
    setEditing(inv); setForm({ ...inv });
    setItems(Array.isArray(inv.items) ? inv.items : [{ description: "", hsn: "", quantity: 1, rate: 0, amount: 0 }]);
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Invoices</p><p className="text-2xl font-bold">{invoices.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Receivable</p><p className="text-2xl font-bold text-orange-600">{fmt(totalReceivable)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Collected</p><p className="text-2xl font-bold text-green-600">{fmt(totalPaid)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Overdue</p><p className="text-2xl font-bold text-red-600">{invoices.filter((i: any) => i.status === "overdue" || (i.status !== "paid" && i.due_date && new Date(i.due_date) < new Date())).length}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {["all", ...STATUSES].map(s => (
            <Button key={s} variant={tab === s ? "default" : "outline"} size="sm" onClick={() => setTab(s)} className="capitalize">{s} ({s === "all" ? invoices.length : invoices.filter((i: any) => i.status === s).length})</Button>
          ))}
        </div>
        <Button onClick={() => { setEditing(null); setForm({ invoice_date: format(new Date(), "yyyy-MM-dd"), status: "draft", amount_paid: 0, discount_amount: 0 }); setItems([{ description: "", hsn: "", quantity: 1, rate: 0, amount: 0 }]); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Invoice</Button>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Invoice #</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead><TableHead>Due Date</TableHead><TableHead>Amount</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((inv: any) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                <TableCell className="font-medium text-sm">{inv.client_name}</TableCell>
                <TableCell className="text-sm">{inv.invoice_date ? format(new Date(inv.invoice_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell className="text-sm">{inv.due_date ? format(new Date(inv.due_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell className="font-medium">{fmt(inv.total_amount)}</TableCell>
                <TableCell className="text-green-600">{fmt(inv.amount_paid)}</TableCell>
                <TableCell className="font-medium text-orange-600">{fmt(inv.balance_due)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Badge className={statusColor[inv.status] || ""}>{inv.status}</Badge>
                    {inv.invoice_type === 'auto' && <Badge variant="outline" className="text-xs gap-1"><Zap className="h-3 w-3" />Auto</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right"><div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" title="Download PDF" onClick={() => {
                    generateInvoicePDF({ ...inv, items: Array.isArray(inv.items) ? inv.items : [] });
                  }}><Download className="h-4 w-4" /></Button>
                  {inv.client_email && (
                    <Button size="icon" variant="ghost" title="Send via Email" onClick={async () => {
                      try {
                        toast.loading("Sending invoice...");
                        const { data, error } = await supabase.functions.invoke("send-invoice-email", { body: { invoice_id: inv.id } });
                        toast.dismiss();
                        if (error) throw error;
                        toast.success("Invoice sent to " + inv.client_email);
                      } catch (e: any) { toast.dismiss(); toast.error(e.message || "Failed to send"); }
                    }}><Send className="h-4 w-4" /></Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => openEdit(inv)}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(inv.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No invoices found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Invoice" : "New Invoice"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Client Name *</Label><Input value={form.client_name || ""} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} /></div>
              <div><Label>Client Phone</Label><Input value={form.client_phone || ""} onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))} /></div>
              <div><Label>Client Email</Label><Input value={form.client_email || ""} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div><Label>Invoice Date</Label><Input type="date" value={form.invoice_date || ""} onChange={e => setForm(p => ({ ...p, invoice_date: e.target.value }))} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date || ""} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
              <div><Label>Vertical</Label><Select value={form.vertical_name || ""} onValueChange={v => setForm(p => ({ ...p, vertical_name: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>GSTIN</Label><Input value={form.gstin || ""} onChange={e => setForm(p => ({ ...p, gstin: e.target.value }))} /></div>
            </div>

            <div>
              <Label className="mb-2 block">Line Items</Label>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-4" placeholder="Description" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} />
                    <Input className="col-span-2" placeholder="HSN" value={item.hsn} onChange={e => updateItem(idx, "hsn", e.target.value)} />
                    <Input className="col-span-2" type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} />
                    <Input className="col-span-2" type="number" placeholder="Rate" value={item.rate} onChange={e => updateItem(idx, "rate", Number(e.target.value))} />
                    <span className="col-span-1 text-sm font-medium">{fmt(item.amount)}</span>
                    <Button size="icon" variant="ghost" className="col-span-1 text-destructive" onClick={() => setItems(items.filter((_, i) => i !== idx))}>×</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setItems([...items, { description: "", hsn: "", quantity: 1, rate: 0, amount: 0 }])}>+ Add Item</Button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div><Label>Discount</Label><Input type="number" value={form.discount_amount || ""} onChange={e => setForm(p => ({ ...p, discount_amount: Number(e.target.value) }))} /></div>
              <div><Label>Amount Paid</Label><Input type="number" value={form.amount_paid || ""} onChange={e => setForm(p => ({ ...p, amount_paid: Number(e.target.value) }))} /></div>
              <div><Label>Payment Mode</Label><Select value={form.payment_mode || ""} onValueChange={v => setForm(p => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{["Cash", "UPI", "Bank Transfer", "Cheque", "Card"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Status</Label><Select value={form.status || "draft"} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.client_name}>{editing ? "Update" : "Create Invoice"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsInvoicesModule;
