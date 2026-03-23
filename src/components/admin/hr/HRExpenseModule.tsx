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
import { Receipt, Plus, Search, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";

const CATEGORIES = ["Travel", "Food & Meals", "Office Supplies", "Equipment", "Medical", "Training", "Fuel", "Internet", "Phone", "Other"];
const STATUSES = ["pending", "approved", "rejected", "paid"];

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;

export const HRExpenseModule = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [tab, setTab] = useState("all");

  const { data: claims = [] } = useQuery({
    queryKey: ["hr-expense-claims"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("hr_expense_claims") as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const payload = { ...rec };
      if (!editing) delete payload.id;
      const { error } = await (supabase.from("hr_expense_claims") as any).upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-expense-claims"] }); toast.success(editing ? "Updated" : "Claim created"); setShowDialog(false); setEditing(null); setForm({}); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.from("hr_expense_claims") as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-expense-claims"] }); toast.success("Deleted"); },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from("hr_expense_claims") as any).update({ status, approved_at: status === "approved" ? new Date().toISOString() : null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-expense-claims"] }); toast.success("Status updated"); },
  });

  const totalPending = claims.filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + Number(c.amount), 0);
  const totalApproved = claims.filter((c: any) => c.status === "approved" || c.status === "paid").reduce((s: number, c: any) => s + Number(c.amount), 0);

  const filtered = claims.filter((c: any) => {
    const matchSearch = !search || c.employee_name?.toLowerCase().includes(search.toLowerCase()) || c.category?.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || c.status === tab;
    return matchSearch && matchTab;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Claims</p><p className="text-2xl font-bold">{claims.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending Amount</p><p className="text-2xl font-bold text-yellow-600">{fmt(totalPending)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approved/Paid</p><p className="text-2xl font-bold text-green-600">{fmt(totalApproved)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending Review</p><p className="text-2xl font-bold text-orange-600">{claims.filter((c: any) => c.status === "pending").length}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 items-center flex-wrap">
          {["all", ...STATUSES].map(s => (
            <Button key={s} variant={tab === s ? "default" : "outline"} size="sm" onClick={() => setTab(s)} className="capitalize">{s} ({s === "all" ? claims.length : claims.filter((c: any) => c.status === s).length})</Button>
          ))}
        </div>
        <Button onClick={() => { setEditing(null); setForm({ claim_date: format(new Date(), "yyyy-MM-dd"), status: "pending" }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> New Claim</Button>
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Employee</TableHead><TableHead>Category</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell><div><p className="font-medium text-sm">{c.employee_name}</p><p className="text-xs text-muted-foreground">{c.description}</p></div></TableCell>
                <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                <TableCell className="font-medium">{fmt(c.amount)}</TableCell>
                <TableCell className="text-sm">{c.claim_date ? format(new Date(c.claim_date), "dd MMM yyyy") : "—"}</TableCell>
                <TableCell><Badge className={statusColor[c.status]}>{c.status}</Badge></TableCell>
                <TableCell className="text-right"><div className="flex gap-1 justify-end">
                  {c.status === "pending" && <>
                    <Button size="icon" variant="ghost" className="text-green-600" onClick={() => approveMutation.mutate({ id: c.id, status: "approved" })}><CheckCircle2 className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-red-600" onClick={() => approveMutation.mutate({ id: c.id, status: "rejected" })}><XCircle className="h-4 w-4" /></Button>
                  </>}
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setForm({ ...c }); setShowDialog(true); }}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No claims found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Claim" : "New Expense Claim"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Employee Name *</Label><Input value={form.employee_name || ""} onChange={e => setForm(p => ({ ...p, employee_name: e.target.value }))} /></div>
              <div><Label>Category *</Label><Select value={form.category || ""} onValueChange={v => setForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount *</Label><Input type="number" value={form.amount || ""} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
              <div><Label>Claim Date</Label><Input type="date" value={form.claim_date || ""} onChange={e => setForm(p => ({ ...p, claim_date: e.target.value }))} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div><Label>Notes</Label><Input value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.employee_name || !form.category || !form.amount}>{editing ? "Update" : "Submit Claim"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HRExpenseModule;
