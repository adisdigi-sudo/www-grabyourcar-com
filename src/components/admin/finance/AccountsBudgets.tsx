import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const fmt = (v: number) => `₹${Math.round(v || 0).toLocaleString("en-IN")}`;
const CATEGORIES = ["Marketing", "Salaries", "Office Rent", "Utilities", "Software", "Travel", "Equipment", "Fuel", "Insurance", "Legal", "Miscellaneous"];
const VERTICALS = ["Car Sales", "Insurance", "Car Loans", "HSRP", "Rental", "Accessories", "General", "Marketing", "HR", "Operations"];

const AccountsBudgets = () => {
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const { data: budgets = [] } = useQuery({
    queryKey: ["acc-budgets"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("budgets") as any).select("*").order("period", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rec: any) => {
      const payload = { ...rec };
      if (!editing) delete payload.id;
      payload.budgeted_amount = Number(payload.budgeted_amount || 0);
      payload.actual_amount = Number(payload.actual_amount || 0);
      const { error } = await (supabase.from("budgets") as any).upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["acc-budgets"] });
      toast.success(editing ? "Updated" : "Budget set");
      setShowDialog(false); setEditing(null); setForm({});
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("budgets") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["acc-budgets"] }); toast.success("Deleted"); },
  });

  const totalBudgeted = budgets.reduce((s: number, b: any) => s + Number(b.budgeted_amount || 0), 0);
  const totalActual = budgets.reduce((s: number, b: any) => s + Number(b.actual_amount || 0), 0);
  const utilization = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Budgeted</p><p className="text-2xl font-bold">{fmt(totalBudgeted)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Actual Spent</p><p className="text-2xl font-bold text-red-600">{fmt(totalActual)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Remaining</p><p className="text-2xl font-bold text-green-600">{fmt(totalBudgeted - totalActual)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Utilization</p><p className="text-2xl font-bold">{utilization.toFixed(0)}%</p><Progress value={Math.min(utilization, 100)} className="mt-2 h-2" /></CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Target className="h-5 w-5" /> Budget Planning</h3>
        <Button onClick={() => { setEditing(null); setForm({ period: format(new Date(), "yyyy-MM") }); setShowDialog(true); }} className="gap-2"><Plus className="h-4 w-4" /> Set Budget</Button>
      </div>

      {budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b: any) => {
            const pct = Number(b.budgeted_amount) > 0 ? (Number(b.actual_amount) / Number(b.budgeted_amount)) * 100 : 0;
            const overBudget = pct > 100;
            return (
              <Card key={b.id} className={overBudget ? "border-red-200" : ""}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-sm">{b.category}</p>
                      <p className="text-xs text-muted-foreground">{b.period} {b.vertical_name ? `• ${b.vertical_name}` : ""}</p>
                    </div>
                    <div className="flex gap-1">
                      {overBudget && <Badge variant="destructive" className="text-xs">Over Budget</Badge>}
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditing(b); setForm({ ...b }); setShowDialog(true); }}><Edit2 className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(b.id); }}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="font-medium">{fmt(b.budgeted_amount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Actual</span>
                      <span className={`font-medium ${overBudget ? "text-red-600" : "text-green-600"}`}>{fmt(b.actual_amount)}</span>
                    </div>
                    <Progress value={Math.min(pct, 100)} className={`h-2 ${overBudget ? "[&>div]:bg-red-500" : ""}`} />
                    <p className="text-xs text-right text-muted-foreground">{pct.toFixed(0)}% used</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card><CardContent className="p-16 text-center text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No budgets set yet</p>
          <p className="text-sm mt-1">Create budgets to track spending against targets</p>
        </CardContent></Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Budget" : "Set Budget"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category *</Label><Select value={form.category || ""} onValueChange={v => setForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Period</Label><Input type="month" value={form.period || ""} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Budget Amount *</Label><Input type="number" value={form.budgeted_amount || ""} onChange={e => setForm(p => ({ ...p, budgeted_amount: e.target.value }))} /></div>
              <div><Label>Actual (so far)</Label><Input type="number" value={form.actual_amount || ""} onChange={e => setForm(p => ({ ...p, actual_amount: e.target.value }))} /></div>
            </div>
            <div><Label>Vertical</Label><Select value={form.vertical_name || ""} onValueChange={v => setForm(p => ({ ...p, vertical_name: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Notes</Label><Input value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => upsertMutation.mutate(form)} disabled={!form.category || !form.budgeted_amount}>{editing ? "Update" : "Set Budget"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsBudgets;
