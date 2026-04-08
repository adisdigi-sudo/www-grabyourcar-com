

# Complete Mailchimp-Like Email Marketing Dashboard

## Current State
- **Database ready**: Tables exist for `email_campaigns`, `email_subscribers`, `email_templates`, `email_sequences`, `email_sequence_steps`, `email_logs`
- **Edge functions exist**: `send-bulk-email`, `ai-email-writer`
- **UI exists**: `EmailMarketingManagement.tsx` (825 lines) with campaigns, subscribers, templates, AI generation, sender presets
- **Missing**: Verified email domain (no domain configured yet), drag-and-drop builder, drip sequence UI, segmentation UI, real-time analytics dashboard

## Step 0 — Email Domain Setup (Required First)
You need to set up a sender domain so emails actually deliver from `@grabyourcar.com`. Click the button below to configure your domain — this adds DNS records that verify you own the domain.

## Step 1 — Drag-and-Drop Email Builder
**New component**: `EmailBlockBuilder.tsx`
- Visual block-based editor with draggable content blocks (Header, Hero Image, Text, CTA Button, Car Cards, Offers, Footer, Divider, Social Links)
- Each block has inline editing — click to edit text, change colors, upload images
- Live HTML preview panel (side-by-side with builder)
- Save as template functionality
- Uses existing `email_templates` table (`html_content` column)
- Blocks stored as JSON in a new `blocks_json` column on `email_templates`

**DB migration**: Add `blocks_json JSONB` column to `email_templates`

## Step 2 — Subscriber Segmentation
**New component**: `SubscriberSegmentation.tsx`
- Filter subscribers by: tags, company, source, subscription date, engagement (opened/clicked)
- Create named segments with saved filter rules (stored in `email_campaigns.segment_filter` JSONB)
- Segment preview showing matching subscriber count
- Quick segments: "All", "Corporate", "New (last 30 days)", "Engaged", "Inactive"
- Tag management UI (add/remove tags on subscribers)

Uses existing `email_subscribers` table with `tags`, `company`, `source` columns.

## Step 3 — Drip Sequence Builder
**New component**: `DripSequenceBuilder.tsx`
- Visual timeline/flow showing sequence steps
- Create sequences with triggers: "New subscriber", "Tag added", "Manual"
- Each step: select template, set delay (hours/days), add conditions
- Start/pause/stop sequences
- Track per-step delivery stats

Uses existing `email_sequences` and `email_sequence_steps` tables. New edge function `process-drip-sequences` triggered by pg_cron to check and send pending drip emails.

**DB migration**: Add `email_drip_enrollments` table to track which subscribers are in which sequences and their current step.

## Step 4 — Real-Time Campaign Analytics Dashboard
**Enhanced component**: Rebuild `CampaignAnalytics.tsx`
- Real-time stats from `email_logs`: sent, delivered, opened, clicked, bounced, failed
- Per-campaign drill-down with recipient-level status
- Time-series charts (sends over time, open rate trends)
- Top-performing campaigns leaderboard
- Subscriber growth chart
- Enable realtime on `email_logs` for live updates

## Step 5 — Unified Email Marketing Hub
**Refactor** `EmailMarketingManagement.tsx` into a tabbed dashboard:
- **Campaigns** — create, send, track bulk campaigns
- **Templates** — drag-and-drop builder + AI writer
- **Subscribers** — list management + segmentation
- **Sequences** — drip automation builder
- **Analytics** — real-time performance dashboard

## Files to Create
1. `src/components/admin/marketing/email/EmailBlockBuilder.tsx`
2. `src/components/admin/marketing/email/SubscriberSegmentation.tsx`
3. `src/components/admin/marketing/email/DripSequenceBuilder.tsx`
4. `src/components/admin/marketing/email/EmailAnalyticsDashboard.tsx`
5. `src/components/admin/marketing/email/EmailMarketingHub.tsx` (orchestrator)
6. `supabase/functions/process-drip-sequences/index.ts`

## Files to Edit
1. `src/components/admin/EmailMarketingManagement.tsx` — replace with hub
2. `src/components/admin/marketing/CampaignAnalytics.tsx` — enhance with email-specific metrics

## Database Changes
1. Add `blocks_json JSONB` to `email_templates`
2. Create `email_drip_enrollments` table (subscriber_id, sequence_id, current_step, status, enrolled_at, next_send_at)
3. Enable realtime on `email_logs`

