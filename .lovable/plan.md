

# Add Executive Leaderboard to All Verticals

## Current State
- **Insurance**: Already has `ExecutiveLeaderboard` in `InsurancePerformance.tsx` ✓
- **Loans**: Already has `ExecutiveLeaderboard` in `LoanPerformanceDashboard.tsx` ✓
- **Car Sales**: No Performance tab, no leaderboard — has `assigned_to` field in `sales_pipeline`
- **HSRP**: No Performance tab, no leaderboard — no `assigned_to` field (will need a migration)
- **Accessories, Self-Drive**: No clear executive assignment fields

## Plan

### 1. Add `assigned_to` column to `hsrp_bookings`
- Database migration to add `assigned_to TEXT` to `hsrp_bookings` so HSRP bookings can be tracked per executive

### 2. Create `SalesPerformanceDashboard.tsx` (New File)
- Revenue KPIs: Total Won Value, Won Count, Lost Count, Conversion Rate
- Executive stats computed from `sales_pipeline` using `assigned_to` field (won/lost/total/revenue from deal value or booking data)
- Render `ExecutiveLeaderboard` with `verticalName="Car Sales"`
- Won cases table

### 3. Update `SalesWorkspace.tsx`
- Add tab navigation (Pipeline | Performance) similar to LoanWorkspace
- Add date filter bar (Today, 7D, 30D, This Month, All)
- Wire Performance tab to `SalesPerformanceDashboard`

### 4. Create `HSRPPerformanceDashboard.tsx` (New File)
- Revenue KPIs: Total Revenue, Completed Count, Conversion Rate
- Executive stats from `hsrp_bookings` using `assigned_to` (completed = "completed" stage, revenue = `payment_amount`)
- Render `ExecutiveLeaderboard` with `verticalName="HSRP"`

### 5. Update `HSRPWorkspace.tsx`
- Add tab navigation (Pipeline | Performance)
- Add date filter bar
- Wire Performance tab to `HSRPPerformanceDashboard`

### Summary

| File | Action |
|------|--------|
| DB Migration | Add `assigned_to` to `hsrp_bookings` |
| `SalesPerformanceDashboard.tsx` | New — KPIs + ExecutiveLeaderboard for Car Sales |
| `SalesWorkspace.tsx` | Add Performance tab + date filters |
| `HSRPPerformanceDashboard.tsx` | New — KPIs + ExecutiveLeaderboard for HSRP |
| `HSRPWorkspace.tsx` | Add Performance tab + date filters |

Insurance and Loans already have the leaderboard integrated — no changes needed there.

