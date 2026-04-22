import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowRight, Clock, Inbox } from "lucide-react";
import { BudgetDetailDialog } from "@/components/admin/finance/corporate-budget/BudgetDetailDialog";
import { fmt } from "@/components/admin/finance/corporate-budget/types";

export const BudgetApprovalQueue = () => {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: pending = [] } = useQuery({
    queryKey: ["corp-pending-approvals"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await (supabase.from("corporate_budgets") as any)
        .select("*")
        .eq("status", "pending_approval")
        .order("submitted_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Budget Approvals
            </h2>
            <p className="text-xs text-muted-foreground">
              Corporate budget plans waiting for your sign-off
            </p>
          </div>
        </div>
        {pending.length > 0 && (
          <Badge className="bg-amber-100 text-amber-700 border-0 gap-1">
            <Clock className="h-3 w-3" /> {pending.length} pending
          </Badge>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center">
          <Inbox className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium">All caught up</p>
          <p className="text-xs text-muted-foreground mt-1">
            No budget plans waiting for approval
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((b: any) => (
            <button
              key={b.id}
              onClick={() => setOpenId(b.id)}
              className="w-full text-left rounded-lg border border-amber-200 bg-amber-50/40 hover:bg-amber-50 p-3 transition-colors flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{b.title}</p>
                <p className="text-xs text-muted-foreground">
                  {b.submitted_by_name || "—"} ·{" "}
                  {b.submitted_at &&
                    format(new Date(b.submitted_at), "dd MMM, p")}{" "}
                  · {b.period_type}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-sm">{fmt(b.total_planned)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {b.period_start} → {b.period_end}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}

      <BudgetDetailDialog budgetId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
};

export default BudgetApprovalQueue;
