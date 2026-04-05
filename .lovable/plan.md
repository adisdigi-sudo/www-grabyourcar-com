

## Problem

Two workflow gaps prevent the pipeline from reflecting follow-up status correctly:

1. **Edit form ignores follow-up date for stage**: When you edit a lead and set a follow-up date, the stage stays wherever it was (e.g., `quote_shared`). The save logic does not auto-promote the stage to `follow_up` when a follow-up date is set.

2. **Quote sharing doesn't respect existing follow-up**: When sharing a quote for a client already in `follow_up`, the persistence logic correctly protects it. But if you set a follow-up date AND share a quote in the same session, the quote share can overwrite the stage back to `quote_shared` depending on order of operations.

## Plan

### 1. Auto-promote to `follow_up` when follow-up date is set (Edit Save)

**File**: `src/components/admin/insurance/InsuranceLeadPipeline.tsx` (~line 1566-1595)

In the edit save handler, add logic after building `updates`:
- If `follow_up_date` is being set (non-null) AND the current stage is in an earlier position (`new_lead`, `smart_calling`, `quote_shared`), automatically set `pipeline_stage` to `follow_up` and `lead_status` to `follow_up`
- If `follow_up_date` is being cleared AND stage is `follow_up`, demote back to the previous meaningful stage

This ensures setting a follow-up date always moves the lead forward in the pipeline.

### 2. Make quote persistence respect follow-up state

**File**: `src/lib/insuranceQuotePersistence.ts` (~line 203-265)

When updating an existing client after sharing a quote:
- After fetching the current client, also check if `follow_up_date` is set
- If the current stage is `follow_up` (already protected), keep it
- Additionally: if the client has a `follow_up_date` set in the database, never demote to `quote_shared` -- fetch `follow_up_date` alongside `pipeline_stage, lead_status` in the select query, and add it to the protection check

### 3. Add stage-aware activity logging

**File**: `src/components/admin/insurance/InsuranceLeadPipeline.tsx`

When the edit save auto-promotes to `follow_up`, log an activity entry to `insurance_activity_log` with title "Pipeline → Follow-Up" so the timeline reflects the change.

## Technical Details

- The stage hierarchy (for auto-promotion) is: `new_lead` → `smart_calling` → `quote_shared` → `follow_up` → `won` → `policy_issued`
- Only promote forward (never demote from `follow_up` to `quote_shared` when sharing a quote)
- The `protectedStages` array in `insuranceQuotePersistence.ts` already includes `follow_up` -- the fix is to also fetch and check `follow_up_date` from the DB to catch edge cases where stage was manually changed but follow-up date still exists

