/**
 * CFO Cockpit — dedicated workspace for the CFO role.
 * Houses budget planning, monthly P&L history (auto-saved), CFO approvals,
 * and the live financial intelligence reports — all in one isolated workspace.
 */
import { lazy, Suspense } from "react";
import { BarChart3 } from "lucide-react";

const CFOView = lazy(() => import("@/components/admin/finance/finance-v2/cfo/CFOView"));
const MonthlyPLHistoryCard = lazy(() =>
  import("@/components/admin/finance/finance-v2/shared/MonthlyPLHistoryCard").then(m => ({ default: m.MonthlyPLHistoryCard })),
);
const FinancialIntelligenceDashboard = lazy(() =>
  import("@/components/admin/finance/FinancialIntelligenceDashboard").then(m => ({ default: m.FinancialIntelligenceDashboard })),
);

const SectionFallback = () => (
  <div className="rounded-2xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
    Loading CFO cockpit…
  </div>
);

export const CFOCockpitPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-transparent px-5 py-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600/15 text-blue-600">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground">CFO Cockpit</h1>
          <p className="text-sm text-muted-foreground">
            Budgets, monthly P&L history, approvals, and live financial intelligence — CFO command center.
          </p>
        </div>
      </div>

      <Suspense fallback={<SectionFallback />}>
        <MonthlyPLHistoryCard autoSave />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <FinancialIntelligenceDashboard />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <CFOView />
      </Suspense>
    </div>
  );
};

export default CFOCockpitPage;
