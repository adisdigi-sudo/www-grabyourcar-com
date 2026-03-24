import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

const AccountsPurchaseOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [items, setItems] = useState<any[]>([{ description: "", quantity: 1, rate: 0 }]);
  const [search, setSearch] = useState("");

  const addOrder = () => {
    const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.rate)), 0);
    const po = {
      id: crypto.randomUUID(),
      po_number: `PO-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      vendor_name: form.vendor_name,
      date: form.date || format(new Date(), "yyyy-MM-dd"),
      delivery_date: form.delivery_date,
      items,
      total: subtotal,
      status: "draft",
      notes: form.notes,
    };
    setOrders(prev => [po, ...prev]);
    toast.success("Purchase order created");
    setShowDialog(false); setForm({}); setItems([{ description: "", quantity: 1, rate: 0 }]);
  };

  const updateItem = (idx: number, key: string, val: any) => {
    const updated = [...items]; updated[idx] = { ...updated[idx], [key]: val }; setItems(updated);
  };

  const filtered = orders.filter(o => !search || o.vendor_name?.toLowerCase().includes(search.toLowerCase()));
  const statusColor: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700", issued: "bg-blue-100 text-blue-700", received: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total POs</p><p className="text-2xl font-bold">{orders.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Value</p><p className="text-2xl font-bold text-blue-600">{fmt(orders.reduce((s, o) => s + o.total, 0))}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-orange-600">{orders.filter(o => o.status === "draft" || o.status === "issued").length}</p></CardContent></Card>
      </div>

      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setForm({ date: format(new Date(), "yyyy-MM-dd") }); setItems([{ description: "", quantity: 1, rate: 0 }]); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Purchase Order</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>PO #</TableHead><TableHead>Vendor</TableHead><TableHead>Date</TableHead><TableHead>Delivery</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-sm">{o.po_number}</TableCell>
                <TableCell className="font-medium text-sm">{o.vendor_name}</TableCell>
                <TableCell className="text-sm">{format(new Date(o.date), "dd MMM yyyy")}</TableCell>
                <TableCell className="text-sm">{o.delivery_date ? format(new Date(o.delivery_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell className="text-right font-semibold">{fmt(o.total)}</TableCell>
                <TableCell><Badge className={statusColor[o.status] || ""}>{o.status}</Badge></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No purchase orders yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Vendor *</Label><Input value={form.vendor_name || ""} onChange={e => setForm(p => ({ ...p, vendor_name: e.target.value }))} /></div>
              <div><Label>Date</Label><Input type="date" value={form.date || ""} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div><Label>Delivery Date</Label><Input type="date" value={form.delivery_date || ""} onChange={e => setForm(p => ({ ...p, delivery_date: e.target.value }))} /></div>
            </div>
            <div>
              <Label className="mb-2 block">Items</Label>
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
            <Button onClick={addOrder} disabled={!form.vendor_name}>Create PO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsPurchaseOrders;
