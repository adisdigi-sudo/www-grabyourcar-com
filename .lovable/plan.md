

## Plan: Premium Insurance Quote PDF Generator with One-Click Sharing

### What We're Building
A beautiful, branded PDF quotation (matching the reference image style) that agents can generate and share with a single click from the Smart Calling workspace. The PDF will include full premium breakup, coverage highlights, vehicle/client details, and Grabyourcar branding.

### Architecture

**1. New file: `src/lib/generateInsuranceQuotePdf.ts`**
- A standalone PDF generator using jsPDF (already installed), following the same pattern as `generateEMIPdf.ts`
- Accepts client data (from `SmartCallingClient`), policy data, and optional quote overrides
- Generates a premium-designed PDF with:

  **Header**: Green gradient banner with "GRABYOURCAR" branding + website
  
  **Title**: "PREMIUM MOTOR INSURANCE QUOTATION"
  
  **Greeting**: Personalized thank-you message
  
  **Vehicle & Policy Table**:
  - Insurance Provider, Vehicle (Make + Model), Registration Number, IDV, Year, Fuel Type
  
  **Coverage Highlights** (bullet list):
  - Zero Depreciation, Consumables Cover, Engine Protection, Tyre Protection, RSA, Key Replacement, Personal Belongings Cover (from addons array)
  
  **Premium Breakup Table** (green header row):
  - Basic OD, OD Discount, NCB Discount, Net OD Premium, Third Party, Secure Premium, Add-on Premium, Net Premium, GST (18%), Total Premium Payable
  
  **Summary Box**: Net Premium + Total Premium Payable (bold)
  
  **Footer**: Grabyourcar Insurance Desk contact info, phone, email
  
  **Decorative**: Green corner borders (matching reference image)

**2. New file: `src/components/admin/insurance/InsuranceQuoteModal.tsx`**
- A dialog modal that opens when agent clicks "Send Quote PDF"
- Pre-fills all fields from current client + policy data
- Editable fields for quote customization:
  - Insurance Company (dropdown of common insurers)
  - IDV amount, Basic OD, OD Discount, NCB amount
  - Third Party premium, Add-on premium
  - GST auto-calculated at 18%
  - Coverage add-ons (checkboxes)
- Live preview of Net Premium and Total Premium
- Action buttons:
  - **Download PDF** - generates and downloads locally
  - **Send via WhatsApp** - generates PDF, opens WhatsApp with message + prompts to attach
  - **Send via Email** - generates PDF, sends via edge function with PDF attachment
  - **Copy Quote Summary** - copies text summary to clipboard

**3. Modify: `src/components/admin/insurance/InsuranceSmartCalling.tsx`**
- Add a "📄 Send Quote PDF" button in the Call Outcome section (next to Quote Shared / Renewal Shared share actions)
- When clicked, opens `InsuranceQuoteModal` pre-filled with current client data
- After sending, auto-marks outcome as "quote_shared"

### Data Flow
```text
SmartCallingClient + PolicyData
        ↓
  InsuranceQuoteModal (editable form)
        ↓
  generateInsuranceQuotePdf()
        ↓
  jsPDF → Download / WhatsApp / Email
```

### Premium Breakup Calculation Logic
- Net OD = Basic OD - OD Discount - NCB Discount
- Net Premium = Net OD + Third Party + Add-on Premium
- GST = Net Premium × 18%
- Total Premium Payable = Net Premium + GST

### Technical Details
- Uses jsPDF drawing primitives for the green decorative border corners (matching reference)
- Table rendering uses manual coordinate-based drawing (same approach as `generateEMIPdf.ts`)
- Currency formatting follows Indian numbering (₹XX,XX,XXX)
- PDF filename: `{CustomerName}_{Vehicle}_Insurance_Quote.pdf`
- WhatsApp sharing: opens `wa.me` link with summary text; user manually attaches downloaded PDF
- Email sharing: invokes existing `send-email` or `send-automated-email` edge function with HTML version

