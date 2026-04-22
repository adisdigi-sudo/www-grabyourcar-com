import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Edit2, Calculator } from "lucide-react";
import { toast } from "sonner";
import {
  Period, PERIOD_LABELS, expandAll, fmtINR, VERTICALS, DEFAULT_CATEGORIES,
} from "./periodMath";

type Plan = {
  id: string;
  category_name: string;
  vertical: string | null;
  base_amount: number;
  base_period: Period;
  is_active: boolean;
  notes: string | null;
};

export const SpendPlannerTab = () => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [verticalFilter, setVerticalFilter] = useState<string>("All");

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["spend_plans"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("spend_plans") as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Plan[];
    },
  });

  const filtered = verticalFilter === "All"
    ? plans
    : plans.filter(p => (p.vertical || "General") === verticalFilter);

  // Totals across all active plans → sum of monthly equivalents
  const totals = (() => {
    const sums = { daily: 0, weekly: 0, monthly: 0, quarterly: 0, half_yearly: 0, yearly: 0 };
    filtered.filter(p => p.is_active).forEach(p => {
      const e = expandAll(Number(p.base_amount), p.base_period);
      sums.daily += e.daily;
      sums.weekly += e.weekly;
      sums.monthly += e.monthly;
      sums.quarterly += e.quarterly;
      sums.half_yearly += e.half_yearly;
      sums.yearly += e.yearly;
    });
    return sums;
  })();

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this spend plan?")) return;
    const { error } = await (supabase.from("spend_plans") as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["spend_plans"] });
  };

  const toggleActive = async (p: Plan) => {
    const { error } = await (supabase.from("spend_plans") as any)
      .update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["spend_plans"] });
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <Card key={p} className="border-l-4 border-l-blue-500">
            <CardContent className="p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                {PERIOD_LABELS[p]}
              </p>
              <p className="text-lg font-bold mt-1">{fmtINR(totals[p])}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Vertical</Label>
          <Select value={verticalFilter} onValueChange={setVerticalFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VERTICALS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Spend Plan
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" /> Category Spend Plans (auto-calculated periods)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Vertical</TableHead>
                <TableHead className="text-right">Daily</TableHead>
                <TableHead className="text-right">Weekly</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead className="text-right">Quarterly</TableHead>
                <TableHead className="text-right">Half-Yearly</TableHead>
                <TableHead className="text-right">Yearly</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">No plans yet. Click "New Spend Plan" to start.</TableCell></TableRow>
              ) : filtered.map(p => {
                const e = expandAll(Number(p.base_amount), p.base_period);
                return (
                  <TableRow key={p.id} className={!p.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-medium">
                      {p.category_name}
                      <div className="text-[11px] text-muted-foreground">
                        Base: {fmtINR(p.base_amount)} / {PERIOD_LABELS[p.base_period]}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{p.vertical || "General"}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtINR(e.daily)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtINR(e.weekly)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{fmtINR(e.monthly)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtINR(e.quarterly)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtINR(e.half_yearly)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtINR(e.yearly)}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["spend_plans"] })}
      />
    </div>
  );
};

const PlanDialog = ({
  open, onOpenChange, editing, onSaved,
}: { open: boolean; onOpenChange: (b: boolean) => void; editing: Plan | null; onSaved: () => void }) => {
  const [category, setCategory] = useState(editing?.category_name || "Marketing");
  const [customCategory, setCustomCategory] = useState("");
  const [vertical, setVertical] = useState(editing?.vertical || "General");
  const [amount, setAmount] = useState(editing?.base_amount?.toString() || "");
  const [period, setPeriod] = useState<Period>(editing?.base_period || "monthly");
  const [notes, setNotes] = useState(editing?.notes || "");
  const [saving, setSaving] = useState(false);

  // Reset when opening
  const reset = () => {
    setCategory(editing?.category_name || "Marketing");
    setCustomCategory("");
    setVertical(editing?.vertical || "General");
    setAmount(editing?.base_amount?.toString() || "");
    setPeriod(editing?.base_period || "monthly");
    setNotes(editing?.notes || "");
  };

  const preview = expandAll(Number(amount) || 0, period);

  const save = async () => {
    const finalCategory = category === "__custom__" ? customCategory.trim() : category;
    if (!finalCategory) return toast.error("Select or enter a category");
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount");

    setSaving(true);
    const payload = {
      category_name: finalCategory,
      vertical: vertical === "All" ? "General" : vertical,
      base_amount: Number(amount),
      base_period: period,
      notes: notes || null,
      is_active: true,
    };

    const { error } = editing
      ? await (supabase.from("spend_plans") as any).update(payload).eq("id", editing.id)
      : await (supabase.from("spend_plans") as any).insert(payload);

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Updated" : "Created");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (b) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Spend Plan" : "New Spend Plan"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEFAULT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value="__custom__">+ Custom…</SelectItem>
                </SelectContent>
              </Select>
              {category === "__custom__" && (
                <Input
                  className="mt-2" placeholder="Custom category name"
                  value={customCategory} onChange={e => setCustomCategory(e.target.value)}
                />
              )}
            </div>
            <div>
              <Label>Vertical</Label>
              <Select value={vertical} onValueChange={setVertical}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VERTICALS.filter(v => v !== "All").map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500" />
            </div>
            <div>
              <Label>Per Period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                    <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
          </div>

          {/* Live preview */}
          <Card className="bg-muted/40">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Auto-calculated breakdown:</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                  <div key={p}>
                    <p className="text-muted-foreground">{PERIOD_LABELS[p]}</p>
                    <p className="font-semibold">{fmtINR(preview[p])}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Plan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
