

# Plan: Car Loan Calling Workspace with Full Workflow

## What the user wants
A dedicated calling experience for car loans where the flow is:
**Client → Dial → Status Select → Document Upload → Won/Lost → Approved/Rejected (with reason) → Disbursed/Canceled → EMI PDF sharing**

## What exists today
- Generic `CallDispositionModal` with basic dispositions (connected/busy/etc) — no loan-specific workflow
- `LoanStageChangeModal` handles stage moves + doc uploads but is separate from calling
- `LoanCRMDashboard` has 4 tabs (Pipeline, Applications, Banks, Analytics) — no Calling tab
- `generateEMIPdf` already generates beautiful branded EMI PDFs
- `loan_applications` table has all needed fields (emi_amount, interest_rate, tenure_months, disbursement_amount, sanction_amount, rejection_reason, etc.)

## Build Plan (4 steps)

### Step 1: Add "Calling" and "Automation" tabs to LoanCRMDashboard
**Edit:** `src/components/admin/LoanCRMDashboard.tsx`
- Add 2 new tabs: "Calling" (PhoneCall icon) and "Automation" (Zap icon)
- Update grid from `grid-cols-4` to `grid-cols-6`
- Calling tab renders a new `LoanCallingWorkspace` component
- Automation tab renders a new `LoanAutomationPanel` component

### Step 2: Create LoanCallingWorkspace — the main calling UI
**Create:** `src/components/admin/loans/LoanCallingWorkspace.tsx`

A dedicated loan calling workspace that fetches from `loan_applications` and presents leads as callable cards. Features:
- **Loan Lead Queue**: Cards showing client name, phone, car model, loan amount, current stage, priority
- **Call buttons**: Phone + WhatsApp per card
- **On dial**: Opens the new `LoanCallDispositionModal` (step 3)
- Stats bar: calls today, connected, pending follow-ups

### Step 3: Create LoanCallDispositionModal — the full loan workflow modal
**Create:** `src/components/admin/loans/LoanCallDispositionModal.tsx`

This is the core feature — a multi-step modal that walks through the complete loan calling workflow:

**Step 1 - Client Info**: Shows customer name, phone, car model, loan amount, current stage (read-only header)

**Step 2 - Call Status**: Disposition buttons (Connected, Not Connected, Busy, No Answer, Callback, Wrong Number)

**Step 3 - Loan Stage Update** (if connected): Select next stage from allowed transitions. Shows:
- If moving to `documents_requested`/`documents_received` → **Document Upload Section** with file picker for PAN, Aadhaar, Income Proof, etc. (reuse REQUIRED_DOCUMENTS from LoanStageConfig)
- If moving to `approval` → **Approved/Rejected** radio with rejection reason textarea if rejected
- If moving to `disbursement`/`converted` → **Disbursement fields**: amount, reference number, date, bank name
- If moving to `lost` → **Mandatory lost reason + remarks** (existing pattern)

**Step 4 - EMI Share** (if disbursed/converted): Shows EMI summary card with:
- "Download EMI PDF" button → calls existing `generateEMIPdf()` with loan data
- "Share on WhatsApp" button → calls `generateEMIWhatsAppMessage()` + opens wa.me link
- Auto-populates from loan_applications fields (loan_amount, interest_rate, tenure_months, emi_amount, down_payment)

**Step 5 - Follow-up**: Schedule follow-up date/time/priority (same pattern as existing CallDispositionModal)

On submit: Updates `loan_applications` stage + fields, inserts `call_logs`, inserts `loan_stage_history`, fires `triggerWhatsApp()` for stage-specific events.

### Step 4: Create LoanAutomationPanel
**Create:** `src/components/admin/loans/LoanAutomationPanel.tsx`

Simple config panel showing 8 loan-specific WhatsApp trigger events as toggle cards:
- `loan_contacted`, `loan_qualified`, `loan_offer_shared`, `loan_docs_reminder`, `loan_approved`, `loan_rejected`, `loan_disbursed`, `loan_converted`
- Each card: event name, description, active/inactive toggle
- Reads/writes `wa_event_triggers` table filtered by these events

## Files Summary

| File | Action |
|------|--------|
| `src/components/admin/LoanCRMDashboard.tsx` | Edit — add 2 tabs |
| `src/components/admin/loans/LoanCallingWorkspace.tsx` | Create — calling queue UI |
| `src/components/admin/loans/LoanCallDispositionModal.tsx` | Create — full loan workflow modal |
| `src/components/admin/loans/LoanAutomationPanel.tsx` | Create — trigger config |

No database migrations needed — all tables and fields already exist.

