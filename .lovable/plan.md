

## Plan: Full GrabYourCar Branding & Branded Redirect Transition

### Goal
Remove all PolicyBazaar/PB Partners mentions from the insurance page and hero form. Add a branded interstitial transition page that shows GrabYourCar credentials and security assurance before auto-redirecting the client to the partner URL after ~5 seconds.

### Changes

**1. Remove all PolicyBazaar references (`CarInsurance.tsx`, `InsuranceHeroForm.tsx`)**
- Remove `PB_PARTNERS_URL` constant from both files
- Remove the hero badge text "Authorised Channel Partner • PolicyBazaar" — replace with "IRDAI Authorised • Trusted by 50,000+ Customers"
- Remove the "Check prices" button that links to PB Partners URL
- All CTAs will now go through the branded transition flow

**2. Create Branded Redirect Transition Component (`src/components/insurance/InsuranceBrandedRedirect.tsx`)**
- Full-screen modal/overlay with GrabYourCar logo, green branding
- Shows: "You're being securely redirected via GrabYourCar"
- Trust elements: IRDAI badge, encryption icon, "Your data is protected" text
- Animated progress bar / countdown (5 seconds)
- Auto-redirects to the partner URL after countdown
- Cancel button to go back

**3. Update InsuranceHeroForm flow (`InsuranceHeroForm.tsx`)**
- Replace `handleFinalize` to open the branded redirect overlay instead of direct `window.open`
- Store the redirect URL internally (not shown to user)
- The "Buy This Policy" button triggers the branded transition component
- Remove UID/ARN regulatory footer referencing PB

**4. Update InsuranceCTA and other components**
- Scan and remove any remaining "PolicyBazaar" or "pbpartners" references across insurance components

### Files to Create/Edit
- **Create**: `src/components/insurance/InsuranceBrandedRedirect.tsx`
- **Edit**: `src/components/insurance/InsuranceHeroForm.tsx`
- **Edit**: `src/pages/CarInsurance.tsx`

