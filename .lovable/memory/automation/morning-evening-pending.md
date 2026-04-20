---
name: Morning Briefing & Evening Report — Pending WhatsApp Delivery Fix
description: Auto-pilot morning/evening reports fail silently because they send plain text outside the 24hr Meta window — needs approved template selector inside WhatsApp Flow Settings
type: feature
---

## Status: PENDING — to be fixed inside WhatsApp Flow Settings module

### Problem
`supabase/functions/auto-pilot-engine/index.ts` (`runMorningBriefing`, `runEveningReport`, `runStaleLeadsAlert`, `runWeeklyPL`, `runAutoQuote`) all call `sendWhatsApp()` which posts `type: "text"` to Meta Cloud API. Outside the 24hr customer-initiated window Meta returns error `131049` / `1310x` (visible in `whatsapp-webhook` logs as `status: "failed"`). The function returns success internally but no WhatsApp is delivered. All other automations work fine.

### Decision (user, 2026-04-20)
Do NOT patch auto-pilot-engine in isolation. Build a unified **template selector + approval status UI inside the WhatsApp Flow Settings module** (admin → WhatsApp Hub → Flows / Templates) where each Auto-Pilot agent (morning_briefing, evening_report, stale_leads_alert, weekly_pl, auto_quote) can be mapped to an **approved Meta template** with variable bindings. Until then, morning/evening messages will continue to fail silently — acceptable.

### When implementing
1. Add `auto_pilot_template_map` table (agent_key → wa_template_catalog.id, variables jsonb).
2. UI inside `WAHubFlows.tsx` (or new tab): list each auto-pilot agent, show only Meta-approved templates from `wa_templates` (status='approved'), let admin bind one + map AI-generated content into a single body variable like `{{1}}`.
3. Refactor `auto-pilot-engine` helpers to send via `whatsapp-send` edge function with `messageType: "template"` instead of raw text.
4. Keep plain-text path only as a last-resort fallback for sessions known to be open (check `wa_conversations.last_inbound_at` within 24h).
