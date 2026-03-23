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
import { Laptop, Plus, Search, Edit2, Trash2 } from "lucide-react";

const ASSET_TYPES = ["Laptop", "Desktop", "Monitor", "Mobile Phone", "Keyboard", "Mouse", "Chair", "Desk", "ID Card", "Vehicle", "Printer", "Other"];
const CONDITIONS = ["new", "good", "fair", "poor", "damaged"];
const STATUSES = ["available", "assigned", "maintenance", "retired", "lost"];

const statusColor: Record<string, string> = {
  available: "bg-green-100 text-green-800", assigned: "bg-blue-100 text-blue-800",
  maintenance: "bg-yellow-100 text-yellow-800", retired: "bg-gray-100 text-gray-800", lost: "bg-red-100 text-red-800",
};
const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

export const HRAssetModule = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: assets = [] } = useQuery({
    queryKey: ["hr-assets"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("hr_assets") as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => { const p = { ...rec }; if (!editing) delete p.id; const { error } = await (supabase.from("hr_assets") as any).upsert(p, { onConflict: "id" }); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-assets"] }); toast.success(editing ? "Updated" : "Asset added"); setShowDialog(false); setEditing(null); setForm({}); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.from("hr_assets") as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-assets"] }); toast.success("Deleted"); },
  });

  const totalValue = assets.reduce((s: number, a: any) => s + Number(a.purchase_cost || 0), 0);
  const filtered = assets.filter((a: any) => !search || a.asset_name?.toLowerCase().includes(search.toLowerCase()) || a.assigned_to?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Assets</p><p className="text-2xl font-bold">{assets.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Assigned</p><p className="text-2xl font-bold text-blue-600">{assets.filter((a: any) => a.status === "assigned").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Available</p><p className="text-2xl font-bold text-green-600">{assets.filter((a: any) => a.status === "available").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Value</p><p className="text-2xl font-bold">{fmt(totalValue)}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
        <Button onClick={() => { setEditing(null); setForm({ status: "available", condition: "new" }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add Asset</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Asset</TableHead><TableHead>Type</TableHead><TableHead>Serial/Tag</TableHead><TableHead>Assigned To</TableHead><TableHead>Condition</TableHead><TableHead>Status</TableHead><TableHead>Cost</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium text-sm">{a.asset_name}</TableCell>
                <TableCell><Badge variant="outline">{a.asset_type}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.serial_number || a.asset_tag || "—"}</TableCell>
                <TableCell className="text-sm">{a.assigned_to || "—"}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize text-xs">{a.condition}</Badge></TableCell>
                <TableCell><Badge className={statusColor[a.status] || ""}>{a.status}</Badge></TableCell>
                <TableCell className="text-sm">{fmt(a.purchase_cost)}</TableCell>
                <TableCell className="text-right"><div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setForm({ ...a }); setShowDialog(true); }}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(a.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No assets found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Asset" : "Add New Asset"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Asset Name *</Label><Input value={form.asset_name || ""} onChange={e => setForm(p => ({ ...p, asset_name: e.target.value }))} /></div>
              <div><Label>Type *</Label><Select value={form.asset_type || ""} onValueChange={v => setForm(p => ({ ...p, asset_type: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Serial Number</Label><Input value={form.serial_number || ""} onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))} /></div>
              <div><Label>Asset Tag</Label><Input value={form.asset_tag || ""} onChange={e => setForm(p => ({ ...p, asset_tag: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Purchase Cost</Label><Input type="number" value={form.purchase_cost || ""} onChange={e => setForm(p => ({ ...p, purchase_cost: Number(e.target.value) }))} /></div>
              <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date || ""} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Assigned To</Label><Input value={form.assigned_to || ""} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
              <div><Label>Condition</Label><Select value={form.condition || "new"} onValueChange={v => setForm(p => ({ ...p, condition: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Status</Label><Select value={form.status || "available"} onValueChange={v => setForm(p => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.asset_name || !form.asset_type}>{editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRAssetModule;
