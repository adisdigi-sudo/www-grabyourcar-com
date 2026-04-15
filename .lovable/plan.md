

# Plan: Unify Calculator Design Across Sales & Loans + White Page Fix

## Problem
1. **Sales Deal Calculator** (SalesLeadDetailModal.tsx) has a basic flat calculation: `Total - Booking - Processing - Other = Balance`. No step-by-step breakdown.
2. **Loan Sales Calculator** (LoanWorkspace.tsx) has a proper 2-step breakdown but the user wants the flow restructured: Total Car Price → Gross Loan → Less bank deductions → Net Disbursal → Down Payment auto-calculated → Less booking/advance → Final Balance.
3. **White page after reload** persists due to Vite HMR conflicts.

## Changes

### 1. Redesign Loan Calculator Flow (LoanWorkspace.tsx + loanSalesCalculator.ts)
Restructure the calculator display into a clean, receipt-style breakdown:

```text
SECTION A: Car Price Summary
  On-Road / Total Car Price         Rs. X,XX,XXX

SECTION B: Bank Loan Breakdown
  Gross Loan Amount                 Rs. X,XX,XXX
  Less: Processing Fees             - Rs. X,XXX
  Less: Loan Suraksha / Insurance   - Rs. X,XXX
  Less: Other Bank Charges          - Rs. X,XXX
  ─────────────────────────────────────────────
  Bank Net Disbursal                Rs. X,XX,XXX

SECTION C: Customer Payment Breakdown
  Down Payment (auto)               Rs. X,XX,XXX
    = Car Price - Net Disbursal
  Less: Booking / Token Paid        - Rs. XX,XXX
  Less: Advance Paid                - Rs. XX,XXX
  ═════════════════════════════════════════════
  💰 FINAL BALANCE PAYABLE          Rs. X,XX,XXX
```

### 2. Make Sales Calculator Identical (SalesLeadDetailModal.tsx)
- Import and use `calculateLoanSalesBreakdown` from `loanSalesCalculator.ts` in the Sales modal
- Add missing input fields: Gross Loan Amount, Loan Protection, Advance Paid
- Replace the current simple summary card with the exact same receipt-style breakdown used in Loans
- Update `SalesOfferPDF.ts` to include the new fields in the PDF output
- Update WhatsApp share message to include full breakdown

### 3. White Page Stability Hardening (devReloadGuard.ts)
- Add `try/catch` around the entire reload guard with graceful degradation
- Ensure the guard installs even if `Object.defineProperty` fails on `location.reload`
- Add a fallback using `window.addEventListener('beforeunload')` to catch edge cases where Vite triggers navigation instead of reload

### Files to Edit
1. **`src/components/admin/loans/LoanWorkspace.tsx`** — Redesign calculator UI section (lines 1300-1377)
2. **`src/components/admin/sales/SalesLeadDetailModal.tsx`** — Add loan-style calculator with same fields and breakdown
3. **`src/components/admin/sales/SalesOfferPDF.ts`** — Add new deduction fields (loan amount, insurance, advance)
4. **`src/components/admin/loans/loanSalesCalculator.ts`** — No logic changes needed, already correct
5. **`src/lib/devReloadGuard.ts`** — Harden reload interception

