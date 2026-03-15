

# Car Loan CRM Workspace Overhaul

## What You Asked For
1. EMI Calculator should show detailed calculations with typed inputs (month, amount) and proper number formatting
2. Pipeline columns should have clean row/column lines with beautiful separators
3. New Lead form should capture all details including loan type (New Car, Used Car, Top-up Loan, etc.)
4. Show actual lead source in pipeline cards
5. Remove non-loan services (HR, other verticals) — keep only the Loan CRM workspace

## Plan

### 1. Database Migration — Add `loan_type` Column
Add a `loan_type` text column to `loan_applications` to categorize leads:
- New Car Loan
- Used Car Loan
- Top-up Loan
- Loan Transfer / Balance Transfer
- Commercial Vehicle Loan

### 2. EMI Calculator Redesign (`LoanWorkspace.tsx` — EMICalculator section)
- Replace slider-only inputs with **typed number inputs** (editable fields for Amount, Rate, Tenure in months)
- Keep range sliders as secondary visual aid
- Add a **detailed breakdown table** showing:
  - Monthly EMI, Total Interest, Total Payable
  - Month-wise amortization summary (first/last 3 months preview)
- Format numbers with commas (Indian locale) as user types
- Keep PDF download and WhatsApp share

### 3. Pipeline Board Visual Upgrade (`LoanWorkspace.tsx` — Kanban section)
- Add **visible column divider lines** (left border on each stage column)
- Add **row separators** between cards (subtle bottom borders)
- Improve card layout with cleaner grid lines and spacing
- Show **loan type badge** on each card (e.g., "New Car", "Used Car", "Top-up")
- Show **actual source** with color-coded badge (Meta = blue, Google = red, etc.)
- Increase card width slightly for better readability

### 4. Enhanced "New Lead" Dialog (`LoanWorkspace.tsx` — Add Dialog)
Expand the form to capture full lead details before creation:
- **Loan Type** (required): New Car / Used Car / Top-up / Balance Transfer / Commercial
- **Customer Name** (required)
- **Phone** (required)
- **Email** (optional)
- **Loan Amount** (optional)
- **Car Model** (optional)
- **Down Payment** (optional)
- **Employment Type**: Salaried / Self-Employed / Business
- **Monthly Income** (optional)
- **City** (optional)
- **Priority**: Hot / High / Medium / Low
- **Source**: Meta, Google Ads, Referral, Walk-in, etc.
- **Remarks**

### 5. Remove Non-Loan References
- Update `LoansVerticalWorkspace.tsx` to render `LoanWorkspace` directly without the wrapper card (cleaner)
- The workspace already only shows loan CRM — no HR/other services are in this component. The sidebar routing handles vertical isolation, so no additional cleanup needed in this file.

### 6. Config Updates (`LoanStageConfig.ts`)
- Add `LOAN_TYPES` array for the dropdown options
- Add `EMPLOYMENT_TYPES` array

### Files to Edit
- `src/components/admin/loans/LoanStageConfig.ts` — add loan types, employment types
- `src/components/admin/loans/LoanWorkspace.tsx` — EMI calculator redesign, pipeline visual upgrade, enhanced add dialog
- Database migration: add `loan_type` column

