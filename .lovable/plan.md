

# Insurance Workspace Rebuild — Streamlined 6-Stage Pipeline

## What We're Building

A single, focused Insurance workspace with **one unified view** replacing the current fragmented sidebar (Pipeline, Smart Calling, Quote Hub, Policy Book, Renewals, Add Lead, Extract, Import/Export). Everything lives inside a **drag-and-drop table/board** with 6 clear stages and inline actions at each stage.

## The 6 Pipeline Stages (Left → Right)

```text
┌──────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌──────────────┐
│ New Lead  │ → │ Smart Calling │ → │ Quote Shared  │ → │  Follow-Up    │ → │  Won / Lost   │ → │ Policy Issued│
│           │   │               │   │               │   │               │   │               │   │ + Renewal Set│
│ Source    │   │ Dial, Status  │   │ PDF Generate  │   │ Date, Time    │   │ Won → Policy  │   │              │
│ tagged    │   │ Remarks       │   │ Quote History  │   │ Remarks       │   │ Lost → Reason │   │ Auto Reminder│
└──────────┘   └───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘   └──────────────┘
```

## Stage-by-Stage Features

### 1. New Lead
- Source badge on every card: Meta, Google Ads, Referral, Walk-in, WhatsApp Broadcast, Website, Manual
- Shows customer name, phone, vehicle info
- Drag to "Smart Calling" to begin outreach

### 2. Smart Calling
- One-tap dial button (tel: link)
- WhatsApp button
- Status dropdown: Interested, Not Interested, Call Back, No Answer, Wrong Number
- Mandatory remarks textarea before saving
- Contact attempt counter
- On save → card stays or moves based on outcome

### 3. Quote Shared
- "Generate Quote" button → opens existing `InsuranceQuoteModal` inline
- "Redirect to GrabYourCar Insurance" button → opens `/car-insurance` page
- Quote history section showing previously shared quotes (saved to `insurance_activity_log`)
- Before dragging to next stage → must have at least 1 quote in history

### 4. Follow-Up
- Mandatory follow-up date picker + time selector
- Remarks field
- Shows countdown to follow-up date
- Overdue follow-ups highlighted in red

### 5. Won / Lost
- Two clear buttons: "Won" (green) or "Lost" (red)
- **Lost**: Mandatory lost reason from predefined list + remarks
- **Won**: Auto-creates policy record, opens policy detail form

### 6. Policy Issued + Renewal Reminder
- Shows all policy book details: policy number, insurer, premium, start/expiry dates
- Client ID displayed prominently
- "Set Renewal Reminder" button → date picker for next year
- **Only after reminder is set** → marked as "Success Sale" eligible for incentives
- Shows existing booked policies for this client

## Technical Implementation Plan

### Step 1: Simplify `InsuranceManagement.tsx`
- Remove sidebar navigation entirely
- Remove all nav items: Quote Hub, Add Lead, Extract Policy, Import/Export
- Single component renders: the new `InsuranceWorkspace`
- Remove imports for `InsuranceImportExport`, `InsuranceAddLeadForm`, `InsuranceSmartExtractor`, `InsuranceQuoteHub`

### Step 2: Database Migration
Add columns to `insurance_clients` if not present:
- `call_status` (text) — Interested, Not Interested, Call Back, No Answer, Wrong Number
- `call_remarks` (text)
- `follow_up_time` (text) — time portion
- `renewal_reminder_set` (boolean, default false)
- `renewal_reminder_date` (date)
- `incentive_eligible` (boolean, default false)

Add `insurance_quote_history` table:
- `id` (uuid, PK)
- `client_id` (uuid, FK → insurance_clients)
- `quote_data` (jsonb) — stores the full quote snapshot
- `shared_via` (text) — whatsapp, email, download
- `created_at` (timestamptz)

### Step 3: Build New `InsuranceWorkspace.tsx`
A single rich component with:

**Header**: KPI banner (Total Leads, In Pipeline, Won, Lost, Conversion %)

**Pipeline Stages as horizontal tabs/columns**: Each stage shows its leads as cards in a scrollable column. Cards are draggable between columns.

**Stage-specific actions**: When a card is clicked, a detail panel opens with actions specific to that stage:
- New Lead → shows source, basic info
- Smart Calling → dial pad, status selector, remarks
- Quote Shared → quote generator, history
- Follow-Up → date/time picker, remarks
- Won/Lost → outcome buttons with mandatory fields
- Policy Issued → policy details, renewal reminder setter

**Drag-and-Drop**: Uses native HTML5 drag-and-drop (already working pattern from current pipeline). Cards can move freely between any stages.

**Lead Source Badges**: Every card shows a colored badge for the lead source

### Step 4: Update Pipeline Stage Values
Map the 6 new stages to `pipeline_stage` column:
- `new_lead` → New Lead
- `smart_calling` → Smart Calling (replaces contact_attempted + requirement_collected)
- `quote_shared` → Quote Shared
- `follow_up` → Follow-Up
- `won` → Won (replaces policy_issued)
- `lost` → Lost
- `policy_issued` → Policy Issued (final state with renewal)

### Step 5: Quote History Integration
- On quote generation/share → insert into `insurance_quote_history`
- Display quote history in the detail panel for Quote Shared stage
- Each entry shows: date, insurer, premium, IDV, shared via

### Step 6: Renewal Reminder Logic
- When "Set Renewal Reminder" is clicked → saves `renewal_reminder_date` and sets `renewal_reminder_set = true`
- Only then `incentive_eligible` becomes `true`
- Visual indicator: green checkmark if reminder set, red warning if not

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/admin/InsuranceManagement.tsx` | Simplify to single workspace, remove sidebar |
| `src/components/admin/insurance/InsuranceWorkspace.tsx` | **NEW** — Main unified workspace component |
| Database migration | Add columns + quote_history table |

## What Gets Removed
- Quote Hub sidebar item and standalone component usage
- Add Lead sidebar item
- Extract Policy sidebar item
- Import/Export sidebar item
- The entire sidebar navigation system for Insurance
- Renewals Engine as separate tab (merged into Policy Issued stage)

The existing components (`InsuranceQuoteModal`, `SharePdfDialog`, `InsurancePolicyDocumentUploader`) will be reused inside the new workspace.

