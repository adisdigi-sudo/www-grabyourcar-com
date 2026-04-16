

# Plan: WhatsApp Automation OS — Production-Ready, Self-Managing System

## What You Get After This

A fully autonomous WhatsApp system that runs 24/7 without daily management:

```text
┌─────────────────────────────────────────────────────┐
│              WhatsApp Automation OS                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. AI BOT (24/7)                                   │
│     ├─ Answers every query (cars, EMI, insurance)   │
│     ├─ Sends policy PDFs on car number              │
│     ├─ Qualifies leads → sets stage automatically   │
│     └─ Never gets stuck (fallback chain)            │
│                                                     │
│  2. AUTO-TRIGGERS (Stage Changes)                   │
│     ├─ New Lead → Welcome message                   │
│     ├─ Followup → Reminder                          │
│     ├─ Quote Shared → PDF + summary                 │
│     ├─ Won → Congratulations + invoice              │
│     ├─ Lost → Re-engagement after 7 days            │
│     └─ Every vertical covered                       │
│                                                     │
│  3. DOCUMENT SHARING                                │
│     ├─ Invoice PDFs via WhatsApp                    │
│     ├─ Quote PDFs via WhatsApp                      │
│     ├─ Policy documents via WhatsApp                │
│     └─ Any CRM user can send from any workspace     │
│                                                     │
│  4. 100% API MODE                                   │
│     ├─ 24hr window bypassed via templates            │
│     ├─ No manual sends ever                         │
│     └─ All messages go through whatsapp-send        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Technical Changes

### 1. Upgrade AI Brain — Lead Qualification + Stage Setting

**File: `supabase/functions/ai-brain/index.ts`**

- Add new tool: `qualify_and_set_stage` — AI analyzes conversation and sets lead stage
  - Stages: `new_lead`, `interested`, `followup`, `quoted`, `won`, `lost`
  - AI decides based on conversation context (buying intent, objections, confirmations)
- Add new tool: `send_document_to_customer` — sends any stored PDF/document
- Improve system prompt:
  - When customer asks for policy → ask car number → `lookup_my_policy` → auto-send PDF
  - When conversation shows buying intent → auto-set stage to `interested`
  - When customer says "not interested" / "no" → set to `lost`
  - When customer confirms booking → set to `won`
- Add fallback chain: chatbot_rules → ai-brain → hardcoded friendly response (never blank)

### 2. Auto-Trigger System for Stage Changes

**File: `supabase/functions/wa-automation-trigger/index.ts`** (enhance)

Add comprehensive event-to-template mapping:

| Event | Template | Content |
|-------|----------|---------|
| `lead_new` | `welcome_message` | Welcome + what we offer |
| `lead_interested` | `interest_confirmed` | Thanks + next steps |
| `lead_followup` | `followup_reminder` | Gentle reminder |
| `lead_quoted` | `quote_shared` | Quote summary + PDF link |
| `lead_won` | `congratulations` | Congrats + invoice PDF |
| `lead_lost` | `re_engagement` | We miss you (after 7d delay) |
| `insurance_policy_issued` | `policy_issued` | Policy PDF attached |
| `payment_received` | `payment_receipt` | Receipt/invoice PDF |

**Database migration:** Insert default `wa_event_triggers` rows for all these events with appropriate templates.

### 3. Document Sharing Infrastructure

**File: `supabase/functions/whatsapp-send/index.ts`** (minor enhance)

- Ensure document sending works reliably for PDFs from storage buckets
- Add helper to resolve document URLs from `quote-pdfs`, `policy-documents`, `loan-documents` buckets

**File: `src/lib/whatsappDocumentShare.ts`** (new)

- Utility function `shareDocumentViaWhatsApp(phone, documentType, documentId)` 
- Works for: invoices, quotes, policies, loan documents
- Fetches PDF URL from storage → sends via `whatsapp-send`

**Integration points in CRM workspaces:**
- Add "Send via WhatsApp" button in Invoice detail views
- Add "Share Quote on WhatsApp" in Sales/Loan quote sections
- Add "Send Policy" button in Insurance workspace

### 4. Kill 24hr Window — 100% API + Template Fallback

**File: `supabase/functions/whatsapp-send/index.ts`** (already has this)

The existing `whatsapp-send` already has window-closed detection and template fallback. Changes:
- Ensure ALL outbound messages go through `whatsapp-send` (audit for any direct Meta API calls)
- Remove `manual` mode option from `admin_settings` — force API-only
- Improve implicit fallback templates to cover all verticals (not just insurance)

**File: `src/lib/sendWhatsApp.ts`**

- Remove manual mode check — always API
- `clearSendModeCache` becomes no-op

### 5. Bot Lead Qualification (AI sets stages)

**New DB trigger or Edge Function enhancement:**

When `ai-brain` calls `qualify_and_set_stage`, it:
1. Updates the lead's `pipeline_stage` in the relevant table
2. Fires `triggerWhatsApp({ event: "lead_{stage}", phone, ... })` 
3. Which triggers the auto-message from Step 2

This creates a closed loop:
```text
Customer chats → AI qualifies → Stage set → Auto-message sent → Customer responds → AI qualifies again
```

### 6. Database Migration

```sql
-- Insert default event triggers for all stage changes
INSERT INTO wa_event_triggers (event_name, template_id, is_active, ...)
VALUES 
  ('lead_new', ..., true),
  ('lead_interested', ..., true),
  ('lead_followup', ..., true),
  ('lead_quoted', ..., true),
  ('lead_won', ..., true),
  ('lead_lost', ..., true),
  ('payment_received', ..., true),
  ('insurance_policy_issued', ..., true);
```

---

## Files to Create/Edit

| File | Action |
|------|--------|
| `supabase/functions/ai-brain/index.ts` | Add `qualify_and_set_stage` + `send_document` tools |
| `supabase/functions/wa-automation-trigger/index.ts` | Add stage-change event handling |
| `supabase/functions/whatsapp-send/index.ts` | Improve fallback templates for all verticals |
| `src/lib/sendWhatsApp.ts` | Remove manual mode, force API-only |
| `src/lib/whatsappDocumentShare.ts` | New — document sharing utility |
| `src/lib/whatsappTrigger.ts` | No changes needed (already works) |
| Database migration | Insert default event triggers |

---

## What You Manage (Almost Nothing)

- **Templates**: One-time setup in WhatsApp Hub — approve on Meta, done forever
- **Knowledge Base**: Update `ai_knowledge_base` table when business info changes
- **Chatbot Rules**: Optional fine-tuning in WhatsApp Hub → Chatbot Builder

Everything else runs autonomously — AI qualifies, triggers fire, documents send, templates fallback when window closes.

