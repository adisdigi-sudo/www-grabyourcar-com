

# Ads-Ready Tracking & Landing Pages — Implementation Plan

## Overview
Install Google Ads (gtag.js) and Meta Pixel globally, wire conversion events to successful actions only, capture UTM params in all lead forms, create a /thank-you page, and build 3 conversion-optimized landing pages.

---

## What Will Be Built

### 1. Global Tracking Scripts (gtag.js + Meta Pixel)
- Add Google Tag (`gtag.js`) and Meta Pixel (`fbq`) scripts to `index.html` `<head>`
- Use placeholder IDs (`AW-XXXXXXXXXX` and `XXXXXXXXXXXXXXXXX`) that the user replaces with real IDs
- Add preconnect hints for `googletagmanager.com` and `connect.facebook.net`

### 2. Centralized Tracking Utility — `src/lib/adTracking.ts`
A single module exposing:
- `trackLeadConversion(formSource)` — fires `gtag('event', 'conversion', ...)` + `fbq('track', 'Lead')`
- `trackWhatsAppConversion()` — fires `gtag_report_conversion` + `fbq('track', 'Contact')`
- `trackCallConversion()` — fires conversion events for phone clicks
- `captureUTMParams()` — reads `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` from URL and returns them
- Debug console logs gated behind `localStorage.getItem('debug_ads')`
- All events fire ONLY when called explicitly (never on page load)

### 3. SPA Page View Tracking
- Create a `usePageViewTracking` hook that fires `gtag('event', 'page_view')` and `fbq('track', 'PageView')` on every route change via `useLocation()`
- Add it to `App.tsx`

### 4. Wire Conversions to Existing Forms & CTAs
Integrate `trackLeadConversion()` into successful submit handlers of:
- `BookingForm.tsx` — after successful insert
- `LeadForm.tsx` — after successful insert
- `EntryLeadCaptureModal.tsx` — after successful submit
- `ExitIntentPopup.tsx` — after successful submit
- `BrochureLeadGate.tsx` — after successful submit
- `CorporateCTA.tsx` — after successful submit
- `InsuranceHeroForm.tsx` — after phone submit
- `CarLoanEligibilityForm.tsx` — after eligibility check

Integrate `trackWhatsAppConversion()` into:
- `WhatsAppCTA.tsx` — existing `trackWhatsAppClick` handler
- `WhatsAppFloatingButton` — existing click handler

Integrate `trackCallConversion()` into:
- Any `tel:` link click handlers (Header component)

Add `captureUTMParams()` to all lead form submissions — append UTM fields to the Supabase insert payload (tables already have `utm_source`, `utm_medium`, `utm_campaign` columns).

### 5. Thank You Page — `/thank-you`
- New page `src/pages/ThankYou.tsx`
- Fires conversion events on mount (since user is redirected here only after successful submit)
- Shows confirmation message, next steps, and CTA to browse cars
- Accepts query params `?source=booking&car=Creta` for contextual messaging
- Route added to `App.tsx`
- Update key forms to redirect to `/thank-you` after success

### 6. Ad Landing Pages (Conversion-Optimized)

**`/no-waiting-cars`** — `src/pages/NoWaitingCars.tsx`
- Hero: "Zero Waiting Period Cars — Drive Home Today"
- Filtered car listings (ready stock)
- Simple lead form (Name + Phone only) with UTM capture
- Strong CTAs: WhatsApp + Call

**`/best-car-deals`** — `src/pages/BestCarDeals.tsx`
- Hero: "Best Car Deals This Month — Save Up To ₹2 Lakh"
- Featured deals/offers section
- Simple lead form (Name + Phone) with UTM capture
- Trust badges, urgency indicators

**`/car-loan` already exists** — enhance with conversion tracking (already has form + eligibility checker)

### 7. Click-to-Call Button
- Already exists as WhatsApp floating button; add a mobile-only floating call button in `WhatsAppCTA.tsx` or a new `FloatingCallButton` component
- Fires `trackCallConversion()` on click

---

## Technical Details

**Files to create:**
- `src/lib/adTracking.ts` — centralized gtag/fbq helpers + UTM capture
- `src/hooks/usePageViewTracking.ts` — SPA route change tracking
- `src/pages/ThankYou.tsx`
- `src/pages/NoWaitingCars.tsx`
- `src/pages/BestCarDeals.tsx`
- `src/components/FloatingCallButton.tsx`

**Files to modify:**
- `index.html` — add gtag.js + Meta Pixel scripts
- `App.tsx` — add routes + page view hook
- `BookingForm.tsx`, `LeadForm.tsx`, `EntryLeadCaptureModal.tsx`, `ExitIntentPopup.tsx`, `BrochureLeadGate.tsx`, `CorporateCTA.tsx` — add conversion + UTM tracking
- `WhatsAppCTA.tsx` — add ad conversion tracking to click handlers
- `src/config/contact.ts` — already has phone number (will use for call button)

**No database changes needed** — UTM columns already exist on leads/insurance tables.

