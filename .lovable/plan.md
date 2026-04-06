

# Add Omni-Channel Share Dialog for Offers & EMI Across All Verticals

## Overview
Create a reusable **OmniShareDialog** component that supports sharing PDFs, offers, and EMI details via **WhatsApp, Email, RCS, and PDF download** — then integrate it across Loans, Sales, Insurance, and HSRP verticals.

## Current State
- **Insurance** has a `SharePdfDialog` but it's tightly coupled to insurance persistence (`persistInsuranceQuoteHistory`)
- **Loans** `LoanBulkOfferPanel` has basic WhatsApp + PDF download but no unified share dialog, no Email, no RCS
- **Sales & HSRP** have no share/offer functionality at all

## Plan

### 1. Create `OmniShareDialog` — Shared Reusable Component
**New file**: `src/components/admin/shared/OmniShareDialog.tsx`

A generic share dialog with 5 tabs:
- **WhatsApp** (manual wa.me link with PDF download)
- **WhatsApp API** (automated via `omni-channel-send` edge function)
- **Email** (via `omniSend` with email channel)
- **RCS** (via `omniSend` with RCS channel)
- **Download PDF** (direct save)

Props: `generatePdf`, `title`, `defaultPhone`, `defaultEmail`, `customerName`, `shareMessage`, `onShared`, `vertical` (for logging)

Uses existing `omniSend` utility for Email & RCS channels, and `sendWhatsApp` for WhatsApp.

### 2. Integrate into Loan CRM
- Update **`LoanBulkOfferPanel.tsx`**: Replace individual WhatsApp/Email buttons per row with an "Share" button that opens `OmniShareDialog`, passing `generateLoanOfferPDF` as the PDF generator
- Add a share action button in the **loan lead detail** area for single-lead offer sharing

### 3. Integrate into Sales CRM
- Update **`SalesLeadDetailModal.tsx`**: Add a "Share Offer" button that generates a basic sales offer PDF and opens `OmniShareDialog`
- Create a simple **`SalesOfferPDF.ts`** utility that generates a car deal offer PDF (customer name, car model, deal value, special terms)

### 4. Integrate into Insurance (upgrade existing)
- Update existing `SharePdfDialog` usages to use the new `OmniShareDialog` which adds RCS support (currently missing)

### 5. Integrate into HSRP
- Add share capability to HSRP booking confirmations via `OmniShareDialog`

## Summary

| File | Action |
|------|--------|
| `src/components/admin/shared/OmniShareDialog.tsx` | New — 5-tab share dialog (WA, WA API, Email, RCS, Download) |
| `src/components/admin/sales/SalesOfferPDF.ts` | New — Sales deal offer PDF generator |
| `src/components/admin/loans/LoanBulkOfferPanel.tsx` | Wire OmniShareDialog per lead row |
| `src/components/admin/sales/SalesLeadDetailModal.tsx` | Add Share Offer button with OmniShareDialog |
| `src/components/admin/insurance/InsuranceQuoteHub.tsx` | Swap to OmniShareDialog (adds RCS) |
| `src/components/admin/insurance/InsuranceSmartCalling.tsx` | Swap to OmniShareDialog (adds RCS) |

