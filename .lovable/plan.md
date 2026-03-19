

# Implementation Plan: Insurance Workspace Polish + Loan CRM Redesign + Lead Capture Fix

## Summary

The Insurance CRM workspace is already well-built with 4 tabs, journey tracking, enhanced Won/Lost flows, and bulk tools. The main work is:
1. Fix website lead capture so insurance leads actually appear in the CRM
2. Polish existing insurance components (calendar month/year jump, PDF filename enforcement)
3. Redesign Loan CRM to match the same 4-tab pattern as Insurance

---

## Phase 1: Fix Website Lead Capture (Priority)

**Problem**: The `captureInsuranceLead` function in `src/lib/insuranceLeadCapture.ts` inserts into `insurance_clients` but fails silently due to RLS. The `submit-lead` edge function routes insurance leads correctly but only when `serviceCategory === 'insurance'`.

**Fix**:
- Add an RLS policy on `insurance_clients` to allow anonymous inserts (matching the pattern already on `leads` table) via a database migration
- Update `captureInsuranceLead.ts` to set `pipeline_stage: 'new_lead'` and `lead_status: 'new'` on new client creation (partially done, verify)
- Update `submit-lead` edge function to also match `serviceCategory` values like `car-insurance`, `motor-insurance` (not just exact `insurance`)

**Files**: Database migration (RLS), `src/lib/insuranceLeadCapture.ts`, `supabase/functions/submit-lead/index.ts`

---

## Phase 2: Insurance Calendar & PDF Polish

**Calendar Fix**: Replace the basic `Calendar` component in date pickers throughout the insurance workspace with month/year dropdown selectors. Create a `SmartDatePicker` component that wraps the existing Calendar but adds month and year `<Select>` dropdowns above it so users can jump to any date without clicking arrows repeatedly.

**PDF Filename Enforcement**: Update `InsurancePolicyDocumentUploader.tsx` to:
- Extract policy number from filename using a regex
- Show the extracted policy number for confirmation
- Reject uploads where no policy number pattern is found in the filename

**Files**: New `src/components/ui/smart-date-picker.tsx`, update `InsuranceLeadPipeline.tsx` (3 calendar instances), `InsuranceComingRenewals.tsx` (1 calendar instance), `InsurancePolicyBook.tsx` (2 calendar instances), `InsurancePolicyDocumentUploader.tsx`

---

## Phase 3: Loan CRM Redesign — 4-Tab Layout

Transform `LoanWorkspace.tsx` from a single Kanban-only view into a 4-tab workspace matching the Insurance pattern:

```text
┌────────────────┬──────────────┬──────────────────┬──────────────┐
│ Lead Pipeline  │ Disbursement │ Repayment Track  │  Bulk Tools  │
│ (Kanban CRM)   │ Book         │ (After Sales)    │              │
└────────────────┴──────────────┴──────────────────┴──────────────┘
```

### Tab 1 — Lead Pipeline (existing Kanban, keep as-is)
The current 6-stage Kanban (New Lead → Smart Calling → Interested → Offer Shared → Loan Application → Disbursed) plus Lost column stays. Keep EMI Calculator at the top.

### Tab 2 — Disbursement Book (new)
- Table of all disbursed loans with universal search (name, phone, car model, bank, loan amount)
- Columns: Customer, Phone, Car, Bank, Loan Amount, Disbursed Amount, Disbursement Date, EMI, Source
- Date range filter on disbursement date

### Tab 3 — After Sales / Repayment (new)
- Placeholder for tracking post-disbursement status (EMI tracking, customer satisfaction)
- Show recently disbursed loans with follow-up reminders

### Tab 4 — Bulk Tools (existing import, wrap it)
- CSV import (already exists as `LeadImportDialog`)

**New Files**:
- `src/components/admin/loans/LoanDisbursementBook.tsx` — Disbursement Book table
- `src/components/admin/loans/LoanAfterSales.tsx` — After Sales placeholder

**Modified Files**:
- `src/components/admin/loans/LoanWorkspace.tsx` — Refactor into 4-tab layout with KPI header matching Insurance style, keep existing Kanban as Tab 1 content

### KPI Header (new, matching Insurance style)
Gradient header card with:
- Total Leads, In Pipeline, Disbursed, Lost, Total Disbursed Value

---

## Phase 4: Loan Lead Journey Breadcrumb

Add journey tracking to loan leads using `loan_stage_history` table (already exists).
- Create a `LoanJourneyBreadcrumb` component that queries `loan_stage_history` for a given `application_id`
- Display in the Kanban card detail modal

---

## Technical Details

### Database Migration
```sql
-- Allow anonymous inserts on insurance_clients for website lead capture
CREATE POLICY "anon_insert_insurance_clients" 
  ON public.insurance_clients FOR INSERT 
  TO anon WITH CHECK (true);
```

### File Change Summary

| File | Action |
|------|--------|
| Database migration | RLS for insurance_clients anon insert |
| `src/lib/insuranceLeadCapture.ts` | Ensure pipeline_stage + lead_status set |
| `supabase/functions/submit-lead/index.ts` | Broaden insurance category matching |
| `src/components/ui/smart-date-picker.tsx` | New: Calendar with month/year jump |
| `InsuranceLeadPipeline.tsx` | Use SmartDatePicker in 3 places |
| `InsuranceComingRenewals.tsx` | Use SmartDatePicker |
| `InsurancePolicyBook.tsx` | Use SmartDatePicker |
| `InsurancePolicyDocumentUploader.tsx` | Enforce policy number from filename |
| `LoanWorkspace.tsx` | Refactor into 4-tab layout |
| `LoanDisbursementBook.tsx` | New: Disbursement book table |
| `LoanAfterSales.tsx` | New: After sales placeholder |

### Execution Order
1. Database migration (RLS fix) — immediate impact
2. Lead capture fix (submit-lead + captureInsuranceLead) — deploy edge function
3. SmartDatePicker component
4. Insurance workspace polish (calendar + PDF)
5. Loan workspace 4-tab redesign
6. Loan journey breadcrumb

