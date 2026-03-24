import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Edit2, Trash2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

const AccountsItemsModule = () => {
  const [items, setItems] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");

  const saveItem = () => {
    if (editing) {
      setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...form } : i));
      toast.success("Item updated");
    } else {
      const item = {
        id: crypto.randomUUID(),
        ...form,
        selling_price: Number(form.selling_price || 0),
        cost_price: Number(form.cost_price || 0),
        stock: Number(form.stock || 0),
      };
      setItems(prev => [item, ...prev]);
      toast.success("Item added");
    }
    setShowDialog(false); setEditing(null); setForm({});
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success("Deleted");
  };

  const filtered = items.filter(i => !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.sku?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Items</p><p className="text-2xl font-bold">{items.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Services</p><p className="text-2xl font-bold text-blue-600">{items.filter(i => i.type === "service").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Goods</p><p className="text-2xl font-bold text-green-600">{items.filter(i => i.type === "goods").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Stock Value</p><p className="text-2xl font-bold">{fmt(items.reduce((s, i) => s + (i.cost_price * (i.stock || 0)), 0))}</p></CardContent></Card>
      </div>

      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ type: "service", unit: "nos", tax_rate: "18" }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Item</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>SKU</TableHead><TableHead>Type</TableHead><TableHead>HSN/SAC</TableHead><TableHead>Rate</TableHead><TableHead>Cost</TableHead><TableHead>Stock</TableHead><TableHead>Tax</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium text-sm">{i.name}</TableCell>
                <TableCell className="font-mono text-sm">{i.sku || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs capitalize">{i.type}</Badge></TableCell>
                <TableCell className="text-sm">{i.hsn || "—"}</TableCell>
                <TableCell className="font-medium">{fmt(i.selling_price)}</TableCell>
                <TableCell className="text-muted-foreground">{fmt(i.cost_price)}</TableCell>
                <TableCell>{i.type === "goods" ? i.stock : "—"}</TableCell>
                <TableCell className="text-sm">{i.tax_rate}%</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(i); setForm({ ...i }); setShowDialog(true); }}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteItem(i.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No items yet. Add your products and services.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Item" : "New Item"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Item Name *</Label><Input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Type</Label><Select value={form.type || "service"} onValueChange={v => setForm(p => ({ ...p, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="service">Service</SelectItem><SelectItem value="goods">Goods</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>SKU</Label><Input value={form.sku || ""} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} /></div>
              <div><Label>HSN/SAC</Label><Input value={form.hsn || ""} onChange={e => setForm(p => ({ ...p, hsn: e.target.value }))} /></div>
              <div><Label>Unit</Label><Select value={form.unit || "nos"} onValueChange={v => setForm(p => ({ ...p, unit: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["nos", "hrs", "kg", "pcs", "box", "set"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Selling Price</Label><Input type="number" value={form.selling_price || ""} onChange={e => setForm(p => ({ ...p, selling_price: Number(e.target.value) }))} /></div>
              <div><Label>Cost Price</Label><Input type="number" value={form.cost_price || ""} onChange={e => setForm(p => ({ ...p, cost_price: Number(e.target.value) }))} /></div>
              <div><Label>Tax Rate %</Label><Select value={form.tax_rate || "18"} onValueChange={v => setForm(p => ({ ...p, tax_rate: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["0", "5", "12", "18", "28"].map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent></Select></div>
            </div>
            {form.type === "goods" && (
              <div><Label>Opening Stock</Label><Input type="number" value={form.stock || ""} onChange={e => setForm(p => ({ ...p, stock: Number(e.target.value) }))} /></div>
            )}
            <div><Label>Description</Label><Textarea value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={saveItem} disabled={!form.name}>{editing ? "Update" : "Save Item"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsItemsModule;
