
# Complete Email Marketing Suite — Brevo Professional Parity

## Current State Audit

### ✅ Already Built (UI + Backend)
1. **Campaigns** — create, send bulk via Resend (`send-bulk-email` edge function)
2. **Template Builder** — drag-and-drop block builder (`EmailBlockBuilder.tsx`)
3. **AI Email Writer** — edge function generates HTML + subjects
4. **Subscriber Segmentation** — tag-based filtering, list management
5. **Email Analytics Dashboard** — open/click/bounce from `email_logs`
6. **Contact Scoring Panel** — UI with engagement tiers (Hot→Cold)
7. **Batch Sending Config** — UI component for batch size/timezone settings

### ⚠️ Partially Built (UI exists, backend incomplete)
8. **Drip Sequences** — UI builder exists, `process-drip-sequences` edge function queries wrong table names (`email_sequences` vs `drip_sequences`). No DB tables for the UI's expected schema.
9. **Cart Abandonment** — UI exists, table exists, but NO automated recovery edge function (manual "send recovery" only calls a toast, no actual email trigger)
10. **Pop-up Forms** — UI builder exists, table exists, but NO embeddable frontend widget or public-facing form endpoint
11. **Email Polls** — UI exists, tables exist, but NO embeddable poll HTML generator or vote-tracking webhook

### ❌ Not Built Yet
12. **Dynamic Content** — personalized email blocks based on subscriber attributes (no table, no UI, no logic)
13. **SMS Marketing** — no tables, no edge function, no UI
14. **Resend Webhooks** — no `resend-webhook` edge function to track opens/clicks/bounces in real-time
15. **Advanced Workflows** — no visual workflow editor with conditions/branches (current drip is linear-only)
16. **Recipient Optimal Open Time** — column exists on subscribers but no ML/calculation logic
17. **Dedicated IP Management** — config UI needed (Resend feature)
18. **Unsubscribe Management** — no public unsubscribe page or one-click unsubscribe header

---

## Implementation Plan (Priority Order)

### Phase 1 — Fix Broken Backends (Critical)
**1.1 Fix Drip Sequence Backend**
- Create migration: `drip_sequences`, `drip_sequence_steps`, `drip_enrollments` tables matching the UI
- Update `process-drip-sequences` to query correct tables
- Add pg_cron job to run drip processor every 15 minutes

**1.2 Resend Webhook Handler**
- Create `resend-webhook` edge function to receive open/click/bounce/complaint events
- Create `email_events` table for granular tracking
- Update `email_logs` with `opened_at`, `clicked_at`, `bounced_at` on webhook events
- Wire analytics dashboard to use real webhook data

**1.3 Cart Abandonment Automation**
- Create `cart-recovery-engine` edge function that:
  - Scans `cart_events` for abandoned carts (>1 hour, email known, no recovery sent)
  - Sends recovery email via Resend with cart contents
  - Updates `recovery_email_sent` flag
- Add pg_cron job to run every 30 minutes

### Phase 2 — Missing Features
**2.1 Dynamic Content Engine**
- Create `dynamic_content_rules` table (rule_name, conditions JSON, content_block HTML)
- Build UI to create conditional content blocks (e.g., "Show X if subscriber tag = VIP")
- Integrate into template builder and `send-bulk-email` to swap blocks per recipient

**2.2 Public Unsubscribe Page**
- Create `/unsubscribe` public route
- Create `email-unsubscribe` edge function to process unsubscribe tokens
- Add `List-Unsubscribe` header to all outbound emails
- Update `email_subscribers.subscribed` on unsubscribe

**2.3 Embeddable Pop-up Widget**
- Create `popup-form-embed` edge function that returns JS snippet
- Generate embeddable `<script>` tag for each popup form
- Handle form submission → insert into `email_subscribers`
- Add copy-to-clipboard embed code in PopupFormBuilder UI

**2.4 Email Poll Vote Webhook**
- Create `email-poll-vote` edge function to track clicks from poll emails
- Generate trackable URLs per poll option per recipient
- Update `email_poll_votes` on click

### Phase 3 — Advanced Features
**3.1 SMS Marketing Module**
- Create `sms_campaigns`, `sms_logs` tables
- Build SMS campaign UI tab in EmailMarketingHub
- Integrate with existing WhatsApp infrastructure or add Twilio SMS

**3.2 Advanced Workflow Editor**
- Visual workflow builder with if/else branches, wait conditions, A/B splits
- Replaces linear drip builder with full automation canvas
- Triggers: form submit, tag added, cart abandoned, email opened, date-based

**3.3 Optimal Send Time Calculator**
- Edge function to analyze `email_logs` open timestamps per subscriber
- Calculate best hour/day per subscriber
- Store in `email_subscribers.optimal_send_hour`
- Use in batch sending to delay sends per recipient

**3.4 Dedicated IP Config**
- UI panel showing Resend dedicated IP status
- Link to Resend dashboard for IP management
- IP warmup schedule tracker

### Phase 4 — Polish & Production
- A/B subject line testing in campaigns
- Email preview across devices (desktop/mobile render)
- Comprehensive campaign reporting with CSV export
- Subscriber import via CSV with duplicate detection
- GDPR compliance (data export, right to deletion)

---

## Files to Create/Modify

### New Edge Functions
1. `supabase/functions/resend-webhook/index.ts`
2. `supabase/functions/cart-recovery-engine/index.ts`
3. `supabase/functions/email-unsubscribe/index.ts`
4. `supabase/functions/popup-form-embed/index.ts`
5. `supabase/functions/email-poll-vote/index.ts`
6. `supabase/functions/optimal-send-calculator/index.ts`

### Modified Edge Functions
7. `supabase/functions/process-drip-sequences/index.ts` (fix table names)
8. `supabase/functions/send-bulk-email/index.ts` (add dynamic content, unsubscribe header, batch/timezone logic)

### New UI Components
9. `src/components/admin/marketing/email/DynamicContentBuilder.tsx`
10. `src/components/admin/marketing/email/SMSCampaignManager.tsx`
11. `src/components/admin/marketing/email/WorkflowEditor.tsx`
12. `src/pages/Unsubscribe.tsx`

### Database Migrations
13. `drip_sequences`, `drip_sequence_steps`, `drip_enrollments`
14. `email_events` (webhook tracking)
15. `dynamic_content_rules`
16. `sms_campaigns`, `sms_logs`
17. Add columns to `email_logs`: `opened_at`, `clicked_at`, `bounced_at`
