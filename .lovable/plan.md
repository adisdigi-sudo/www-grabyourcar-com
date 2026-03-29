

# Bulk Quote Excel Template with Auto-Calculation Formulas

## Problem
Current bulk quote system only offers plain CSV templates where users must manually calculate all premium values (NCB discount, Net OD, Total Premium, GST). No auto-calculation support exists.

## Solution
Build an Excel (.xlsx) template download with built-in formulas that auto-calculate NCB discount, Net OD, Net Premium, GST, and Total Premium. Users fill in client details + base values, and the Excel does the math. Then upload it back to generate and send quotes in bulk.

## What Gets Built

### 1. Excel Template Generator (new utility: `src/lib/generateBulkQuoteExcel.ts`)
- Creates an `.xlsx` file using the `exceljs` library (lightweight, no security issues like `xlsx/SheetJS`)
- **Columns**: Customer Name, Phone, Email, City, Vehicle Make, Vehicle Model, Vehicle Number, Vehicle Year, Fuel Type, Insurance Company, Policy Type, IDV, Basic OD, OD Discount %, NCB %, Third Party, Secure Premium, Addon Premium, Addons
- **Formula columns** (auto-calculated):
  - `NCB Discount` = `Basic OD × NCB%`
  - `OD Discount Amount` = `Basic OD × OD Discount%`  
  - `Net OD` = `MAX(0, Basic OD - OD Discount - NCB Discount)`
  - `Net Premium` = `Net OD + Third Party + Secure Premium + Addon Premium`
  - `GST (18%)` = `Net Premium × 0.18`
  - `Total Premium` = `Net Premium + GST`
- Pre-filled sample rows with formulas
- Styled headers, column widths, data validation dropdowns for Fuel Type and Policy Type

### 2. Excel Upload Parser (update `BulkRenewalQuoteGenerator.tsx`)
- Accept `.xlsx` files alongside `.csv`
- Parse using a lightweight approach (read as CSV export or use `exceljs` in browser)
- Map parsed rows to existing `BulkQuoteInsert` format
- Auto-detect calculated vs raw columns

### 3. Enhanced Sample Download Button
- Replace "Sample CSV" with "Download Excel Template" in `BulkRenewalQuoteGenerator`
- Keep CSV option as fallback
- Pre-fill with selected leads' data when available (from `BulkQuoteSharePanel`)

### 4. Bulk Send Flow (already exists, minor enhancement)
- After upload, quotes appear in the table with calculated totals
- Select all → Generate PDFs → Send via WhatsApp API (existing flow)
- Add "Upload & Auto-Send" one-click option

## Technical Details

### Excel Generation Approach
Since we can't use `xlsx` (SheetJS) due to security policy, we'll use `exceljs` which is safe:
```bash
npm install exceljs
```

### Formula Example (Row 2)
```
NCB_Discount (T2) = =M2*O2     (Basic OD × NCB%)
OD_Discount_Amt (U2) = =M2*N2  (Basic OD × OD Discount%)
Net_OD (V2) = =MAX(0, M2-U2-T2)
Net_Premium (W2) = =V2+P2+Q2+R2
GST (X2) = =ROUND(W2*0.18, 0)
Total (Y2) = =W2+X2
```

### Files to Create/Edit
1. **Create** `src/lib/generateBulkQuoteExcel.ts` — Excel template generator with formulas
2. **Edit** `src/components/admin/insurance/BulkRenewalQuoteGenerator.tsx` — Add Excel download + upload support
3. **Edit** `src/components/admin/insurance/BulkQuoteSharePanel.tsx` — Add Excel pre-filled download for selected leads
4. **Install** `exceljs` package

