

## Plan: Make Quote Shared & Renewal Shared Buttons Prominent

### Changes in `src/components/admin/insurance/InsuranceSmartCalling.tsx`

1. **Add a `prominent` flag** to the `quote_shared` and `renewal_shared` entries in `CALL_OUTCOMES` (e.g., `prominent: true`).

2. **Update the rendering logic** in the outcome grid (lines 940-955):
   - Split rendering into two groups: regular outcomes (7 items in `grid-cols-3`) and prominent outcomes (2 items spanning full width in `grid-cols-2`).
   - Prominent buttons get:
     - Larger padding (`px-4 py-3`)
     - Larger icon (`h-5 w-5`)
     - Larger text (`text-sm font-bold`)
     - A subtle gradient or stronger border (`border-2`) to visually distinguish them
     - Full-width span below the regular grid

### Result
Quote Shared and Renewal Shared will appear as visually distinct, larger action buttons separated from the standard outcome grid, making them immediately noticeable.

