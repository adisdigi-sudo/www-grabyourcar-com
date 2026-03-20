

## Plan: Fix Insurance Form — Sequential Steps + Validation

### What changes

**File: `src/components/insurance/InsuranceHeroForm.tsx`**

1. **Two-step sequential flow:**
   - **Step 1:** Show only the vehicle registration number field. Validate it matches Indian registration format (e.g., `XX00XX0000` pattern like `DL01AB1234`). Only allow alphanumeric characters. Once a valid registration number is entered, auto-advance to step 2.
   - **Step 2:** Show the phone number field (digits only, 10 digits starting with 6-9). Once valid phone entered, auto-submit — capture lead + redirect to partner URL.

2. **Validation rules:**
   - Vehicle number: regex `/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/` — only allow letters and digits input, auto-uppercase, must match Indian registration format before advancing.
   - Phone: digits only (`/\D/g` stripped), must be 10 digits starting with 6-9.

3. **UX flow:**
   - Step 1 shows car icon + registration input (autoFocus)
   - When valid registration detected → animate transition to step 2 (phone input, autoFocus)
   - When valid phone detected → auto-submit (capture lead + clipboard copy + redirect)
   - No buttons needed — fully automatic progression

4. **Keep existing:** scrolling offers, trust badges, loading spinner, lead capture logic, partner redirect.

### Technical details

- Add `step` state (`1` or `2`)
- `useEffect` on `vehicleNumber` to detect valid format → set step to 2
- `useEffect` on `phone` (when step 2) to detect valid number → trigger submit
- Use `useRef` for phone input to autoFocus when step advances
- Registration regex: `/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/` (covers standard Indian plates)

