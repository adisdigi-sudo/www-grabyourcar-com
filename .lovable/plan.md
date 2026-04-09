

# GrabYourCar — Enterprise Completion Roadmap

## Current State Summary
The platform already has 11 verticals, 80+ Edge Functions, WhatsApp AI bot, lead routing, insurance CRM, sales pipeline, loan management, HR/payroll, marketing hub, and extensive automation. What follows are the **gaps** to fill, organized into small, sequential phases.

---

## Phase 1 — Lead Capture & Attribution (Universal Intake)
**Goal**: Every lead from every source lands in the CRM with full attribution.

1. **Audit & fix lead-intake-engine** — Ensure all website forms (car inquiry, insurance, loan, HSRP, accessories, self-drive, corporate) route through `submit-lead` with correct `serviceCategory` and UTM fields.
2. **Meta/Google Ads webhook receiver** — Create a `meta-lead-webhook` Edge Function that accepts Meta Lead Ads (instant forms) and Google Ads click-to-lead webhooks, maps fields, and inserts into `leads` table with `source = 'meta_ads'` / `source = 'google_ads'`.
3. **WhatsApp chatbot lead capture** — Verify `ai-brain` → `submit-lead` pipeline captures every qualified intent as a lead (not just car inquiries — insurance, loan, HSRP too).
4. **Email inbound lead capture** — Parse inbound emails (via Zoho mail proxy or Resend inbound webhook) to auto-create leads from inquiry emails.
5. **UTM + CAC tracking** — Ensure every lead row stores `utm_source`, `utm_medium`, `utm_campaign`, `ad_spend_id` for cost-per-acquisition reporting.

---

## Phase 2 — Revenue & Performance Analytics
**Goal**: Real-time dashboards for leads, revenue, employee performance, ad spend ROI.

1. **Unified Analytics Dashboard** — Build a cross-vertical KPI dashboard showing: total leads, conversion rates, revenue by vertical, CAC by source, ad budget vs leads generated.
2. **Ad Spend Tracker** — Create `ad_campaigns` table (platform, campaign_name, daily_spend, impressions, clicks, leads_generated) with CSV/API import.
3. **Employee Performance Engine** — Aggregate leads handled, calls made, deals closed, revenue generated per employee across all verticals with leaderboard.
4. **Budget vs ROI reports** — Auto-calculate CAC (total spend / leads) per campaign, per source, per vertical.

---

## Phase 3 — AI Automation & Auto-Calling
**Goal**: AI agents that follow up, qualify, and close leads autonomously.

1. **WhatsApp AI Follow-up Sequences** — Extend `wa-automation-trigger` to support multi-step drip sequences: Day 0 (intro), Day 1 (follow-up), Day 3 (offer), Day 7 (last chance) — per vertical.
2. **AI Lead Qualification Bot** — Enhance `ai-brain` to score leads based on conversation (budget, timeline, intent) and auto-update `lead_score` and `status`.
3. **Auto-Dialer Integration** — Create `auto-dialer` Edge Function that integrates with a telephony API (Exotel/Knowlarity) to auto-dial uploaded contact lists, log call status (answered/not answered/interested/not interested), and update lead records.
4. **Voice AI Agent** — Integrate with ElevenLabs or similar for AI voice calls that qualify leads, set appointments, and log responses.
5. **Auto-close pipeline** — When AI confirms "interested + docs ready", auto-move lead to next pipeline stage and notify assigned executive.

---

## Phase 4 — Bulk Marketing (Email + WhatsApp + RCS)
**Goal**: Professional bulk campaigns with delivery tracking and auto-replies.

1. **WhatsApp Bulk Campaign Launcher** — Fix/enhance `wa-campaign-launcher` for template-based bulk sends with delivery status tracking (sent/delivered/read/failed).
2. **Email Campaign Engine** — Verify `send-bulk-email` works end-to-end with Resend: batch sends, open/click tracking via `resend-webhook`.
3. **RCS Channel** — Wire up Twilio RCS in `omni-channel-send` for rich message campaigns.
4. **Auto-Reply Engine** — Build WhatsApp auto-reply rules: keyword-based instant responses + AI fallback for unmatched messages.
5. **Real-time Campaign Dashboard** — Show sent/delivered/read/failed/replied counts per campaign with live updates.
6. **Sales Pipeline Integration** — When a campaign recipient replies with interest, auto-create or update their lead and notify the assigned executive.

---

## Phase 5 — Responsive UI & Corporate Management Hierarchy
**Goal**: Mobile/tablet/desktop responsive CRM with role-based views.

1. **Responsive audit & fix** — Test all CRM pages at 360px, 768px, 1024px, 1440px. Fix overflow, truncation, and navigation issues.
2. **Role-based dashboards** — Super Admin sees everything; Vertical Manager sees their vertical; Team Leader sees their team; Caller/Executive sees only assigned leads.
3. **Manager hierarchy view** — Each vertical shows: Manager → Team Leaders → Callers with real-time activity status (online/idle/on-call).
4. **Corporate-style reports** — Auto-generated daily/weekly PDF reports per manager showing team performance, revenue, and pipeline health.

---

## Phase 6 — HR & Accounts Automation
**Goal**: Auto-calculate incentives, disburse salaries, manage HR lifecycle.

1. **Auto-Incentive Calculator** — Based on `team_targets` and actual deals closed, auto-calculate monthly incentives per employee.
2. **Salary Auto-Processing** — Integrate attendance data + deductions + incentives → auto-generate payslips and mark for disbursement.
3. **HR Lifecycle Automation** — Offer letter generation → onboarding checklist → document collection → probation tracking → exit process — all automated with notifications.
4. **Revenue & Commission History** — Store and display historical incentive/commission data per employee with downloadable reports.

---

## Phase 7 — Marketing Data Upload & AI Revenue Generation
**Goal**: Upload Excel data, AI processes it, sets statuses, generates revenue actions.

1. **Smart Excel Upload Engine** — Drag-and-drop Excel upload that auto-maps columns to lead fields, validates data, and bulk-inserts with duplicate detection.
2. **AI Data Processor** — After upload, AI auto-categorizes leads (hot/warm/cold), sets follow-up dates, and assigns to team members.
3. **Auto-Campaign Trigger** — Uploaded data automatically triggers welcome WhatsApp + email sequence based on lead type.

---

## Phase 8 — Auto-Campaigns & Policy Automation
**Goal**: Policies auto-sent to clients; renewal reminders; cross-sell triggers.

1. **Policy Dispatch Automation** — When insurance policy status → "won", auto-send policy PDF via WhatsApp + email to client.
2. **Renewal Reminder Engine** — Enhance `insurance-renewal-engine` to send WhatsApp + email + RCS reminders at 60/45/30/15/7 days before expiry.
3. **Cross-Sell Auto-Triggers** — Car sale completed → auto-trigger insurance inquiry; Loan approved → auto-trigger insurance + accessories suggestions.
4. **Follow-up Scheduler** — Auto-schedule follow-ups for all open leads across verticals; send reminders to executives and auto-message to clients.

---

## Phase 9 — Dealer Auto-Call & Car Finder
**Goal**: Upload dealer data, auto-call, track car availability.

1. **Dealer Data Upload** — Bulk upload dealer contact lists via Excel with brand/model/city mapping.
2. **Dealer Auto-Inquiry System** — Auto-call/WhatsApp dealers to check car availability, pricing, and delivery timelines.
3. **Car Finder Integration** — When customer requests a specific car, auto-query dealer network and respond with availability + pricing.
4. **Dealer Follow-up Automation** — Auto-follow-up with dealers on pending inquiries; log responses and update inventory status.

---

## Phase 10 — Car Database Completion
**Goal**: All brands, models, variants, images, and specs uploaded.

1. **Bulk brand/model data upload** — Use `migrate-all-cars` and `generate-car-data` to populate remaining brands.
2. **Image scraping pipeline** — Use `fetch-car-images` + `scrape-car-images` to pull official images for all models.
3. **Variant & pricing sync** — Auto-update ex-showroom prices and variant lists from OEM data feeds.
4. **Quality audit** — Verify every car has: min 3 images, complete specs, at least 1 variant with pricing.

---

## Execution Order (Recommended)

| Step | Phase | Estimated Scope |
|------|-------|----------------|
| 1 | Phase 1 — Lead Capture | Fix intake + Meta/Google webhooks |
| 2 | Phase 5 — Responsive UI | Mobile/tablet fixes across CRM |
| 3 | Phase 2 — Analytics | Revenue + performance dashboards |
| 4 | Phase 4 — Bulk Marketing | WhatsApp + email campaigns |
| 5 | Phase 8 — Policy Automation | Auto-send + renewal reminders |
| 6 | Phase 6 — HR Automation | Incentives + salary processing |
| 7 | Phase 3 — AI Automation | Follow-ups + qualification |
| 8 | Phase 7 — Excel Upload + AI | Smart data processing |
| 9 | Phase 9 — Dealer System | Auto-inquiry + car finder |
| 10 | Phase 10 — Car Database | Complete all brand data |

---

## Technical Notes
- **Auto-dialer / Voice AI** requires a telephony provider (Exotel, Knowlarity, or Twilio Voice) — will need API keys.
- **RCS** requires Twilio RCS credentials and approved sender.
- **Meta Lead Ads** webhook requires Facebook App configuration with lead access permissions.
- All automation uses existing Edge Function + pg_cron architecture.
- No new frameworks — React 18 + Supabase + existing stack throughout.

Approve this plan and I will start with **Phase 1, Step 1** — auditing and fixing the universal lead capture pipeline.

