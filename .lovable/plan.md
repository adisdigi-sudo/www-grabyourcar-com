

# Fix Loan CRM Workspace — Bug Cleanup

## Current Status
The Loan CRM workspace code **is fully implemented** with all requested features:
- EMI Calculator with typed inputs + amortization table
- Pipeline board with column dividers, row separators, drag-and-drop
- Enhanced "New Lead" dialog with loan type, employment, income fields
- Source badges on cards, loan type badges

You are currently viewing the **homepage** (`/`). Navigate to **CRM** (`/crm`) to see the Loan workspace.

## Bug Found
One React warning in the amortization table — `<>` Fragment used inside `.map()` without a key. This causes React reconciliation issues.

## Fix

### File: `src/components/admin/loans/LoanWorkspace.tsx`
**Lines 246-259**: Replace keyless `<>` fragments with `<React.Fragment key={...}>`:

```tsx
// Before (buggy):
{amortizationPreview.map((row, idx) => (
  <>
    {idx === 3 && tenure > 6 && (
      <tr key="ellipsis">...</tr>
    )}
    <tr key={row.month}>...</tr>
  </>
))}

// After (fixed):
{amortizationPreview.map((row, idx) => (
  <React.Fragment key={row.month}>
    {idx === 3 && tenure > 6 && (
      <tr className="border-b border-border/20">...</tr>
    )}
    <tr className="border-b border-border/20 hover:bg-muted/20 transition-colors">...</tr>
  </React.Fragment>
))}
```

### Also fix: `DealerLocatorWidget.tsx` Badge ref warning
The `Badge` component is receiving a ref it can't handle. Quick fix: wrap or remove the ref usage.

### Summary
- Fix React Fragment key warning in EMI amortization table
- Fix DealerLocatorWidget Badge ref warning
- No other bugs found — all features are implemented and the code compiles correctly

