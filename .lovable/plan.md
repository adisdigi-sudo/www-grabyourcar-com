

# Fix: Double Policy Creation on Won Status

## Root Cause

When a lead is marked as "Won", **two separate systems both create a policy record**:

1. **UI Code** (`InsuranceLeadPipeline.tsx` → `WonPolicyDialog` and `InsuranceStatusPipeline.tsx` → `handleWonConversion`): Manually inserts a policy into `insurance_policies`, then updates the client's `lead_status` to "won".

2. **Database Trigger** (`ensure_policy_book_entry_for_client`): Fires on the client update, detects `lead_status = 'won'`, and creates a **second** policy.

This is why you see 2 policies (and double counts) for every single won action — e.g., PARAG GOEL showing 2 policies and MAHENDRA KUMAR showing 2 policies in the screenshot.

## Fix Strategy

**Approach: Make the trigger skip when a policy already exists for this client with the same details.**

The trigger already checks for an existing active policy (`v_existing_policy_id`), but its matching logic doesn't always find the policy just inserted by the UI (especially when policy_number is NULL at insert time).

### Changes Required

#### 1. Update `ensure_policy_book_entry_for_client` trigger (database migration)
- Add a guard: if an active policy was already created/updated for this client within the last 5 seconds, skip the insert. This prevents the trigger from duplicating what the UI just did.
- Alternatively (cleaner): check if an active policy with matching insurer + premium already exists for this client, and if so, just update it instead of inserting a new one.

#### 2. Clean up existing duplicate policies (database migration)
- Write a one-time cleanup query to identify and remove duplicate active policies for the same `client_id` where two active policies exist with the same or very close `created_at` timestamps.
- Keep the policy with more complete data (has policy_number, has premium, etc.) and mark the other as `renewed` or delete it.

#### 3. Deduplicate in `InsurancePerformance.tsx` as a safety net
- In `performancePolicies`, add deduplication by `client_id` — for the won table, if multiple active policies exist for the same client, keep only the one with the most complete data (or latest updated_at).
- This ensures even if the DB fix hasn't propagated, the UI won't double-count.

### Technical Details

**Migration SQL (trigger fix):**
```sql
-- In ensure_policy_book_entry_for_client, add early exit check:
-- After computing v_existing_policy_id, if found, only UPDATE (never INSERT a second)
-- Tighten the existing-policy lookup to also match on NULL policy_number
```

**Migration SQL (cleanup):**
```sql
-- Find duplicate active policies per client, keep the best one
WITH ranked AS (
  SELECT id, client_id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id 
      ORDER BY 
        CASE WHEN policy_number IS NOT NULL THEN 0 ELSE 1 END,
        premium_amount DESC NULLS LAST,
        updated_at DESC
    ) as rn
  FROM insurance_policies
  WHERE status = 'active'
)
UPDATE insurance_policies SET status = 'renewed'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

**UI safety net (`InsurancePerformance.tsx`):**
```typescript
// In performancePolicies, dedupe by client_id - keep best policy per client
const seenClients = new Map<string, PolicyRecord>();
policies.forEach(p => {
  if (!p.client_id) { unique.set(p.id, p); return; }
  const existing = seenClients.get(p.client_id);
  if (!existing || (p.policy_number && !existing.policy_number) || 
      (p.updated_at > existing.updated_at)) {
    if (existing) unique.delete(existing.id);
    seenClients.set(p.client_id, p);
    unique.set(p.id, p);
  }
});
```

### Files to Change
- **Database migration**: Fix `ensure_policy_book_entry_for_client` trigger + cleanup existing duplicates
- **`src/components/admin/insurance/InsurancePerformance.tsx`**: Add client-level deduplication in `performancePolicies`

