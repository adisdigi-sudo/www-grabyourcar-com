

# Plan: Delete All Loan Applications Except Two

## What We're Doing
Removing 24 out of 26 loan application records, keeping only:
- **Akhilesh Maurya** (ID: `25c3e7f5-9843-420c-9fe0-31562d6f62ca`)
- **Dhruva Gandhi** (ID: `536e3298-0569-466d-9abe-f33f4c20a7e5`)

## Findings
- No foreign key dependencies on `loan_applications` — safe to delete directly
- 24 records will be removed (7 non-legacy + 17 legacy)

## Implementation

### Step 1: Database Migration
Run a single SQL migration:
```sql
DELETE FROM loan_applications 
WHERE id NOT IN (
  '25c3e7f5-9843-420c-9fe0-31562d6f62ca',
  '536e3298-0569-466d-9abe-f33f4c20a7e5'
);
```

### Step 2: Verify
Query the table to confirm only 2 records remain.

No code changes needed — this is purely a data operation.

