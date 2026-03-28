

## Plan: Fix Insurance Pipeline Stage Exclusivity, Overdue Return Flow, and Add Bulk Overdue Actions

### Problems Identified

1. **Leads marked as "lost" or other stages still show in "New Lead" / "All Leads"**: The pipeline deduplication logic uses `updated_at` timestamps but doesn't strictly respect the current `pipeline_stage` value. It can show stale records.

2. **Overdue → Pipeline move doesn't work**: When moving from overdue back to pipeline, the lead's `policy_expiry_date` remains expired. The pipeline filter (line 544-551) explicitly excludes any lead with an expired `policy_expiry_date`, so the lead disappears from both views.

3. **Activity log errors (400)**: Overdue fallback records use fake IDs like `overdue-fallback-{uuid}` as `policy_id`. The `insurance_activity_log.policy_id` column has a foreign key to `insurance_policies`, so these fail with "invalid input syntax for type uuid".

4. **No bulk actions in Overdue view**: Users cannot select multiple overdue items and act on them at once.

---

### Implementation Plan

#### 1. Fix Pipeline Filtering — Strict Stage-Only Display

**File: `InsuranceLeadPipeline.tsx`** (pipelineClients useMemo, ~line 524-581)

- Remove the `isExpiredLead` filter that excludes leads based on `policy_expiry_date`. Instead, rely **solely** on the lead's `pipeline_stage` / `lead_status` to decide where it shows.
- Each lead shows only in the stage matching its current `normalizeStage()` result. "All Leads" shows every non-won/policy_issued lead exactly once.
- Lost leads only appear when viewing "Lost" stage or "All".
- Deduplication remains by vehicle key, keeping the most recently updated record.

```
// Remove lines 544-551 (isExpiredLead check)
// A lead's visibility is determined ONLY by its pipeline_stage
```

#### 2. Fix Overdue → Pipeline Move

**File: `InsuranceOverdueRenewals.tsx`** (handleMove function, ~line 144-192)

- When moving to pipeline: also set the associated policy status to `"lapsed"` so it no longer appears in overdue.
- Look up the real policy ID for this client (from the policies prop) instead of using the potentially-fake overdue-fallback ID.
- Clear overdue fields and set `pipeline_stage: "new_lead"`.

```typescript
// In handleMove, "pipeline" branch:
// 1. Find real policy for this client
const realPolicy = policies.find(p => p.client_id === targetPolicy.client_id && p.id === targetPolicy.id);
const realPolicyId = realPolicy && !realPolicy.id.startsWith("overdue-fallback") ? realPolicy.id : null;

// 2. If real policy exists, mark it lapsed
if (realPolicyId) {
  await supabase.from("insurance_policies").update({ status: "lapsed" }).eq("id", realPolicyId);
}

// 3. Update client
await supabase.from("insurance_clients").update({
  pipeline_stage: "new_lead",
  lead_status: "new",
  overdue_reason: null, overdue_custom_reason: null, overdue_marked_at: null,
  retarget_status: "none", retargeting_enabled: false,
}).eq("id", targetPolicy.client_id);

// 4. Log activity with real policy_id (or null)
await supabase.from("insurance_activity_log").insert({
  client_id: targetPolicy.client_id,
  policy_id: realPolicyId, // null instead of fake UUID
  ...
});
```

#### 3. Fix All Activity Log Inserts — No Fake UUIDs

**File: `InsuranceOverdueRenewals.tsx`**

- In `handleMarkReason` and `handleMove`: check if `targetPolicy.id` starts with `"overdue-fallback"`. If so, pass `null` for `policy_id`.

#### 4. Add Bulk Selection and Actions to Overdue View

**File: `InsuranceOverdueRenewals.tsx`**

Add:
- A `Set<string>` state for selected policy IDs
- A checkbox column in the table header (select all) and each row
- A bulk action bar that appears when items are selected, with buttons:
  - **Move to Pipeline** (bulk): sets all selected clients to `new_lead`, marks their policies as `lapsed`
  - **Move to Retarget** (bulk): sets all selected clients to `lost` with `retarget_status: "scheduled"`
  - **Remove from Overdue** (bulk): marks policies as `lapsed` without moving to pipeline
  - **Mark Reason** (bulk): opens the reason dialog and applies the selected reason to all checked items
- After each bulk action, invalidate queries and clear selection.

#### 5. Fix Overdue List Population

**File: `InsuranceWorkspace.tsx`** (overduePolicies useMemo, ~line 242-312)

- In the fallback overdue generation, do NOT exclude leads that are in active pipeline stages. The overdue view should show any expired policy that hasn't been explicitly resolved (status not in renewed/cancelled/lapsed) and client not scheduled for retarget.
- But DO exclude leads whose pipeline_stage is "lost" (they've been explicitly marked).

---

### Technical Details

| Change | File | Key Lines |
|--------|------|-----------|
| Remove expired-date pipeline filter | InsuranceLeadPipeline.tsx | 544-551 |
| Fix overdue→pipeline by lapsing policy | InsuranceOverdueRenewals.tsx | 144-192 |
| Fix fake UUID in activity_log | InsuranceOverdueRenewals.tsx | 124-131, 176-182 |
| Add bulk checkbox + actions | InsuranceOverdueRenewals.tsx | New state + UI |
| Fix overdue fallback generation | InsuranceWorkspace.tsx | 261-275 |

### Files Modified
- `src/components/admin/insurance/InsuranceLeadPipeline.tsx`
- `src/components/admin/insurance/InsuranceOverdueRenewals.tsx`
- `src/components/admin/insurance/InsuranceWorkspace.tsx`

