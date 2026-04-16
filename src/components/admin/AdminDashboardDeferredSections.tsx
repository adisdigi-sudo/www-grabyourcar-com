import { lazy, Suspense } from "react";
import { type DateRange } from "./dashboard";

const TeamPerformanceComparison = lazy(() =>
  import("./dashboard/TeamPerformanceComparison").then((module) => ({ default: module.TeamPerformanceComparison })),
);
const TaskEscalationView = lazy(() =>
  import("./TaskEscalationView").then((module) => ({ default: module.TaskEscalationView })),
);
const EmployeeDailyReportsDashboard = lazy(() =>
  import("./EmployeeDailyReportsDashboard").then((module) => ({ default: module.EmployeeDailyReportsDashboard })),
);
const ScheduledReportsManager = lazy(() =>
  import("./dashboard/ScheduledReportsManager").then((module) => ({ default: module.ScheduledReportsManager })),
);

const DeferredSectionFallback = () => (
  <div className="rounded-2xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
    Loading dashboard insights…
  </div>
);

interface AdminDashboardDeferredSectionsProps {
  dateRange: DateRange;
}

export const AdminDashboardDeferredSections = ({ dateRange }: AdminDashboardDeferredSectionsProps) => {
  return (
    <Suspense fallback={<DeferredSectionFallback />}>
      <div className="space-y-6">
        <TeamPerformanceComparison dateRange={dateRange} />
        <TaskEscalationView />
        <EmployeeDailyReportsDashboard />
        <ScheduledReportsManager />
      </div>
    </Suspense>
  );
};