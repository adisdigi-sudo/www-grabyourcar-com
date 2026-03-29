

# Unified Omni-Channel Messaging Hub — CTO Architecture Plan

## Vision
Build a **single centralized messaging backbone** where connecting one provider (WhatsApp API, Email via Resend, RCS) automatically enables it across every CRM vertical. Every workspace gets a consistent side-by-side **Campaign Builder + Chat/Reply** panel.

## Current State
- `sendWhatsApp.ts` is the client-side unified sender (API + manual fallback)
- `messaging-service` edge function exists as provider abstraction (currently Finbite-only)
- `whatsapp-send` handles direct Meta API sends
- WhatsApp chat exists in Marketing portal only (`WAConversationInbox`)
- Bulk send scattered across components with different implementations
- Email: `send-bulk-email` exists but not wired into verticals
- RCS: Nothing exists yet

## Architecture

```text
┌─────────────────────────────────────────────────────┐
│              FRONTEND (Every Vertical)              │
│  ┌──────────────┐  ┌──────────────┐                 │
│  │ OmniSendPanel│  │OmniChatPanel │  (Reusable)     │
│  │ - Bulk WA    │  │ - WA threads │                 │
│  │ - Bulk Email │  │ - Email view │                 │
│  │ - Bulk RCS   │  │ - RCS view   │                 │
│  │ - Campaign   │  │ - Reply box  │                 │
│  └──────┬───────┘  └──────┬───────┘                 │
│         │                 │                         │
│    useOmniSend()     useOmniChat()   (Shared hooks) │
└─────────┼─────────────────┼─────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────┐
│         EDGE FUNCTION: omni-channel-send            │
│  Single entry point for ALL channels                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │WhatsApp │ │ Email   │ │  RCS    │  Adapters      │
│  │(Meta)   │ │(Resend) │ │(Stub)  │                │
│  └─────────┘ └─────────┘ └─────────┘               │
│  - Provider config from `channel_providers` table   │
│  - Logs ALL sends to `omni_message_logs`            │
│  - Health check per channel                         │
└─────────────────────────────────────────────────────┘
```

## What Gets Built

### 1. Database: `channel_providers` table (new)
Stores which providers are active + their config:
```
id | channel (whatsapp|email|rcs) | provider_name | is_active | config_json | created_at
```
When WhatsApp API is connected, one row exists → all verticals see "WhatsApp API" as active. Same for Email/RCS later.

### 2. Edge Function: `omni-channel-send` (new)
Single backend entry point replacing scattered direct calls:
- Actions: `send_text`, `send_bulk`, `send_template`, `health_check`
- Channels: `whatsapp` (routes to existing Meta API), `email` (routes to Resend), `rcs` (stub, returns "not_configured")
- Reads `channel_providers` to know which providers are active
- Logs everything to `wa_message_logs` (existing, add `channel` column)

### 3. Client utility: `src/lib/omniSend.ts` (new)
Replaces direct `sendWhatsApp` calls with channel-aware sender:
```ts
omniSend({ channel: "whatsapp", phone, message, ... })
omniSendBulk({ channel: "whatsapp", recipients: [...] })
```
Internally calls `omni-channel-send` edge function. Falls back gracefully per channel.

### 4. Reusable UI: `OmniSendPanel` component (new)
Drop-in panel for ANY vertical workspace:
- Channel selector tabs (WhatsApp / Email / RCS) — disabled channels greyed out
- Bulk send mode: paste phones or select from current view's data
- Campaign builder: name, message template, schedule
- Progress tracker with sent/failed counts
- Props: `recipients: Array<{phone, email, name}>`, `context: string` (vertical name)

### 5. Reusable UI: `OmniChatPanel` component (new)
Drop-in side panel for conversation view:
- Shows threads from `whatsapp_conversations` + `omni_conversations`
- Reply box that sends via `omni-channel-send`
- Channel badge per conversation
- Props: `phone?: string`, `email?: string` (filters to specific contact)

### 6. Integration into every vertical workspace
Add `OmniSendPanel` and `OmniChatPanel` as side-by-side tabs in:
- **Insurance** (`InsuranceWorkspace.tsx`) — new "Messaging" nav item
- **Sales** (UnifiedMasterCRM sales view)
- **HSRP**, **Rentals**, **Accessories**, **Dealer Network**
- Each passes its filtered leads/clients as `recipients`

### 7. Provider Settings Page (new)
`src/components/admin/settings/ChannelProvidersSettings.tsx`
- Shows all 3 channels with status (Connected / Not Configured)
- WhatsApp: shows current Meta API status (reuses existing health check)
- Email: shows Resend status
- RCS: shows "Coming Soon — Add API key when ready"
- One place to manage all provider connections

## Migration from Current State
- `sendWhatsApp.ts` stays as-is (backward compat) but `omniSend` wraps it
- All existing bulk send buttons get a small upgrade: add Email/RCS tabs (disabled for now)
- No breaking changes — existing WhatsApp flows continue working

## Files to Create
1. `src/lib/omniSend.ts` — unified client sender
2. `src/components/admin/shared/OmniSendPanel.tsx` — bulk send panel
3. `src/components/admin/shared/OmniChatPanel.tsx` — chat/reply panel
4. `src/components/admin/settings/ChannelProvidersSettings.tsx` — provider config UI
5. `supabase/functions/omni-channel-send/index.ts` — unified backend

## Files to Edit
1. `src/components/admin/insurance/InsuranceWorkspace.tsx` — add Messaging tab
2. `src/components/admin/UnifiedMasterCRM.tsx` — add Messaging to each vertical
3. Migration: add `channel_providers` table + add `channel` column to `wa_message_logs`

## Reminder Notes (for later integration)
- **Email Bulk**: Configure Resend domain verification for `grabyourcar.com`, then flip `is_active` in `channel_providers`
- **WhatsApp API**: Already connected via Meta Cloud API — works immediately
- **RCS**: Choose provider (Google RBM / Gupshup / Sinch), add API key as secret, update adapter in `omni-channel-send`

