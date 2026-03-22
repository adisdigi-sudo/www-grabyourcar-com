

# Deep Analysis: Missing Features & Redesign Plan for Self-Drive, HSRP & Corporate Fleet

## Honest Assessment of Current State

### Self-Drive Rentals (/self-drive) — Currently 5/10
**What exists:** Basic vehicle listing, filters (brand/fuel/transmission/location), booking modal with Razorpay, service tabs (Self-Drive, With Driver, Outstation), WhatsApp CTA.

**What's missing vs. Zoomcar/Revv/MyChoize:**
1. No KM limits or fuel policy display — competitors clearly show "Unlimited KMs" or "300 KMs/day + Rs.8/extra km"
2. No hourly/weekly/monthly/subscription pricing — Zoomcar has Daily, Subscription, Weekday Pass
3. No security deposit info upfront — hidden until booking modal
4. No vehicle reviews/ratings from past renters
5. No delivery vs. pickup mode toggle — Zoomcar has "Delivery & Pick-up from anywhere"
6. No trip protection/insurance add-on selection
7. No document requirement checklist (DL, Aadhaar) shown before booking
8. No real-time availability calendar — just a binary "available" badge
9. No "similar vehicles" recommendation when a car is unavailable
10. No booking tracking/my-trips page for returning customers
11. No cancellation/refund policy displayed
12. **No rental agreement generation on the public side** — only exists in admin CRM

### HSRP (/hsrp) — Currently 7/10
**What exists:** RC auto-lookup, auto-detect vehicle category, step-by-step booking, Razorpay payment, home installation option, pincode checker, pricing display.

**What's missing vs. competitors (platehsrp.com, myhsrpbooking.com):**
1. No order tracking page — after booking, user has no way to check status
2. No bulk HSRP booking (fleet owners need 10-50 vehicles at once)
3. No "Check if your vehicle needs HSRP" compliance checker
4. No state-wise pricing/availability display
5. No installation slot calendar with available dates
6. No photo upload for existing plate (for replacement orders)
7. No real customer testimonials/reviews on the page
8. No "Dealer/Fleet Partner" pricing tier
9. No SMS/WhatsApp booking confirmation with tracking link

### Corporate/Fleet (/corporate) — Currently 3/10
**What exists:** Marketing landing page with static content — hero, logo grid, stats, case studies, FAQ, and a basic lead capture form. No actual functionality.

**What's critically missing:**
1. **No fleet requirement calculator** — companies need to estimate TCO (Total Cost of Ownership)
2. **No vehicle catalog for corporate** — can't browse cars with corporate pricing
3. **No agreement/contract generation** — no lease agreement, no MoU draft
4. **No fleet dashboard for corporate clients** — no login, no order history
5. **No bulk quotation builder** — can't configure 20 Creta + 5 Innova and get a PDF quote
6. **No EMI/leasing calculator for fleet** — lease vs. buy comparison
7. **No multi-vehicle booking flow** — no cart for multiple vehicles
8. **No dedicated corporate pricing tiers** shown
9. **No fleet insurance bundling** option
10. **No delivery timeline/tracking** for bulk orders

---

## Redesign Plan

### Phase 1: Self-Drive Rentals Redesign

**File changes:** `SelfDriveRentals.tsx`, new components in `src/components/rentals/`

1. **Pricing transparency overhaul** on `RentalVehicleCard.tsx`
   - Show KM limit, fuel policy, security deposit on each card
   - Add hourly/daily/weekly/monthly toggle pricing
   - Display cancellation policy badge

2. **New component: `RentalAvailabilityCalendar.tsx`**
   - Date picker showing real-time availability per vehicle
   - Blocked dates shown in red, available in green

3. **New component: `RentalDocRequirements.tsx`**
   - Pre-booking checklist: DL, Aadhaar, age 21+, credit card
   - Shown as a collapsible section before the vehicle grid

4. **New component: `TripProtectionAddon.tsx`**
   - Basic/Standard/Premium insurance add-on selector in booking modal
   - Excess damage waiver, zero-deposit option

5. **New component: `RentalPolicies.tsx`**
   - Fuel policy, KM limits, late return charges, cancellation rules
   - Displayed as tabs below the booking form

6. **New component: `DeliveryModeSelector.tsx`**
   - Toggle: "Pick up from hub" vs. "Doorstep delivery (+Rs.500)"
   - Location input with Google Maps pin

7. **Booking confirmation & tracking page** (`src/pages/MyTrips.tsx`)
   - Trip status, agreement download, extend trip, support chat

### Phase 2: HSRP Page Enhancement

**File changes:** `HSRP.tsx`, new components in `src/components/hsrp/`

1. **New component: `HSRPOrderTracker.tsx`**
   - Enter booking ID or phone → see real-time status (Booked → Verified → Scheduled → Installed)
   - WhatsApp notification integration

2. **New component: `HSRPBulkBooking.tsx`**
   - Fleet/dealer mode: upload Excel of vehicle RCs for bulk HSRP orders
   - Bulk pricing display (10+ vehicles = 10% discount)

3. **New component: `HSRPComplianceChecker.tsx`**
   - Enter RC number → check if vehicle already has HSRP or needs one
   - Show challan/fine risk if non-compliant

4. **New component: `HSRPTestimonials.tsx`**
   - Real customer reviews with star ratings
   - Before/after photos of installations

5. **Installation slot picker** in booking form
   - Calendar with available dates and time slots per area

### Phase 3: Corporate Fleet — Full Functional Rebuild

**File changes:** Complete rebuild of `CorporateBuying.tsx`, new components in `src/components/corporate/`

1. **New component: `FleetRequirementBuilder.tsx`**
   - Multi-vehicle cart: add car models with quantities
   - Choose: Buy / Lease / Subscription for each
   - Real-time pricing from car database

2. **New component: `FleetQuotationGenerator.tsx`**
   - Generate PDF quotation with company branding
   - Include: vehicle specs, pricing, delivery timeline, terms
   - Email/WhatsApp share option

3. **New component: `LeaseVsBuyCalculator.tsx`**
   - Side-by-side TCO comparison: Ownership vs. Lease vs. Subscription
   - 3-year/5-year projections with depreciation, insurance, maintenance

4. **New component: `CorporateAgreementDraft.tsx`**
   - Auto-generate MoU / Fleet Supply Agreement
   - Populate with company details, vehicle list, payment terms
   - PDF download with digital signature placeholder

5. **New component: `CorporatePricingTiers.tsx`**
   - Tier display: 1-5 vehicles (Standard), 5-20 (Business), 20+ (Enterprise)
   - Show discount percentages and included services per tier

6. **New component: `FleetInsuranceBundler.tsx`**
   - Bundle comprehensive insurance for all fleet vehicles
   - Group discount calculation

7. **Redesigned CTA form** with multi-step wizard instead of single form
   - Step 1: Company details
   - Step 2: Vehicle requirements (model, qty, fuel, use case)
   - Step 3: Budget & timeline
   - Step 4: Review & submit

---

## Technical Approach

- All new components use existing UI library (shadcn/ui, framer-motion)
- Pricing data pulls from existing `cars` and `car_variants` tables
- Corporate leads save to existing `leads` table with `vertical: "corporate"`
- Agreement PDFs generated client-side using jsPDF (already in project for rental agreements)
- Order tracking queries existing `hsrp_bookings` table
- No new database tables needed for Phase 1 & 2
- Phase 3 may need a `corporate_quotations` table for saving generated quotes

## Priority Order
1. HSRP Order Tracker + Compliance Checker (quick wins, high customer value)
2. Self-Drive pricing transparency + policies (trust building)
3. Corporate Fleet Requirement Builder + Quotation Generator (revenue driver)
4. Agreement generation across all 3 verticals

