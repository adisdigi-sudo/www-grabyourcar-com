

## Plan: Unify Open Calculator with Lead Quote Modal

### Problem
The open calculator (`InsurancePremiumCalculator`) is missing key fields that the lead-specific quote modal (`InsuranceQuoteModal`) has:
- **Insurance Company** selector (with 30+ insurers + custom option)
- **Fuel Type** selector (Petrol, Diesel, CNG, Electric, etc.)
- **Policy Type** selector (Comprehensive, Third Party, Standalone OD)
- **Secure Premium** field
- **Vehicle Year** field

Both calculators also have different visual designs — the user wants them to look the same.

### What Changes

**1. Add missing fields to `InsurancePremiumCalculator.tsx`**
- Add `insuranceCompany` state with the same insurer dropdown (using `INSURANCE_COMPANIES` from `src/lib/insuranceCompanies.ts`) including "Add Custom" option
- Add `fuelType` state with Petrol/Diesel/CNG/Electric/Hybrid/LPG selector
- Add `policyType` state with Comprehensive/Third Party/Standalone OD selector  
- Add `vehicleYear` input field
- Add `securePremium` field (already exists in QuoteModal but missing in open calculator)
- Include secure premium in the calculation (`subtotal = netOD + tp + securePremiumNum + addonTotal`)

**2. Update Customer Info section layout**
- Row 1: Name, Phone (2 cols) — already exists
- Row 2: Vehicle No, Make, Model (3 cols) — already exists  
- **New Row 3**: Vehicle Year, Insurance Company (2 cols)
- **New Row 4**: Fuel Type, Policy Type (2 cols)

**3. Update Vehicle Details card**
- Add Secure Premium input below City/Zone (matching QuoteModal)

**4. Update persistence payload**
- Pass `insuranceCompany` instead of hardcoded "Calculator Quote"
- Pass `policyType` instead of hardcoded "Comprehensive"
- Pass `fuelType` in notes and PDF
- Include `securePremium` in breakup

**5. Update PDF generation**
- Include insurer name, fuel type, and policy type in the PDF vehicle details card
- Match the QuoteModal's PDF format for consistency

**6. Update calculation to include secure premium**
- Add `securePremium` state and include it in the `calc` useMemo

### Files to Edit
- `src/components/admin/insurance/InsurancePremiumCalculator.tsx` — all changes consolidated here

### Visual Consistency
Both calculators will share the same field set and labeling. The open calculator keeps its split-panel layout (inputs left, live quote right) since it's embedded in a wider dialog, while the QuoteModal uses a single-column scrollable dialog since it already has client data pre-filled. The field names, order, and styling will be unified.

