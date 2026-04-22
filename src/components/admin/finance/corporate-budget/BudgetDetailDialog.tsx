import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, History } from "lucide-react";
import { fmt, STATUS_META } from "./types";

interface Props {
  budgetId: string | null;
  onClose: () => void;
}

export const BudgetDetailDialog = ({ budgetId, onClose }: Props) => {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: budget } = useQuery({
    queryKey: ["corp-budget", budgetId],
    enabled: !!budgetId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("corporate_budgets") as any)
        .select("*")
        .eq("id", budgetId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: lines = [] } = useQuery({
    queryKey: ["corp-budget-lines", budgetId],
    enabled: !!budgetId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("corporate_budget_lines") as any)
        .select("*")
        .eq("budget_id", budgetId)
        .order("category_name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["corp-budget-history", budgetId],
    enabled: !!budgetId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("corporate_budget_approvals") as any)
        .select("*")
        .eq("budget_id", budgetId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const decideMutation = useMutation({
    mutationFn: async (decision: "approve" | "reject") => {
      if (decision === "reject" && !comment.trim()) {
        throw new Error("Please provide a reason for rejection");
      }
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id || null;
      const userName =
        userRes?.user?.user_metadata?.full_name ||
        userRes?.user?.email ||
        "Founder";

      const newStatus = decision === "approve" ? "approved" : "rejected";
      const updates: any = {
        status: newStatus,
        approved_by: uid,
        approved_by_name: userName,
        approved_at: new Date().toISOString(),
      };
      if (decision === "reject") updates.rejection_reason = comment.trim();

      const { error } = await (supabase.from("corporate_budgets") as any)
        .update(updates)
        .eq("id", budgetId);
      if (error) throw error;

      await (supabase.from("corporate_budget_approvals") as any).insert({
        budget_id: budgetId,
        action: decision === "approve" ? "approved" : "rejected",
        actor_id: uid,
        actor_name: userName,
        previous_status: budget?.status,
        new_status: newStatus,
        comment: comment.trim() || (decision === "approve" ? "Approved" : null),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["corp-budgets"] });
      qc.invalidateQueries({ queryKey: ["corp-pending-approvals"] });
      qc.invalidateQueries({ queryKey: ["corp-budget", budgetId] });
      qc.invalidateQueries({ queryKey: ["corp-budget-history", budgetId] });
      toast.success("Decision recorded");
      setComment("");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!budget) return null;

  const statusMeta = STATUS_META[budget.status] || STATUS_META.draft;
  const utilization =
    budget.total_planned > 0
      ? (Number(budget.total_actual) / Number(budget.total_planned)) * 100
      : 0;

  // Group lines by category
  const byCategory: Record<string, any[]> = {};
  lines.forEach((l: any) => {
    if (!byCategory[l.category_name]) byCategory[l.category_name] = [];
    byCategory[l.category_name].push(l);
  });

  return (
    <Dialog open={!!budgetId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle>{budget.title}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {budget.period_start} → {budget.period_end} · {budget.period_type}
              </p>
            </div>
            <Badge className={`${statusMeta.bg} ${statusMeta.color} border-0`}>
              {statusMeta.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Planned</p>
            <p className="text-xl font-bold">{fmt(budget.total_planned)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Actual Spent</p>
            <p className="text-xl font-bold text-amber-600">{fmt(budget.total_actual)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-xl font-bold text-emerald-600">
              {fmt(Number(budget.total_planned) - Number(budget.total_actual))}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Utilization</p>
            <p className="text-xl font-bold">{utilization.toFixed(0)}%</p>
            <Progress value={Math.min(utilization, 100)} className="mt-1 h-1.5" />
          </div>
        </div>

        {budget.description && (
          <div className="rounded-md bg-muted/40 p-3 text-sm">{budget.description}</div>
        )}

        <div>
          <h4 className="font-semibold text-sm mb-2">Budget Breakdown</h4>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Vertical</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(byCategory).map((cat) =>
                  byCategory[cat].map((l: any, i) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">
                        {i === 0 ? cat : <span className="text-muted-foreground pl-3">↳</span>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{l.vertical}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{l.department}</Badge></TableCell>
                      <TableCell className="text-right">{fmt(l.planned_amount)}</TableCell>
                      <TableCell className="text-right text-amber-600">
                        {fmt(l.actual_amount)}
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {budget.status === "pending_approval" && (
          <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <p className="font-semibold text-sm">Founder Review Required</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Submitted by <strong>{budget.submitted_by_name}</strong>
              {budget.submitted_at && ` on ${format(new Date(budget.submitted_at), "PP p")}`}
            </p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional comment (required if rejecting)…"
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => decideMutation.mutate("reject")}
                disabled={decideMutation.isPending}
                className="gap-1"
              >
                <XCircle className="h-4 w-4" /> Reject
              </Button>
              <Button
                size="sm"
                onClick={() => decideMutation.mutate("approve")}
                disabled={decideMutation.isPending}
                className="gap-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Approve
              </Button>
            </div>
          </div>
        )}

        {budget.status === "rejected" && budget.rejection_reason && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm">
            <p className="font-medium text-red-800 mb-1">Rejection Reason</p>
            <p className="text-red-700">{budget.rejection_reason}</p>
          </div>
        )}

        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <History className="h-4 w-4" /> Activity Log
          </h4>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {history.map((h: any) => (
              <div key={h.id} className="flex items-start gap-2 text-xs border-l-2 border-muted pl-3 py-1">
                <div className="flex-1">
                  <p>
                    <span className="font-medium">{h.actor_name || "System"}</span>{" "}
                    <span className="text-muted-foreground">{h.action.replace(/_/g, " ")}</span>
                    {h.previous_status && h.new_status && (
                      <> · {h.previous_status} → {h.new_status}</>
                    )}
                  </p>
                  {h.comment && <p className="text-muted-foreground italic">"{h.comment}"</p>}
                </div>
                <span className="text-muted-foreground whitespace-nowrap">
                  {format(new Date(h.created_at), "dd MMM, p")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
