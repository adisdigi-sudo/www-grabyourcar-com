import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calculator, Calendar, Layers, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VERTICALS, DEPARTMENTS, fmt } from "../../corporate-budget/types";
import { format, addDays, addMonths, addQuarters, addYears, endOfMonth, endOfQuarter, endOfYear, startOfMonth, startOfQuarter, startOfYear, differenceInDays } from "date-fns";

type PeriodType = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

interface AllocationRow {
  id: string;
  category_name: string;
  vertical: string;
  department: string;
  planned_amount: number;
  notes: string;
}

interface BudgetPlannerDialogProps {
  open: boolean;
  onClose: () => void;
}

const PERIOD_OPTIONS: { value: PeriodType; label: string; hint: string }[] = [
  { value: "daily", label: "Daily", hint: "Single day plan" },
  { value: "weekly", label: "Weekly", hint: "7-day rolling plan" },
  { value: "monthly", label: "Monthly", hint: "Calendar month" },
  { value: "quarterly", label: "Quarterly", hint: "3-month period" },
  { value: "yearly", label: "Yearly", hint: "12-month annual plan" },
];

const computePeriod = (type: PeriodType, start: Date) => {
  switch (type) {
    case "daily":
      return { start, end: start };
    case "weekly":
      return { start, end: addDays(start, 6) };
    case "monthly": {
      const s = startOfMonth(start);
      return { start: s, end: endOfMonth(s) };
    }
    case "quarterly": {
      const s = startOfQuarter(start);
      return { start: s, end: endOfQuarter(s) };
    }
    case "yearly": {
      const s = startOfYear(start);
      return { start: s, end: endOfYear(s) };
    }
  }
};

const newRow = (): AllocationRow => ({
  id: crypto.randomUUID(),
  category_name: "",
  vertical: "All",
  department: "All",
  planned_amount: 0,
  notes: "",
});

export const BudgetPlannerDialog = ({ open, onClose }: BudgetPlannerDialogProps) => {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [periodStart, setPeriodStart] = useState<string>(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [rows, setRows] = useState<AllocationRow[]>([newRow()]);
  const [submitForApproval, setSubmitForApproval] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const rowErrors = useMemo(() => {
    return rows.map((r) => ({
      id: r.id,
      category: !r.category_name.trim(),
      amount: !(Number(r.planned_amount) > 0),
    }));
  }, [rows]);

  const titleError = !title.trim();
  const hasLineErrors = rowErrors.some((e) => e.category || e.amount);
  const hasAnyError = titleError || hasLineErrors;

  const period = useMemo(
    () => computePeriod(periodType, new Date(periodStart)),
    [periodType, periodStart]
  );

  const periodDays = useMemo(
    () => differenceInDays(period.end, period.start) + 1,
    [period]
  );

  const totalPlanned = useMemo(
    () => rows.reduce((s, r) => s + Number(r.planned_amount || 0), 0),
    [rows]
  );

  const dailyEquivalent = periodDays > 0 ? totalPlanned / periodDays : 0;
  const weeklyEquivalent = dailyEquivalent * 7;
  const monthlyEquivalent = dailyEquivalent * 30;

  const updateRow = (id: string, patch: Partial<AllocationRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const reset = () => {
    setTitle("");
    setDescription("");
    setPeriodType("monthly");
    setPeriodStart(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    setRows([newRow()]);
    setSubmitForApproval(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (titleError) {
        setShowErrors(true);
        throw new Error("Title is required");
      }
      if (hasLineErrors) {
        setShowErrors(true);
        throw new Error("Each allocation line needs a category name and a positive amount");
      }
      const validRows = rows.filter((r) => r.category_name.trim() && Number(r.planned_amount) > 0);
      if (validRows.length === 0) throw new Error("Add at least one allocation line");

      const { data: budget, error: bErr } = await (supabase.from("corporate_budgets") as any)
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          period_type: periodType,
          period_start: format(period.start, "yyyy-MM-dd"),
          period_end: format(period.end, "yyyy-MM-dd"),
          total_planned: totalPlanned,
          status: submitForApproval ? "pending_approval" : "draft",
          submitted_at: submitForApproval ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (bErr) throw bErr;

      const lines = validRows.map((r) => ({
        budget_id: budget.id,
        category_name: r.category_name.trim(),
        vertical: r.vertical === "All" ? null : r.vertical,
        department: r.department === "All" ? null : r.department,
        planned_amount: Number(r.planned_amount),
        notes: r.notes.trim() || null,
      }));

      const { error: lErr } = await (supabase.from("corporate_budget_lines") as any).insert(lines);
      if (lErr) throw lErr;

      return budget;
    },
    onSuccess: () => {
      toast.success(submitForApproval ? "Budget submitted for approval" : "Budget saved as draft");
      qc.invalidateQueries({ queryKey: ["cfo-budgets-overview"] });
      qc.invalidateQueries({ queryKey: ["corp-pending-approvals"] });
      reset();
      onClose();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save budget"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-serif text-xl">New Budget Plan</DialogTitle>
              <DialogDescription className="text-xs">
                Auto-splits across day/week/month/quarter/year · vertical-wise allocation
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Identity */}
          <section className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700">Plan Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q1 2026 — All Verticals Operating Budget"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700">Description (optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Internal context, assumptions, scope"
                  className="mt-1.5"
                />
              </div>
            </div>
          </section>

          {/* Period Selector */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-700" />
              <h4 className="font-serif font-semibold text-sm text-slate-900">Period</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriodType(p.value)}
                  className={cn(
                    "text-left rounded-lg border p-3 transition-all",
                    periodType === p.value
                      ? "border-slate-900 bg-slate-900 text-white shadow"
                      : "border-slate-200 bg-white hover:border-slate-400"
                  )}
                >
                  <p className="font-semibold text-sm">{p.label}</p>
                  <p className={cn("text-[10px] mt-0.5", periodType === p.value ? "text-slate-300" : "text-slate-500")}>
                    {p.hint}
                  </p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <Label className="text-xs font-medium text-slate-700">Start Date</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div className="md:col-span-2 rounded-lg border bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Computed Period</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                  {format(period.start, "dd MMM yyyy")} → {format(period.end, "dd MMM yyyy")}
                  <span className="ml-2 text-xs font-normal text-slate-500">({periodDays} day{periodDays > 1 ? "s" : ""})</span>
                </p>
              </div>
            </div>
          </section>

          {/* Allocation Lines */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-700" />
                <h4 className="font-serif font-semibold text-sm text-slate-900">Vertical-wise Allocation</h4>
                <Badge variant="outline" className="text-[10px]">{rows.length} line{rows.length > 1 ? "s" : ""}</Badge>
              </div>
              <Button size="sm" variant="outline" onClick={() => setRows((p) => [...p, newRow()])} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Line
              </Button>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                <div className="col-span-3">Category</div>
                <div className="col-span-2">Vertical</div>
                <div className="col-span-2">Department</div>
                <div className="col-span-2 text-right">Planned (₹)</div>
                <div className="col-span-2">Notes</div>
                <div className="col-span-1"></div>
              </div>
              <div className="divide-y">
                {rows.map((r, idx) => (
                  <div key={r.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-3 py-2.5 bg-white hover:bg-slate-50/50">
                    <div className="md:col-span-3">
                      <Input
                        value={r.category_name}
                        onChange={(e) => updateRow(r.id, { category_name: e.target.value })}
                        placeholder={`Category ${idx + 1} (e.g. Salaries, Ads)`}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Select value={r.vertical} onValueChange={(v) => updateRow(r.id, { vertical: v })}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VERTICALS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Select value={r.department} onValueChange={(v) => updateRow(r.id, { department: v })}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        type="number"
                        min={0}
                        value={r.planned_amount || ""}
                        onChange={(e) => updateRow(r.id, { planned_amount: Number(e.target.value) || 0 })}
                        placeholder="0"
                        className="h-9 text-sm text-right tabular-nums"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        value={r.notes}
                        onChange={(e) => updateRow(r.id, { notes: e.target.value })}
                        placeholder="Optional"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeRow(r.id)}
                        disabled={rows.length === 1}
                        className="h-9 w-9 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Auto-Split Summary */}
          <section className="rounded-xl border bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4" />
              <h4 className="font-serif font-semibold text-sm">Auto-Split Breakdown</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Total Planned", value: fmt(totalPlanned), accent: true },
                { label: "Per Day", value: fmt(dailyEquivalent) },
                { label: "Per Week", value: fmt(weeklyEquivalent) },
                { label: "Per Month", value: fmt(monthlyEquivalent) },
                { label: "Per Day × Period", value: `${periodDays}d` },
              ].map((s) => (
                <div key={s.label} className={cn("rounded-lg p-3", s.accent ? "bg-amber-500/20 border border-amber-500/40" : "bg-white/5")}>
                  <p className="text-[10px] uppercase tracking-wider text-slate-300">{s.label}</p>
                  <p className="text-sm font-bold mt-1 tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-3">
              Linear distribution. Actual allocation per period can be customized after approval via P&L Designer.
            </p>
          </section>

          {/* Approval Toggle */}
          <section className="rounded-lg border bg-amber-50/50 border-amber-200 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={submitForApproval}
                onChange={(e) => setSubmitForApproval(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">Submit for Founder approval immediately</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  If unchecked, plan saves as Draft and can be edited later before submission.
                </p>
              </div>
            </label>
          </section>
        </div>

        <DialogFooter className="border-t pt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !title.trim() || totalPlanned === 0}
            className="gap-2 bg-slate-900 hover:bg-slate-800"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitForApproval ? "Submit for Approval" : "Save as Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetPlannerDialog;
