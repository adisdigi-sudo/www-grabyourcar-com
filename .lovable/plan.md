

# Self-Drive Rentals vs HSRP & FASTag — Feature Map & What to Build Next

## Current State Summary

### What's Already Built

| Feature | Self-Drive Rentals | HSRP & FASTag |
|---|---|---|
| **Public Website Page** | `/self-drive` — Vehicle listings, filters, 3 service tabs (Self-Drive, With Driver, Outstation), booking modals | `/hsrp` — Booking form, order tracking, pricing, FAQ, benefits |
| **CRM Pipeline (Backend)** | 6-stage Kanban (New Inquiry → Smart Call → Offer → Partner Escalation → Booking → Trip Complete) | 6-stage Kanban (New Booking → Verification → Payment → Scheduled → Installation → Completed) |
| **Drag & Drop** | Yes | Yes |
| **Lead Import (CSV)** | Yes | Yes |
| **KPI Dashboard** | Total/Active/Completed/Revenue | Total/Completed/Revenue/Pending Pay |
| **Notifications** | Pickup/Return alerts (48h, overdue) | Installation alerts, payment pending |
| **Add Lead Dialog** | Vehicle, dates, pickup/drop location, daily rate | Owner, mobile, registration, chassis/engine, vehicle class, service type |
| **Detail Modal** | Call logging, partner escalation, payment, agreement PDF, feedback | Verification fields, payment, scheduling, installation notes |
| **Edge Functions** | `partner-booking` (API partner integration) | None dedicated |
| **WhatsApp Automation** | None | None |
| **Lead Nurturing** | None | None |
| **Auto Status Updates** | None | None |

---

## What's MISSING — Recommended Build Plan

### Phase 1: Website Lead Capture Improvements (Both Verticals)

**Self-Drive Rentals** (`/self-drive`)
- Booking form currently creates `rental_bookings` but does NOT send WhatsApp confirmation or capture lead in `leads` table
- Add: Auto-capture every booking inquiry into `leads` with `service_category = 'self-drive'`
- Add: WhatsApp confirmation message on booking (vehicle, dates, amount)
- Add: "Request Callback" option for users who browse but don't book

**HSRP & FASTag** (`/hsrp`)
- Booking form creates `hsrp_bookings` with silent auto-login — this works well
- Missing: WhatsApp booking confirmation with order ID + next steps
- Missing: SMS/WhatsApp status updates when stage changes (e.g., "Your HSRP plate is scheduled for installation on [date]")

### Phase 2: Automated Lead Nurturing (Edge Functions)

**New Edge Function: `rental-nurture-engine`**
- Trigger: When a rental inquiry is created and NOT converted in 2 hours
- Action: Send WhatsApp follow-up with availability + pricing
- Trigger: 24h before pickup date
- Action: Send WhatsApp reminder with pickup details, documents needed
- Trigger: After trip complete
- Action: Send feedback request + cross-sell (insurance, HSRP)

**New Edge Function: `hsrp-status-notifier`**
- Trigger: When `pipeline_stage` changes on `hsrp_bookings`
- Action: Send WhatsApp message with stage-specific updates:
  - `verification` → "Documents received, verifying..."
  - `payment` → "Verification done! Pay Rs.X to proceed" + payment link
  - `scheduled` → "Installation scheduled for [date] at [location]"
  - `installation` → "Technician is on the way"
  - `completed` → "HSRP installed! Thank you" + feedback request

### Phase 3: CRM Backend Enhancements

**Self-Drive CRM**
- Add customer name + phone fields to rental cards (currently only shows vehicle name)
- Add WhatsApp quick-send button on each card (pre-filled with booking details)
- Add agreement PDF generation at Booking stage
- Add partner commission tracking when escalated to API partners

**HSRP CRM**
- Add WhatsApp quick-send at each stage (verification docs needed, payment link, installation schedule)
- Add bulk status update (select multiple → move to next stage)
- Add daily installation schedule view (calendar format)
- Add technician assignment field at Installation stage

### Phase 4: Cross-Sell Integration

- After rental trip → suggest HSRP if vehicle is new
- After HSRP completion → suggest car insurance
- After FASTag → suggest car accessories
- These triggers feed into the existing `customer-journey-engine`

---

## Implementation Order (Recommended)

1. **WhatsApp status notifications for HSRP** — highest value, customers want real-time updates on their plate order
2. **Customer name/phone on Rental CRM cards** — basic usability fix
3. **Booking confirmation WhatsApp for both verticals** — immediate customer trust
4. **Lead nurturing edge functions** — automated follow-ups reduce manual calling
5. **Cross-sell triggers** — revenue optimization

---

## Technical Scope

| Item | Type | Files |
|---|---|---|
| HSRP WhatsApp status notifier | New Edge Function | `supabase/functions/hsrp-status-notifier/index.ts` |
| Rental nurture engine | New Edge Function | `supabase/functions/rental-nurture-engine/index.ts` |
| Rental card customer info | Frontend edit | `SelfDriveWorkspace.tsx` |
| WhatsApp quick-send buttons | Frontend edit | `HSRPWorkspace.tsx`, `SelfDriveWorkspace.tsx` |
| Booking confirmation triggers | Frontend edit | `HSRPUnifiedBookingForm.tsx`, `RentalBookingModal.tsx` |
| Cross-sell triggers | Config update | `customer-journey-engine/index.ts` |

