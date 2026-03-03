

## Plan: Connect GrabYourCar Form to PB Partners Quote Journey

### What the user wants
- User enters car number and mobile number on the GrabYourCar website
- Lead is saved to the backend for team follow-up
- After submission, user is redirected (via the branded redirect screen) to the PB Partners quote page where they continue their journey
- The sample quotes step is removed -- the real quotes come from the PB Partners page

### Changes

**1. Update `PARTNER_URL` in `InsuranceHeroForm.tsx`**
- Replace the old generic URL with the actual PB Partners tokenized URL the user provided
- Remove the fake `sampleQuotes` array and the entire "quotes" step since real quotes will be shown on the PB Partners page

**2. Simplify the flow to: Vehicle → Phone → Branded Redirect**
- After phone submission and lead capture, go directly to the branded redirect overlay (skip the "quotes" step entirely)
- The branded redirect shows the GrabYourCar security screen for 5 seconds, then opens the PB Partners URL
- Remove `FlowStep` values `"quotes"` and `"finalize"` since they're no longer needed
- Remove `selectedQuote`, `sampleQuotes`, and all quote-related UI

**3. Flow summary**
```text
User enters car number → enters phone → lead saved to DB → 
branded GrabYourCar redirect screen (5s) → opens PB Partners quote page
```

### Files to edit
- `src/components/insurance/InsuranceHeroForm.tsx` -- update URL, remove quotes step, redirect after phone submit

