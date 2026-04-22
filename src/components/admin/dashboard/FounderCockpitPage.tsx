import { lazy, Suspense } from "react";
import { Crown } from "lucide-react";

const FounderCommandCenter = lazy(() =>
  import("./FounderCommandCenter").then((m) => ({ default: m.FounderCommandCenter })),
);
const ApprovalsQueueWidget = lazy(() =>
  import("./ApprovalsQueueWidget").then((m) => ({ default: m.ApprovalsQueueWidget })),
);
const LiveDealsAttribution = lazy(() =>
  import("./LiveDealsAttribution").then((m) => ({ default: m.LiveDealsAttribution })),
);
const FounderAICoach = lazy(() =>
  import("./FounderAICoach").then((m) => ({ default: m.FounderAICoach })),
);
const FounderBriefingScheduler = lazy(() =>
  import("./FounderBriefingScheduler").then((m) => ({ default: m.FounderBriefingScheduler })),
);
const BudgetApprovalQueue = lazy(() =>
  import("./BudgetApprovalQueue").then((m) => ({ default: m.BudgetApprovalQueue })),
);
const MonthlyPLHistoryCard = lazy(() =>
  import("@/components/admin/finance/finance-v2/shared/MonthlyPLHistoryCard").then((m) => ({ default: m.MonthlyPLHistoryCard })),
);
const LiveTeamPerformance = lazy(() =>
  import("./LiveTeamPerformance").then((m) => ({ default: m.LiveTeamPerformance })),
);

const SectionFallback = () => (
  <div className="rounded-2xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
    Loading founder cockpit…
  </div>
);

export const FounderCockpitPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Crown className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground">Founder Cockpit</h1>
          <p className="text-sm text-muted-foreground">
            Targets, briefings, approvals aur live deal attribution — sab ek jagah.
          </p>
        </div>
      </div>

      <Suspense fallback={<SectionFallback />}>
        <FounderCommandCenter />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <LiveTeamPerformance />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <MonthlyPLHistoryCard autoSave />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <BudgetApprovalQueue />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Suspense fallback={<SectionFallback />}>
          <FounderAICoach />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <FounderBriefingScheduler />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Suspense fallback={<SectionFallback />}>
          <ApprovalsQueueWidget />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <LiveDealsAttribution />
        </Suspense>
      </div>
    </div>
  );
};

export default FounderCockpitPage;
