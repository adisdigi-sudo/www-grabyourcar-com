import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Wallet, Inbox, Target, FileSpreadsheet, TrendingUp, TrendingDown,
  ClipboardList, Briefcase, Calendar, ArrowRight, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { SectionCard } from "../shared/SectionCard";
import { StatTile } from "../shared/StatTile";
import { fmt } from "../../corporate-budget/types";
import { BudgetPlannerDialog } from "./BudgetPlannerDialog";
import { BudgetDetailDialog } from "../../corporate-budget/BudgetDetailDialog";
import { UtilizationInsights } from "./UtilizationInsights";
import { TeamTargets } from "./TeamTargets";
import { MonthlyPLDesigner } from "./MonthlyPLDesigner";

const CFOView = () => {
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plDesignerOpen, setPlDesignerOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: budgets = [] } = useQuery({
    queryKey: ["cfo-budgets-overview"],
    queryFn: async () => {
      const { data } = await (supabase.from("corporate_budgets") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ["cfo-approvals-queue"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await (supabase.from("approvals_queue") as any)
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const totalPlanned = budgets.reduce((s: number, b: any) => s + Number(b.total_planned || 0), 0);
  const totalActual = budgets.reduce((s: number, b: any) => s + Number(b.total_actual || 0), 0);
  const variance = totalPlanned - totalActual;
  const utilization = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Executive KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Total Planned"
          value={fmt(totalPlanned)}
          icon={Wallet}
          hint={`${budgets.length} budget plans`}
        />
        <StatTile
          label="Total Actual Spend"
          value={fmt(totalActual)}
          icon={TrendingUp}
          trend={utilization > 90 ? "down" : "up"}
          trendLabel={`${utilization}% used`}
        />
        <StatTile
          label="Variance"
          value={fmt(Math.abs(variance))}
          icon={variance >= 0 ? TrendingUp : TrendingDown}
          trend={variance >= 0 ? "up" : "down"}
          trendLabel={variance >= 0 ? "Under budget" : "Over budget"}
        />
        <StatTile
          label="Pending Approvals"
          value={String(pendingApprovals.length)}
          icon={Inbox}
          trend={pendingApprovals.length > 0 ? "down" : "neutral"}
          trendLabel={pendingApprovals.length > 0 ? "Action needed" : "All clear"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Budget Planner */}
        <SectionCard
          title="Budget Planner"
          description="Auto-split D/W/M/Q/Y · Vertical-wise allocation"
          icon={Calendar}
          className="lg:col-span-2"
          action={
            <Button size="sm" className="gap-1 bg-slate-900 hover:bg-slate-800" onClick={() => setPlannerOpen(true)}>
              <ClipboardList className="h-3.5 w-3.5" /> New Plan
            </Button>
          }
        >
          {budgets.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-slate-500">
              No budget plans yet. Create your first corporate budget plan.
            </div>
          ) : (
            <div className="space-y-2">
              {budgets.slice(0, 5).map((b: any) => {
                const used = Number(b.total_actual || 0);
                const planned = Number(b.total_planned || 0);
                const pct = planned > 0 ? Math.min(100, Math.round((used / planned) * 100)) : 0;
                return (
                  <button
                    key={b.id}
                    onClick={() => setDetailId(b.id)}
                    className="w-full text-left rounded-lg border bg-white p-3 hover:border-slate-400 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-slate-900 truncate">{b.title}</p>
                          <Badge variant="outline" className="text-[10px] capitalize">{b.period_type}</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {b.period_start} → {b.period_end} · {b.status}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums">{fmt(used)}<span className="text-slate-400 font-normal"> / {fmt(planned)}</span></p>
                        <p className="text-[10px] text-slate-500">{pct}% utilized</p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Approval Inbox */}
        <SectionCard
          title="Approval Inbox"
          description="Spend requests waiting for CFO sign-off"
          icon={Inbox}
          action={
            pendingApprovals.length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-0 gap-1">
                <Clock className="h-3 w-3" /> {pendingApprovals.length}
              </Badge>
            )
          }
        >
          {pendingApprovals.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-slate-500">
              All caught up — no pending requests.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {pendingApprovals.map((a: any) => (
                <button
                  key={a.id}
                  className="w-full text-left rounded-lg border border-amber-200 bg-amber-50/40 hover:bg-amber-50 p-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs text-slate-900 truncate">{a.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {a.requested_by_name || "—"} · {format(new Date(a.created_at), "dd MMM, p")}
                      </p>
                    </div>
                    {a.amount && (
                      <p className="text-xs font-semibold tabular-nums shrink-0">{fmt(a.amount)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Utilization Insights — full width charts */}
        <UtilizationInsights />

        {/* Team Targets — full width */}
        <TeamTargets />

        {/* Monthly P&L Designer launcher */}
        <SectionCard
          title="Monthly P&L Designer"
          description="Allocate revenue & expense buckets per category, generate downloadable P&L"
          icon={FileSpreadsheet}
          className="lg:col-span-2"
          action={
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setPlDesignerOpen(true)}>
              <ArrowRight className="h-3.5 w-3.5" /> Open Designer
            </Button>
          }
        >
          <div className="rounded-lg border bg-slate-50/50 p-4">
            <p className="text-sm font-medium text-slate-900">Excel-style P&L builder</p>
            <p className="text-xs text-slate-500 mt-1">
              Auto-fill from live invoices & expenses · per-vertical revenue lines · custom expense buckets · CSV / PDF export.
            </p>
          </div>
        </SectionCard>

        {/* Documents */}
        <SectionCard
          title="Loan & Company Docs"
          description="Sanction letters, MOAs, statutory filings"
          icon={Briefcase}
          className="lg:col-span-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {["Loan Documents", "Company Documents", "Draft Reports"].map((d) => (
              <div key={d} className="rounded-lg border bg-slate-50/50 p-4 text-center">
                <p className="font-medium text-sm text-slate-900">{d}</p>
                <p className="text-[11px] text-slate-500 mt-1">0 files</p>
                <Button size="sm" variant="ghost" className="mt-2 text-xs h-7">Open drawer</Button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <BudgetPlannerDialog open={plannerOpen} onClose={() => setPlannerOpen(false)} />
      <BudgetDetailDialog budgetId={detailId} onClose={() => setDetailId(null)} />
      <MonthlyPLDesigner open={plDesignerOpen} onClose={() => setPlDesignerOpen(false)} />
    </div>
  );
};

export default CFOView;
