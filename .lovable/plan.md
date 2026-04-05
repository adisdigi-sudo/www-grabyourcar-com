

# Fix Critical Issues: Remove Redundant Toggle & Improve Modal UX

## Changes

### 1. Remove redundant "Insurance Expired Over 90 Days?" manual toggle
**File:** `src/components/admin/insurance/InsurancePremiumCalculator.tsx`

The standalone calculator has both a Policy Expiry Date input (which auto-detects >90 days) AND a separate manual Yes/No toggle for the same thing. This creates conflicting states. 

- Remove the manual toggle block (lines 886-897)
- Keep the Policy Expiry Date auto-detection as the single source of truth
- Update the disclaimer text to guide users: "Enter the Policy Expiry Date above to auto-detect"

### 2. Sticky Save button in Lead Detail modal
**File:** `src/components/admin/insurance/InsuranceLeadPipeline.tsx`

The Save button and action buttons at the bottom can scroll out of view on smaller screens. Make them sticky:

- Wrap the edit form fields in a scrollable div
- Make the Save button and action bar sticky at the bottom with a background + shadow so they're always visible

### 3. Add Notes/Remarks field to standalone calculator
**File:** `src/components/admin/insurance/InsurancePremiumCalculator.tsx`

Currently the standalone calculator has no notes field. Add one so operators can add remarks (e.g., "inspection done", "customer wants comprehensive only") that flow into the quote output.

## Summary of files to edit
- `src/components/admin/insurance/InsurancePremiumCalculator.tsx` — remove redundant toggle, add notes field
- `src/components/admin/insurance/InsuranceLeadPipeline.tsx` — sticky footer in lead detail modal

