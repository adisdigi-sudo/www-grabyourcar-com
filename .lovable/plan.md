

# Add Expiry Date Display & Vehicle Inspection Warning to Quote Calculator

## What's Already Working
The calculator already locks NCB to 0% when policy is expired >90 days and shows a disclaimer. No changes needed to that logic.

## What Will Be Added

### 1. Policy Expiry Status Banner (new section after header, before Row 1)
A prominent banner showing:
- The actual policy expiry date (formatted)
- Days since expiry or days until expiry
- Color-coded: green (active), amber (expiring soon / expired <90 days), red (expired >90 days)
- When expired >90 days: bold red warning stating **"Vehicle Inspection Required as per IRDAI Guidelines"**

### 2. Enhanced NCB Disclaimer
Update the existing disclaimer block (lines 447-467) to include:
- Explicit IRDAI guideline reference for the 90-day rule
- Vehicle physical inspection requirement note when expired >90 days
- Text like: *"As per IRDAI guidelines, if previous policy has lapsed for more than 90 days, NCB benefit is forfeited and a physical vehicle inspection is mandatory before issuing a new policy."*

### 3. Inspection Warning in Quote Output
When the policy is expired >90 days, add a note in the generated quote/WhatsApp/copy text:
- "⚠ Vehicle inspection required (policy lapsed >90 days)"

## Technical Details

### File: `src/components/admin/insurance/InsuranceQuoteModal.tsx`

- Add a new banner section between `DialogHeader` (line 329) and the first grid row (line 334)
- Shows expiry date, days count, and inspection warning when applicable
- Update the disclaimer text at lines 461-464 to mention IRDAI inspection requirement
- Update `notes` field in `buildQuoteData` (line 233) and WhatsApp message (line 267) to include inspection note when applicable

No database changes needed.

