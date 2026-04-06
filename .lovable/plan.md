

# Loan CRM: Interactive KPI Filters + Performance Dashboard

## What We're Building

1. **Clickable KPI Cards** — Make the Disbursed, Lost, In Pipeline, and Total Leads cards clickable to filter the pipeline view to show only those leads
2. **Date Filter Bar** — Add day/week/month/all-time period selector to filter all data by date range
3. **Performance & Revenue Tab** — New "Performance" view in the workspace showing revenue tracking, conversion metrics, team performance, and stage-wise trends

---

## Technical Plan

### File: `src/components/admin/loans/LoanWorkspace.tsx`

**A. Clickable KPI Cards with Stage Filtering**
- Add state: `stageFilter: LoanStage | 'all' | 'in_pipeline' | 'disbursed' | 'lost'` (default `'all'`)
- Add state: `dateFilter: 'today' | '7days' | '30days' | 'this_month' | 'all'` (default `'all'`)
- Make each KPI card in the header clickable with `cursor-pointer`, `onClick` sets `stageFilter`, active card gets a highlighted ring/border
- When a KPI card is clicked: auto-switch to pipeline view, filter displayed leads accordingly
- Add a "clear filter" badge/button when a filter is active
- Filter `applications` through both `stageFilter` and `dateFilter` before passing to the pipeline board and KPIs

**B. Date Period Selector**
- Add a compact button group below the KPI header: `Today | This Week | This Month | All Time`
- Filter applications by `created_at` matching the selected period
- Date filter applies globally across all views (pipeline, disbursement, performance)

**C. New "Performance" View**
- Add `"performance"` to `LoanWorkspaceView` type
- Add a tab/button for "Performance" in the workspace navigation
- Create new component: `src/components/admin/loans/LoanPerformanceDashboard.tsx`

### File: `src/components/admin/loans/LoanPerformanceDashboard.tsx` (New)

**Performance dashboard showing:**

1. **Revenue KPI Row** — Total Disbursed Value, Avg Loan Size, Conversion Rate, Active Pipeline Value
2. **Conversion Funnel** — Bar chart: New Lead → Calling → Interested → Offer → Application → Disbursed (with counts + %)
3. **Revenue Trend** — Line/bar chart showing disbursement value by day/week/month based on the selected period
4. **Stage Distribution** — Pie chart of current lead distribution across stages
5. **Source Performance** — Table: each lead source with total leads, conversion count, conversion %, total disbursed value
6. **Team/Executive Performance** — If `assigned_to` field exists, show per-executive: leads handled, disbursed count, total value, conversion rate
7. **Won Cases List** — Scrollable table of all disbursed leads with customer name, car model, bank, amount, date — sortable

**Data source:** Same `loan_applications` query, filtered by `dateFilter`. Uses Recharts for charts.

### Navigation Updates

- Add "Performance" as a 6th workspace tab alongside Pipeline, Disbursement, After Sales, Bulk Tools, EMI Calculator
- Use `BarChart3` or `TrendingUp` icon for the tab

---

## Summary of Changes

| File | Change |
|------|--------|
| `LoanWorkspace.tsx` | Add clickable KPIs, date filter bar, stage filter state, performance tab |
| `LoanPerformanceDashboard.tsx` | New file — revenue charts, conversion funnel, source & team tables |
| `LoanStageConfig.ts` | No changes needed |

