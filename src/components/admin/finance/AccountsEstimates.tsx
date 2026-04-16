import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit2, Trash2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
const STATUSES = ["draft", "sent", "accepted", "declined", "expired", "invoiced"];
const VERTICALS = ["Car Sales", "Insurance", "Car Loans", "HSRP", "Rental", "Accessories", "Service"];

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", sent: "bg-blue-100 text-blue-700", accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700", expired: "bg-yellow-100 text-yellow-700", invoiced: "bg-purple-100 text-purple-700",
};

const AccountsEstimates = () => {
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[]>([{ description: "", quantity: 1, rate: 0 }]);

  const { data: estimates = [] } = useQuery({
    queryKey: ["acc-estimates"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("estimates") as any).select("*").order("estimate_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const payload = { ...rec };
      if (!editing) {
        delete payload.id;
        payload.estimate_number = `EST-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      }
      const subtotal = items.reduce((s: number, i: any) => s + (Number(i.quantity) * Number(i.rate)), 0);
      const taxAmount = Math.round(subtotal * 0.18);
      payload.items = items;
      payload.subtotal = subtotal;
      payload.tax_amount = taxAmount;
      payload.total_amount = subtotal + taxAmount - Number(payload.discount_amount || 0);
      const { error } = await (supabase.from("estimates") as any).upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["acc-estimates"] });
      toast.success(editing ? "Updated" : "Estimate created");
      setShowDialog(false); setEditing(null); setForm({});
      setItems([{ description: "", quantity: 1, rate: 0 }]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("estimates") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["acc-estimates"] }); toast.success("Deleted"); },
  });

  const updateItem = (idx: number, key: string, val: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [key]: val };
    setItems(updated);
  };

  const filtered = estimates.filter((e: any) => !search || e.customer_name?.toLowerCase().includes(search.toLowerCase()) || e.estimate_number?.toLowerCase().includes(search.toLowerCase()));

  const openEdit = (est: any) => {
    setEditing(est);
    setForm({ ...est });
    setItems(Array.isArray(est.items) ? est.items : [{ description: "", quantity: 1, rate: 0 }]);
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Estimates</p><p className="text-2xl font-bold">{estimates.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Value</p><p className="text-2xl font-bold text-blue-600">{fmt(estimates.reduce((s: number, e: any) => s + Number(e.total_amount || 0), 0))}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Accepted</p><p className="text-2xl font-bold text-green-600">{estimates.filter((e: any) => e.status === "accepted").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-orange-600">{estimates.filter((e: any) => ["draft", "sent"].includes(e.status)).length}</p></CardContent></Card>
      </div>

      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search estimates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ estimate_date: format(new Date(), "yyyy-MM-dd"), status: "draft" }); setItems([{ description: "", quantity: 1, rate: 0 }]); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Estimate</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Estimate #</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Expiry</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-sm">{e.estimate_number}</TableCell>
                <TableCell className="font-medium text-sm">{e.customer_name}</TableCell>
                <TableCell className="text-sm">{e.estimate_date ? format(new Date(e.estimate_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell className="text-sm">{e.expiry_date ? format(new Date(e.expiry_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell className="text-right font-semibold">{fmt(e.total_amount)}</TableCell>
                <TableCell><Badge className={statusColor[e.status] || ""}>{e.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Edit2 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(e.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No estimates yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Estimate" : "New Estimate"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><Label>Customer *</Label><Input value={form.customer_name || ""} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
              <div><Label>Date</Label><Input type="date" value={form.estimate_date || ""} onChange={e => setForm(p => ({ ...p, estimate_date: e.target.value }))} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date || ""} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} /></div>
              <div><Label>Status</Label><Select value={form.status || "draft"} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vertical</Label><Select value={form.vertical_name || ""} onValueChange={v => setForm(p => ({ ...p, vertical_name: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Email</Label><Input value={form.customer_email || ""} onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))} /></div>
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
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.customer_name}>{editing ? "Update" : "Create Estimate"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsEstimates;
