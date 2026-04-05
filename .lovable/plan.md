

## Fix: Unblock PDF Viewing, Quote History, and Policy Book Access

### Problem Analysis

Three issues identified:

1. **Quote History & Policy Book blocked for non-admin users**: The `quote_share_history` and `insurance_policies` tables have RLS policies that only allow access for admins or users with `insurance` vertical access (`user_vertical_access` table). The executive user (and potentially others) has NO entry in `user_vertical_access`, so all reads/writes are denied silently — showing empty data or errors.

2. **View PDF button**: The storage bucket `quote-pdfs` is public and has a public SELECT policy, so PDFs themselves are accessible. However, since the `quote_share_history` table returns no rows (due to RLS), the "View PDF" button never appears because there are no quote records to display.

3. **Auto-save last quote details**: The `InsuranceQuoteModal` already calls `persistInsuranceQuoteHistory()` which saves to `quote_share_history` and updates the client record. But due to RLS blocking INSERT for non-admin/non-vertical users, the save silently fails. Additionally, the `SharePdfDialog` has its own separate `autoSaveQuote` method that duplicates logic — this should be unified.

### Plan

#### Step 1: Fix RLS on `quote_share_history` — Add advisor/assigned access

Add RLS policies so that any authenticated user assigned to insurance clients can also read/write quote history. Specifically, add policies allowing access when the user is either:
- An admin (already covered)
- Has insurance vertical access (already covered)
- Is the `assigned_advisor_id` on the related `insurance_clients` record (matching by phone/vehicle)
- OR simplify: allow all authenticated CRM users (those in `crm_users` table) to read/write quote history

**Migration SQL**: Create a new policy for SELECT and INSERT that allows any authenticated user in the `crm_users` table to access `quote_share_history`.

#### Step 2: Fix RLS on `insurance_policies` — Add advisor access

Add a SELECT and UPDATE policy so users who are the `assigned_advisor_id` on the related `insurance_clients` record can view and manage policies for their assigned clients.

**Migration SQL**: Add policies for SELECT/UPDATE allowing access when `client_id` matches a client where `assigned_advisor_id = auth.uid()`.

#### Step 3: Unify SharePdfDialog auto-save with persistInsuranceQuoteHistory

The `SharePdfDialog` component has its own inline `autoSaveQuote` function that duplicates the logic in `insuranceQuotePersistence.ts`. Refactor `SharePdfDialog` to use `persistInsuranceQuoteHistory()` instead, ensuring all quote shares go through the same save path with full client details, pipeline updates, and activity logging.

#### Step 4: Ensure last generated PDF details are saved correctly

The `InsuranceQuoteModal` already saves correctly via `persistInsuranceQuoteHistory`. No changes needed here — fixing RLS (Steps 1-2) will unblock the save operations.

### Files Changed

- **New migration**: RLS policy updates for `quote_share_history` and `insurance_policies`
- **`src/components/admin/insurance/SharePdfDialog.tsx`**: Replace inline `autoSaveQuote` with call to `persistInsuranceQuoteHistory`

### Technical Details

**New RLS policies (migration)**:
```sql
-- Allow any CRM user to read quote history
CREATE POLICY "CRM users can view quote share history"
ON public.quote_share_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.crm_users WHERE auth_user_id = auth.uid()));

-- Allow any CRM user to insert quote history
CREATE POLICY "CRM users can insert quote share history"  
ON public.quote_share_history FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.crm_users WHERE auth_user_id = auth.uid()));

-- Allow assigned advisors to view their clients' policies
CREATE POLICY "Advisors can view assigned client policies"
ON public.insurance_policies FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.insurance_clients ic 
  WHERE ic.id = insurance_policies.client_id 
  AND ic.assigned_advisor_id = auth.uid()
));
```

