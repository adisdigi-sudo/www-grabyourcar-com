import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, XCircle, Clock, Inbox, Loader2, Eye, FileText, History, MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { SectionCard } from "../shared/SectionCard";
import { fmt, STATUS_META } from "../../corporate-budget/types";
import { cn } from "@/lib/utils";

type Decision = "approve" | "reject";

export const FounderApprovalQueue = () => {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null);

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["founder-approval-queue"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await (supabase.from("corporate_budgets") as any)
        .select("*")
        .eq("status", "pending_approval")
        .order("submitted_at", { ascending: true });
      return data || [];
    },
  });

  const { data: lines = [] } = useQuery({
    queryKey: ["approval-budget-lines", openId],
    enabled: !!openId,
    queryFn: async () => {
      const { data } = await (supabase.from("corporate_budget_lines") as any)
        .select("*").eq("budget_id", openId).order("planned_amount", { ascending: false });
      return data || [];
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["approval-history", openId],
    enabled: !!openId,
    queryFn: async () => {
      const { data } = await (supabase.from("corporate_budget_approvals") as any)
        .select("*").eq("budget_id", openId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const decideMutation = useMutation({
    mutationFn: async ({ id, decision, note }: { id: string; decision: Decision; note: string }) => {
      if (decision === "reject" && !note.trim()) throw new Error("Reason for rejection is required");
      const { data: u } = await supabase.auth.getUser();
      const userName = u?.user?.user_metadata?.full_name || u?.user?.email || "Founder";
      const newStatus = decision === "approve" ? "approved" : "rejected";

      const updates: any = {
        status: newStatus,
        approved_by: u?.user?.id || null,
        approved_by_name: userName,
        approved_at: new Date().toISOString(),
      };
      if (decision === "reject") updates.rejection_reason = note.trim();

      const { error: e1 } = await (supabase.from("corporate_budgets") as any).update(updates).eq("id", id);
      if (e1) throw e1;

      const { error: e2 } = await (supabase.from("corporate_budget_approvals") as any).insert({
        budget_id: id,
        action: decision,
        actor_id: u?.user?.id || null,
        actor_name: userName,
        previous_status: "pending_approval",
        new_status: newStatus,
        comment: note.trim() || null,
      });
      if (e2) throw e2;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.decision === "approve" ? "Budget approved" : "Budget rejected");
      qc.invalidateQueries({ queryKey: ["founder-approval-queue"] });
      qc.invalidateQueries({ queryKey: ["founder-final-approvals"] });
      qc.invalidateQueries({ queryKey: ["cfo-budgets-overview"] });
      qc.invalidateQueries({ queryKey: ["cfo-approvals-queue"] });
      qc.invalidateQueries({ queryKey: ["approval-history", openId] });
      setComment("");
      setPendingDecision(null);
      setOpenId(null);
    },
    onError: (e: any) => toast.error(e?.message || "Decision failed"),
  });

  const open = queue.find((b: any) => b.id === openId);

  return (
    <SectionCard
      title="Founder Approval Queue"
      description="Review, approve or reject budget plans submitted by CFO with comments"
      icon={Inbox}
      className="lg:col-span-3"
      action={
        queue.length > 0 ? (
          <Badge className="bg-amber-100 text-amber-700 border-0 gap-1">
            <Clock className="h-3 w-3" /> {queue.length} pending
          </Badge>
        ) : (
          <Badge className="bg-emerald-100 text-emerald-700 border-0">All clear</Badge>
        )
      }
    >
      {isLoading ? (
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-slate-500">Loading queue…</div>
      ) : queue.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">Inbox Zero</p>
          <p className="text-xs text-slate-500 mt-1">No budget plans awaiting your decision.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {queue.map((b: any) => (
            <div key={b.id} className="rounded-lg border border-amber-200 bg-amber-50/30 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-slate-900 truncate">{b.title}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">{b.period_type}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {b.period_start} → {b.period_end} · submitted by {b.submitted_by_name || "—"}
                    {b.submitted_at && ` · ${format(new Date(b.submitted_at), "dd MMM, p")}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums">{fmt(b.total_planned)}</p>
                  <p className="text-[10px] text-slate-500">total planned</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-3">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                  onClick={() => { setOpenId(b.id); setPendingDecision(null); setComment(""); }}>
                  <Eye className="h-3 w-3" /> Review
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => { setOpenId(b.id); setPendingDecision("reject"); setComment(""); }}>
                  <XCircle className="h-3 w-3" /> Reject
                </Button>
                <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => { setOpenId(b.id); setPendingDecision("approve"); setComment(""); }}>
                  <CheckCircle2 className="h-3 w-3" /> Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!openId} onOpenChange={(o) => { if (!o) { setOpenId(null); setPendingDecision(null); setComment(""); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{open?.title}</DialogTitle>
            <DialogDescription className="text-xs">
              {open && (
                <>
                  {open.period_start} → {open.period_end} · submitted by {open.submitted_by_name || "—"}
                  {open.submitted_at && ` · ${format(new Date(open.submitted_at), "dd MMM, p")}`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {open && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-slate-50/50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Total Planned</p>
                  <p className="text-base font-serif font-semibold mt-1 tabular-nums">{fmt(open.total_planned)}</p>
                </div>
                <div className="rounded-lg border bg-slate-50/50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Period Type</p>
                  <p className="text-base font-serif font-semibold mt-1 capitalize">{open.period_type}</p>
                </div>
                <div className="rounded-lg border bg-slate-50/50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Allocations</p>
                  <p className="text-base font-serif font-semibold mt-1 tabular-nums">{lines.length}</p>
                </div>
              </div>

              {open.description && (
                <div className="rounded-lg border bg-white p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Description</p>
                  <p className="text-sm text-slate-700">{open.description}</p>
                </div>
              )}

              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  <div className="col-span-4">Category</div>
                  <div className="col-span-3">Vertical / Dept</div>
                  <div className="col-span-2 text-right">Planned</div>
                  <div className="col-span-3">Notes</div>
                </div>
                <div className="divide-y max-h-64 overflow-y-auto">
                  {lines.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-slate-500">No allocation lines.</div>
                  ) : lines.map((l: any) => (
                    <div key={l.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-xs bg-white">
                      <div className="col-span-4 font-medium">{l.category_name}</div>
                      <div className="col-span-3 text-slate-600">{l.vertical || "All"} · {l.department || "All"}</div>
                      <div className="col-span-2 text-right tabular-nums font-semibold">{fmt(l.planned_amount)}</div>
                      <div className="col-span-3 text-slate-500 truncate">{l.notes || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>

              {history.length > 0 && (
                <div className="rounded-lg border bg-white p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-2">
                    <History className="h-3 w-3" /> Decision history
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {history.map((h: any) => (
                      <div key={h.id} className="text-[11px] flex items-start gap-2">
                        <Badge variant="outline" className="text-[9px] py-0 capitalize shrink-0">{h.action}</Badge>
                        <div className="min-w-0">
                          <p><span className="font-medium">{h.actor_name || "—"}</span>
                            {" · "}{format(new Date(h.created_at), "dd MMM, p")}</p>
                          {h.comment && <p className="text-slate-600 mt-0.5">{h.comment}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Decision panel */}
              <div className={cn("rounded-lg border p-3",
                pendingDecision === "approve" ? "border-emerald-300 bg-emerald-50/40" :
                pendingDecision === "reject" ? "border-red-300 bg-red-50/40" :
                "border-slate-200 bg-slate-50/30")}>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-2">
                  <MessageSquare className="h-3 w-3" />
                  {pendingDecision === "reject" ? "Rejection reason (required)" :
                   pendingDecision === "approve" ? "Approval note (optional)" :
                   "Add comment (optional)"}
                </div>
                <Textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={pendingDecision === "reject"
                    ? "Explain why this plan needs revision..."
                    : "Sign-off note for the team..."}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setOpenId(null); setPendingDecision(null); setComment(""); }}
              disabled={decideMutation.isPending}>
              Close
            </Button>
            <Button variant="outline" className="gap-1 border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => openId && decideMutation.mutate({ id: openId, decision: "reject", note: comment })}
              disabled={decideMutation.isPending || (pendingDecision === "reject" && !comment.trim())}>
              {decideMutation.isPending && pendingDecision === "reject" && <Loader2 className="h-3 w-3 animate-spin" />}
              <XCircle className="h-3 w-3" /> Reject
            </Button>
            <Button className="gap-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => openId && decideMutation.mutate({ id: openId, decision: "approve", note: comment })}
              disabled={decideMutation.isPending}>
              {decideMutation.isPending && pendingDecision !== "reject" && <Loader2 className="h-3 w-3 animate-spin" />}
              <CheckCircle2 className="h-3 w-3" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
};

export default FounderApprovalQueue;
