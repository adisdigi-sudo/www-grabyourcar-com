

# Add Advanced Filters to Insurance Pipeline

## What Changes
Add a collapsible filter bar below the stage tabs in the Insurance Lead Pipeline. This will let you filter leads by:
- **Expiry Date Range** — find leads expiring within a specific period (e.g., this week, this month, custom range)
- **Lead Source** — filter by Meta, Google, Walk-in, Referral, etc.
- **Priority** — filter by hot, high, medium, low
- **Assigned Executive** — see only leads assigned to a specific team member
- **Created Date Range** — filter by when the lead was added

A "Filters" toggle button will show/hide the filter row to keep the UI clean when not needed. Active filter count will be shown on the button as a badge.

## Technical Details

### File: `src/components/admin/insurance/InsuranceLeadPipeline.tsx`

1. **New state variables** for each filter dimension:
   - `sourceFilter` (string, default "all")
   - `priorityFilter` (string, default "all") 
   - `expiryPreset` (string: "all", "this_week", "this_month", "next_30", "expired", "custom")
   - `expiryFrom` / `expiryTo` (Date | undefined)
   - `showFilters` (boolean toggle)

2. **Extend the `filtered` useMemo** to apply these additional filters after stage and search filtering:
   - Source: match `client.lead_source`
   - Priority: match `client.priority`
   - Expiry date: compare `client.policy_expiry_date` against computed date bounds
   - Created date: compare `client.created_at`

3. **Render a filter bar** (conditionally visible) between the stage tabs and search bar:
   - Toggle button with Filter icon + active count badge
   - Row of Select dropdowns for Source, Priority, Expiry preset
   - Native date inputs for custom expiry range (shown only when preset = "custom")
   - "Clear Filters" button to reset all

4. **Data sources for filter options**:
   - Lead sources from `LEAD_SOURCES` constant (already imported)
   - Priority options: hardcoded ["hot", "high", "medium", "low"]
   - Expiry presets: "All", "Expired", "This Week", "This Month", "Next 30 Days", "Custom"

No database changes needed. All filtering is client-side on the already-fetched dataset.

