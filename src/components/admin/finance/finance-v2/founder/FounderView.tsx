import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Crown, FileDown, CheckCircle2, XCircle, BarChart3, FileText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { SectionCard } from "../shared/SectionCard";
import { StatTile } from "../shared/StatTile";
import { fmt } from "../../corporate-budget/types";

const FounderView = () => {
  const { data: pendingFinal = [] } = useQuery({
    queryKey: ["founder-final-approvals"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await (supabase.from("corporate_budgets") as any)
        .select("*")
        .eq("status", "pending_approval")
        .order("submitted_at", { ascending: true });
      return data || [];
    },
  });

  const { data: monthSummary } = useQuery({
    queryKey: ["founder-month-summary"],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      const startStr = start.toISOString().split("T")[0];

      const [exp, inv] = await Promise.all([
        (supabase.from("expenses") as any).select("amount").gte("expense_date", startStr),
        (supabase.from("invoices") as any).select("total_amount,status").gte("created_at", startStr),
      ]);
      const totalExpense = (exp.data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const totalRevenue = (inv.data || []).reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
      return { totalExpense, totalRevenue, profit: totalRevenue - totalExpense };
    },
  });

  return (
    <div className="space-y-5">
      {/* Executive Banner */}
      <div className="rounded-xl border bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-600 flex items-center justify-center shadow">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-amber-700">Founder Office</p>
            <h2 className="text-xl font-serif font-semibold text-slate-900">Executive Summary — {format(new Date(), "MMMM yyyy")}</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Revenue (MTD)" value={fmt(monthSummary?.totalRevenue || 0)} icon={TrendingUp} trend="up" trendLabel="Live" />
        <StatTile label="Expense (MTD)" value={fmt(monthSummary?.totalExpense || 0)} icon={BarChart3} />
        <StatTile
          label="Net Profit (MTD)"
          value={fmt(Math.abs(monthSummary?.profit || 0))}
          trend={(monthSummary?.profit || 0) >= 0 ? "up" : "down"}
          trendLabel={(monthSummary?.profit || 0) >= 0 ? "Surplus" : "Deficit"}
          icon={TrendingUp}
        />
        <StatTile
          label="Final Approvals Pending"
          value={String(pendingFinal.length)}
          icon={CheckCircle2}
          trend={pendingFinal.length > 0 ? "down" : "neutral"}
          trendLabel={pendingFinal.length > 0 ? "Your sign-off" : "All clear"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Final Approval Center */}
        <SectionCard
          title="Final Approval Center"
          description="CFO-screened budgets awaiting founder sign-off"
          icon={CheckCircle2}
          className="lg:col-span-2"
        >
          {pendingFinal.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-slate-500">
              All clear — nothing awaiting your sign-off.
            </div>
          ) : (
            <div className="space-y-2">
              {pendingFinal.map((b: any) => (
                <div key={b.id} className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-slate-900 truncate">{b.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Submitted by {b.submitted_by_name || "—"} ·{" "}
                        {b.submitted_at && format(new Date(b.submitted_at), "dd MMM, p")}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums shrink-0">{fmt(b.total_planned)}</p>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-3">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                      <XCircle className="h-3 w-3" /> Reject
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Reports Library */}
        <SectionCard title="Reports Library" description="Download P&L · Balance Sheet · GST" icon={FileText}>
          <div className="space-y-2">
            {[
              "Monthly P&L (PDF)",
              "Monthly P&L (Excel)",
              "Cash Flow Statement",
              "Vertical-wise Revenue",
              "Expense Breakdown",
            ].map((r) => (
              <button
                key={r}
                className="w-full flex items-center justify-between text-left rounded-lg border bg-white hover:bg-slate-50 px-3 py-2 transition-colors"
              >
                <span className="text-xs font-medium text-slate-900">{r}</span>
                <FileDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
            ))}
          </div>
        </SectionCard>

        {/* P&L Comparison */}
        <SectionCard
          title="Profit & Loss Comparison"
          description="Month-over-month and Year-over-year trends"
          icon={BarChart3}
          className="lg:col-span-3"
        >
          <div className="rounded-lg border border-dashed py-12 text-center text-sm text-slate-500">
            P&L comparison chart (next turn) — pulls from CFO Monthly P&L Designer.
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default FounderView;
