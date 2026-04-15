import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
const STATUSES = ["draft", "sent", "accepted", "declined", "expired", "invoiced"];

const AccountsEstimates = () => {
  const [estimates, setEstimates] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[]>([{ description: "", quantity: 1, rate: 0 }]);

  const addEstimate = () => {
    const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.rate)), 0);
    const tax = Math.round(subtotal * 0.18);
    const est = {
      id: crypto.randomUUID(),
      estimate_number: `EST-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      customer_name: form.customer_name,
      date: form.date || format(new Date(), "yyyy-MM-dd"),
      expiry_date: form.expiry_date,
      items,
      subtotal,
      tax_amount: tax,
      total: subtotal + tax,
      status: "draft",
      notes: form.notes,
    };
    setEstimates(prev => [est, ...prev]);
    toast.success("Estimate created");
    setShowDialog(false);
    setForm({});
    setItems([{ description: "", quantity: 1, rate: 0 }]);
  };

  const updateItem = (idx: number, key: string, val: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [key]: val };
    setItems(updated);
  };

  const filtered = estimates.filter(e => !search || e.customer_name?.toLowerCase().includes(search.toLowerCase()));
  const statusColor: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700", sent: "bg-blue-100 text-blue-700", accepted: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-700", expired: "bg-yellow-100 text-yellow-700", invoiced: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Estimates</p><p className="text-2xl font-bold">{estimates.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Value</p><p className="text-2xl font-bold text-blue-600">{fmt(estimates.reduce((s, e) => s + e.total, 0))}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Accepted</p><p className="text-2xl font-bold text-green-600">{estimates.filter(e => e.status === "accepted").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-orange-600">{estimates.filter(e => ["draft", "sent"].includes(e.status)).length}</p></CardContent></Card>
      </div>

      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search estimates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setForm({ date: format(new Date(), "yyyy-MM-dd") }); setItems([{ description: "", quantity: 1, rate: 0 }]); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Estimate</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Estimate #</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Expiry</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(e => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-sm">{e.estimate_number}</TableCell>
                <TableCell className="font-medium text-sm">{e.customer_name}</TableCell>
                <TableCell className="text-sm">{format(new Date(e.date), "dd MMM yyyy")}</TableCell>
                <TableCell className="text-sm">{e.expiry_date ? format(new Date(e.expiry_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell className="text-right font-semibold">{fmt(e.total)}</TableCell>
                <TableCell><Badge className={statusColor[e.status] || ""}>{e.status}</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No estimates yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Estimate</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Customer *</Label><Input value={form.customer_name || ""} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
              <div><Label>Date</Label><Input type="date" value={form.date || ""} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date || ""} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} /></div>
            </div>
            <div>
              <Label className="mb-2 block">Line Items</Label>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center mb-2">
                  <Input className="col-span-6" placeholder="Description" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} />
                  <Input className="col-span-2" type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} />
                  <Input className="col-span-3" type="number" placeholder="Rate" value={item.rate} onChange={e => updateItem(idx, "rate", Number(e.target.value))} />
                  <Button size="icon" variant="ghost" className="col-span-1 text-destructive" onClick={() => setItems(items.filter((_, i) => i !== idx))}>×</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setItems([...items, { description: "", quantity: 1, rate: 0 }])}>+ Add Item</Button>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={addEstimate} disabled={!form.customer_name}>Create Estimate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsEstimates;
