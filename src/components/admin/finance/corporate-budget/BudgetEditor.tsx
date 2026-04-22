import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addMonths, addQuarters, addYears, endOfMonth, startOfMonth } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Send, Save } from "lucide-react";
import {
  VERTICALS,
  DEPARTMENTS,
  PERIOD_TYPES,
  fmt,
  type BudgetLine,
} from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: any | null;
}

export const BudgetEditor = ({ open, onClose, editing }: Props) => {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [periodType, setPeriodType] = useState<string>("monthly");
  const [periodStart, setPeriodStart] = useState<string>(
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<BudgetLine[]>([]);

  const { data: cats = [] } = useQuery({
    queryKey: ["corp-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("corporate_expense_categories") as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title || "");
      setDescription(editing.description || "");
      setPeriodType(editing.period_type || "monthly");
      setPeriodStart(editing.period_start || format(new Date(), "yyyy-MM-dd"));
      setNotes(editing.notes || "");
      // load lines
      (async () => {
        const { data } = await (supabase.from("corporate_budget_lines") as any)
          .select("*")
          .eq("budget_id", editing.id);
        setLines(
          (data || []).map((l: any) => ({
            id: l.id,
            category_id: l.category_id,
            category_name: l.category_name,
            vertical: l.vertical,
            department: l.department,
            planned_amount: Number(l.planned_amount || 0),
            actual_amount: Number(l.actual_amount || 0),
            notes: l.notes,
          })),
        );
      })();
    } else {
      setTitle("");
      setDescription("");
      setPeriodType("monthly");
      setPeriodStart(format(startOfMonth(new Date()), "yyyy-MM-dd"));
      setNotes("");
      setLines([]);
    }
  }, [open, editing]);

  const periodEnd = useMemo(() => {
    const start = new Date(periodStart);
    if (periodType === "monthly") return endOfMonth(start);
    if (periodType === "quarterly") return endOfMonth(addMonths(start, 2));
    return endOfMonth(addMonths(addYears(start, 1), -1));
  }, [periodStart, periodType]);

  const totalPlanned = lines.reduce((s, l) => s + Number(l.planned_amount || 0), 0);

  const addLine = () =>
    setLines((p) => [
      ...p,
      {
        category_name: cats[0]?.name || "Marketing",
        category_id: cats[0]?.id || null,
        vertical: "All",
        department: "All",
        planned_amount: 0,
      },
    ]);

  const updateLine = (idx: number, patch: Partial<BudgetLine>) =>
    setLines((p) => p.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const removeLine = (idx: number) =>
    setLines((p) => p.filter((_, i) => i !== idx));

  const saveMutation = useMutation({
    mutationFn: async (action: "draft" | "submit") => {
      if (!title.trim()) throw new Error("Title required");
      if (lines.length === 0) throw new Error("Add at least one budget line");

      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id || null;
      const userName =
        userRes?.user?.user_metadata?.full_name ||
        userRes?.user?.email ||
        "Unknown";

      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        period_type: periodType,
        period_start: periodStart,
        period_end: format(periodEnd, "yyyy-MM-dd"),
        total_planned: totalPlanned,
        notes: notes.trim() || null,
        created_by: uid,
      };
      if (action === "submit") {
        payload.status = "pending_approval";
        payload.submitted_by = uid;
        payload.submitted_by_name = userName;
        payload.submitted_at = new Date().toISOString();
      }

      let budgetId = editing?.id;
      if (editing) {
        const { error } = await (supabase.from("corporate_budgets") as any)
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        if (action === "draft") payload.status = "draft";
        const { data, error } = await (supabase.from("corporate_budgets") as any)
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        budgetId = data.id;
      }

      // Replace lines
      await (supabase.from("corporate_budget_lines") as any).delete().eq("budget_id", budgetId);
      const inserts = lines.map((l) => ({
        budget_id: budgetId,
        category_id: l.category_id || null,
        category_name: l.category_name,
        vertical: l.vertical || "All",
        department: l.department || "All",
        planned_amount: Number(l.planned_amount || 0),
        actual_amount: Number(l.actual_amount || 0),
        notes: l.notes || null,
      }));
      if (inserts.length) {
        const { error: insErr } = await (supabase.from("corporate_budget_lines") as any).insert(inserts);
        if (insErr) throw insErr;
      }

      // Audit log
      await (supabase.from("corporate_budget_approvals") as any).insert({
        budget_id: budgetId,
        action: action === "submit" ? "submitted" : "saved_draft",
        actor_id: uid,
        actor_name: userName,
        previous_status: editing?.status || null,
        new_status: action === "submit" ? "pending_approval" : "draft",
        comment: action === "submit" ? "Submitted for founder approval" : "Saved as draft",
      });

      return action;
    },
    onSuccess: (action) => {
      qc.invalidateQueries({ queryKey: ["corp-budgets"] });
      qc.invalidateQueries({ queryKey: ["corp-pending-approvals"] });
      toast.success(action === "submit" ? "Submitted for approval" : "Draft saved");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isLocked =
    editing && ["pending_approval", "approved", "active", "closed"].includes(editing.status);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Corporate Budget" : "New Corporate Budget"}
          </DialogTitle>
        </DialogHeader>

        {isLocked && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            This budget is <strong>{editing.status}</strong> and cannot be edited. Create a new
            revision to make changes.
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. April 2026 Operating Budget"
                disabled={isLocked}
              />
            </div>
            <div>
              <Label>Period Type</Label>
              <Select value={periodType} onValueChange={setPeriodType} disabled={isLocked}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIOD_TYPES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Period Start</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                disabled={isLocked}
              />
            </div>
            <div>
              <Label>Period End (auto)</Label>
              <Input value={format(periodEnd, "yyyy-MM-dd")} readOnly disabled />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Quick summary"
                disabled={isLocked}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-sm">Budget Lines</h4>
                <p className="text-xs text-muted-foreground">
                  Allocate by Category × Vertical × Department
                </p>
              </div>
              <Button onClick={addLine} size="sm" className="gap-1" disabled={isLocked}>
                <Plus className="h-3.5 w-3.5" /> Add Line
              </Button>
            </div>

            {lines.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                No lines yet. Click "Add Line" to start allocating budget.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1.2fr_36px] gap-2 px-2 text-[10px] font-medium uppercase text-muted-foreground">
                  <div>Category</div>
                  <div>Vertical</div>
                  <div>Department</div>
                  <div>Amount (₹)</div>
                  <div></div>
                </div>
                {lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[2fr_1.5fr_1.5fr_1.2fr_36px] gap-2 items-center"
                  >
                    <Select
                      value={line.category_id || ""}
                      onValueChange={(v) => {
                        const c = cats.find((x: any) => x.id === v);
                        updateLine(idx, {
                          category_id: v,
                          category_name: c?.name || line.category_name,
                        });
                      }}
                      disabled={isLocked}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        {cats.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.icon} {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={line.vertical || "All"}
                      onValueChange={(v) => updateLine(idx, { vertical: v })}
                      disabled={isLocked}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VERTICALS.map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={line.department || "All"}
                      onValueChange={(v) => updateLine(idx, { department: v })}
                      disabled={isLocked}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={line.planned_amount || ""}
                      onChange={(e) =>
                        updateLine(idx, { planned_amount: Number(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="h-9"
                      disabled={isLocked}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeLine(idx)}
                      disabled={isLocked}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-end pt-2 border-t">
                  <div className="text-sm">
                    Total Planned:{" "}
                    <span className="font-bold text-lg ml-2">{fmt(totalPlanned)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>Internal Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any context for the founder review…"
              disabled={isLocked}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {!isLocked && (
            <>
              <Button
                variant="secondary"
                onClick={() => saveMutation.mutate("draft")}
                disabled={saveMutation.isPending}
                className="gap-2"
              >
                <Save className="h-4 w-4" /> Save Draft
              </Button>
              <Button
                onClick={() => saveMutation.mutate("submit")}
                disabled={saveMutation.isPending || lines.length === 0 || !title.trim()}
                className="gap-2"
              >
                <Send className="h-4 w-4" /> Submit for Approval
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
