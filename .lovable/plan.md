

# Insurance CRM Workspace — Complete Redesign Plan

## What You Want (In Simple Words)

A clean, professional insurance workspace that works like a real insurance company system:

1. **New lead comes in** → marked with source, journey starts
2. **Call the lead** → record call remarks, outcome
3. **Share quote** → generate and send easily from the same screen
4. **Mark won/lost** → if lost, ask why; if won, record policy details + issue date
5. **Policy issued** → shows in Policy Book with all details
6. **Next year auto follow-up** → auto reminders at 7/15/30/45/60 days, team re-engages
7. **Renewal won** → old policy replaced, new one shows in "Coming Renewals"
8. **Lost leads** → still tracked for future retargeting

---

## What Will Change

### 1. Redesign the InsuranceWorkspace into 4 Clean Tabs

Replace the current 5-tab layout with 4 focused views:

```text
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Lead Pipeline │ Policy Book  │ Coming       │  Bulk Tools  │
│  (CRM)        │ (Issued)     │ Renewals     │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

- **Lead Pipeline**: The main CRM with the 6-stage journey (New Lead → Calling → Quote Shared → Follow-Up → Won → Lost). Each row shows journey breadcrumb trail.
- **Policy Book**: All issued policies (Won + Rollover) with issue date, policy number, document link, and universal search (name/phone/vehicle/policy no).
- **Coming Renewals**: Auto-populated from Policy Book when expiry approaches. Filter by 7/15/30/45/60 days. Won renewal replaces old policy.
- **Bulk Tools**: CSV import (as "Rollover"), bulk WhatsApp, bulk quote generation.

### 2. Lead Journey Tracker (Visual Breadcrumb)

Add a visual journey trail on each lead row and in the detail dialog:

```text
New Lead → Called (14 Mar) → Quote Sent (15 Mar) → Follow-Up (18 Mar) → Won (20 Mar)
```

- Store journey events in `insurance_activity_log` (already exists)
- Fetch last 5 events per client and render as a compact breadcrumb in the detail dialog
- Show "current stage" dot indicator on the table row

### 3. Fix Website Lead Capture → Insurance CRM Flow

- Update the `captureInsuranceLead` function and `submit-lead` edge function to ensure website leads with insurance service category are routed to `insurance_clients` table with `pipeline_stage: "new_lead"` and `lead_source: "Website"`
- Add RLS policy for anonymous inserts on `insurance_clients` if missing

### 4. Enhanced "Won" Flow — Policy Issued with Details

When marking a lead as "Won":
- Dialog asks for: Policy Number, Insurer, Premium, Start Date, Expiry Date, Policy Document (PDF upload)
- Auto-creates a record in `insurance_policies` with `issued_date = today`, `source_label = "Won (New)"` or `"Won (Renewal)"`
- Reflects immediately in Policy Book tab

### 5. Enhanced "Lost" Flow — Mandatory Reason + Retarget Flag

Current lost dialog works but add:
- A "Retarget Next Year?" toggle that sets `retarget_status = 'scheduled'` on the client
- These clients appear in a "Retarget" filter in the lead pipeline

### 6. Renewal Lifecycle — Auto Replace & Coming Renewals

When a renewal is marked "Won":
- Old policy status → `renewed`
- New policy created with incremented `renewal_count`, `source_label = "Won (Renewal)"`, new expiry date
- Client's `pipeline_stage` resets to `"policy_issued"`
- New policy auto-appears in "Coming Renewals" as its expiry approaches

### 7. Auto Renewal Reminders (60/45/30/15/7 days)

- The existing `insurance-renewal-engine` edge function already handles this
- Ensure it's triggered via pg_cron (verify or create the cron job)
- Add a visual indicator in the workspace showing which reminders have been sent

### 8. Calendar Date Picker Fix

- Replace the basic Calendar with month/year dropdown selectors so users can jump to any date quickly without clicking arrows repeatedly
- Apply this to all date pickers in the insurance workspace (follow-up, renewal reminder, policy dates)

### 9. Policy Book Universal Search

- Search across: customer name, phone, vehicle number, policy number, insurer, vehicle make/model
- Already partially implemented — will ensure all fields are searchable
- Add date range filter for issued date

### 10. PDF Upload — Smart Policy Number Extraction

- Enforce that uploaded PDF filename must contain the policy number
- Extract policy number from filename, auto-link to the correct record
- Reject uploads without a parseable policy number in filename

---

## Technical Changes Summary

| File | Change |
|------|--------|
| `InsuranceWorkspace.tsx` | Full redesign — 4 tabs, journey breadcrumbs, enhanced Won/Lost dialogs, improved date pickers, universal search |
| `InsurancePolicyDocumentUploader.tsx` | Enforce policy number from filename |
| `src/lib/insuranceLeadCapture.ts` | Ensure website leads flow into insurance_clients |
| `supabase/functions/submit-lead/index.ts` | Route insurance-category leads correctly |
| Database migration | Add `retarget_status` column if not exists, verify RLS for anonymous inserts |
| pg_cron | Verify renewal engine cron job is active |

---

## What You'll See When Done

1. **Admin → Insurance** → Clean 4-tab workspace
2. Every lead shows its journey trail (New → Called → Quoted → etc.)
3. "Won" button opens a rich dialog to capture policy details + upload document
4. "Lost" button asks reason + offers retarget toggle
5. **Policy Book** shows all issued policies with universal search
6. **Coming Renewals** auto-fills from Policy Book, filters by 7-60 day windows
7. Renewal "Won" replaces old policy, creates new one for next year
8. Calendar pickers let you jump to any month/year instantly
9. Website leads automatically appear in the Lead Pipeline

