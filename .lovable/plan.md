
# Custom Email Suite for GrabYourCar

## Complete Brevo Professional Parity — Implementation Status

### ✅ Phase 1 — Core Features (DONE)
1. **Campaigns** — create, send bulk via Resend with batch/timezone controls
2. **Template Builder** — drag-and-drop block builder
3. **AI Email Writer** — edge function generates HTML + subjects
4. **Subscriber Segmentation** — tag-based filtering, list management
5. **Contact Scoring** — engagement tiers (Hot→Cold) with recalculation
6. **Batch Sending** — configurable batch size, delay, timezone, optimal time
7. **Email Analytics Dashboard** — open/click/bounce from email_logs + Resend webhooks

### ✅ Phase 2 — Advanced Automation (DONE)
8. **Drip Sequences** — fixed backend (drip_sequences/steps/enrollments tables), actual Resend sends
9. **Cart Abandonment** — automated cart-recovery-engine with pg_cron-ready architecture
10. **Pop-up Forms** — builder UI + popup-form-submit edge function for lead capture
11. **Email Polls** — creation UI + email-poll-vote edge function for vote tracking
12. **Dynamic Content** — rule-based conditional blocks per subscriber attributes
13. **Unsubscribe System** — email-unsubscribe edge function + List-Unsubscribe headers
14. **Resend Webhooks** — resend-webhook edge function tracking opens/clicks/bounces/complaints

### 🔜 Phase 3 — Future Enhancements
15. SMS Marketing — Twilio integration
16. Advanced Visual Workflow Editor — if/else branches, A/B splits
17. Optimal Send Time ML — analyze open patterns per subscriber
18. Dedicated IP Management — Resend dedicated IP config
19. A/B Subject Line Testing
20. CSV Import/Export with duplicate detection
21. GDPR Compliance (data export, deletion)

## Edge Functions
| Function | Purpose | JWT |
|---|---|---|
| resend-webhook | Track opens/clicks/bounces | false |
| cart-recovery-engine | Auto-send abandoned cart emails | false |
| email-unsubscribe | One-click unsubscribe page | false |
| email-poll-vote | Record poll votes from emails | false |
| popup-form-submit | Handle popup form submissions | false |
| process-drip-sequences | Execute drip sequence steps | false |
| send-bulk-email | Send campaign emails with batch/dynamic content | true |
| send-automated-email | Send template-based transactional emails | true |
| ai-email-writer | AI-generated email content | true |

## Database Tables (Email Suite)
| Table | Purpose |
|---|---|
| email_campaigns | Campaign definitions with batch/timezone config |
| email_templates | Reusable email templates |
| email_subscribers | Subscriber profiles with scoring/timezone |
| email_lists | Mailing lists |
| email_logs | Send history with open/click/bounce timestamps |
| email_events | Granular Resend webhook events |
| drip_sequences | Automated sequence definitions |
| drip_sequence_steps | Individual steps with delays |
| drip_enrollments | Subscriber enrollment tracking |
| popup_forms | Lead capture form configurations |
| cart_events | Shopping cart abandonment tracking |
| email_polls | Poll definitions |
| email_poll_votes | Individual poll votes |
| dynamic_content_rules | Conditional content blocks |
| email_unsubscribe_tokens | Secure unsubscribe tokens |
