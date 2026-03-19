

# AI Brain + WhatsApp Agent + SEO Agent — Implementation Plan

## Current State (What Already Exists)

### Already Working
- **WhatsApp webhook** (`whatsapp-webhook`) — receives Meta messages, generates AI responses via Lovable AI, logs conversations
- **WhatsApp send** (`whatsapp-send`) — sends text/template/image/document via Meta Cloud API
- **14 WhatsApp integration points** — broadcasting, automation triggers, queue processor, campaign launcher, journey engine, OTP, etc.
- **Website chatbot** (`CarAdvisorChat`) — streaming AI assistant on frontend
- **SEO Builder** — admin panel for per-page meta tags with AI generation
- **AI Generate** (`ai-generate`) — centralized edge function with model fallback chain
- **Meta API secrets configured** — `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` all set

### What's NOT Working / Missing
1. **WhatsApp AI Bot is basic** — only a short system prompt, no product catalog knowledge, no lead capture automation, no intent routing
2. **No unified AI brain** — website bot and WhatsApp bot use different prompts/logic
3. **No SEO agent** — SEO Builder exists but requires manual page-by-page work
4. **No CRM AI assistant** — backend staff have no AI helper for operations
5. **WhatsApp Portal** missing unified control panel for bot + broadcasting + analytics together

---

## What Will Be Built

### Phase A: Unified AI Brain Edge Function

**New: `supabase/functions/ai-brain/index.ts`**

A single intelligent edge function that powers ALL AI interactions:
- **Shared knowledge base**: Company info, 500+ deliveries, 50+ corporate clients, all car brands/models, pricing, services, insurance (70% discount), loans (8.5%+), HSRP, accessories, self-drive (Delhi NCR only), 7-day return policy for accessories
- **Intent detection**: Classifies incoming messages into `car_inquiry`, `insurance`, `loan`, `test_drive`, `complaint`, `general`
- **Auto lead capture**: Extracts name + phone + car interest from conversations, inserts into `leads` table
- **Context-aware**: Accepts `channel` param (`whatsapp`, `website`, `crm`) to adjust response style
- **Tool calling**: Uses structured output to return `{ response, intent, lead_data, suggested_actions }` so callers can act on it

### Phase B: Upgrade WhatsApp AI Agent

**Modify: `supabase/functions/whatsapp-webhook/index.ts`**

- Replace basic `generateAIResponse` with call to `ai-brain` function
- Auto-create leads when high intent detected (currently only detects, doesn't save)
- Route insurance/loan inquiries to respective CRM verticals via `lead_routing_rules`
- Send follow-up template messages for hot leads (via `wa-automation-trigger`)
- Track conversation quality metrics in `whatsapp_conversations`

### Phase C: Upgrade Website Chatbot

**Modify: `src/components/CarAdvisorChat.tsx`**

- Switch from `car-advisor` to `ai-brain` edge function
- Add quick-action buttons (Check Price, Book Test Drive, Calculate EMI, Get Insurance Quote)
- Show lead capture form inline when AI detects purchase intent
- Pass page context (current car page, URL) to AI for contextual responses

### Phase D: CRM AI Assistant

**New: `src/components/admin/CRMAssistant.tsx`**

A floating AI chat panel in the CRM backend (Admin/Manager only) that can:
- Answer questions about leads, deals, KPIs ("How many leads this week?", "Top performer this month?")
- Draft WhatsApp messages and emails
- Suggest follow-up actions for stale leads
- Generate reports on demand

**New: `supabase/functions/crm-ai-assistant/index.ts`**
- Accepts natural language queries from CRM staff
- Reads from `leads`, `deals`, `insurance_clients`, `kpi_targets` tables via service role
- Returns structured responses with data + suggested actions

### Phase E: SEO AI Agent

**New: `supabase/functions/seo-agent/index.ts`**

Automated SEO optimization that:
- Crawls all page routes and generates/updates meta tags, titles, descriptions
- Generates JSON-LD structured data for car pages, dealer pages, service pages
- Suggests internal linking improvements
- Can be triggered manually or on a schedule

**Modify: `src/components/admin/SEOBuilder.tsx`**
- Add "Auto-Optimize All Pages" button that triggers the SEO agent
- Show AI-generated suggestions with approve/reject workflow
- Add sitemap health check

### Phase F: WhatsApp Portal Unification

**Modify: `src/components/admin/marketing/WhatsAppMarketingPortal.tsx`**

Add new tabs:
- **AI Agent Config** — edit bot personality, knowledge base, response rules, enable/disable auto-replies
- **Live Conversations** — real-time view of AI bot conversations with takeover option (human agent takes over from bot)
- **Performance** — AI response quality metrics, lead capture rate, intent distribution

---

## Technical Details

**Files to create:**
- `supabase/functions/ai-brain/index.ts` — unified AI brain with full company knowledge
- `supabase/functions/crm-ai-assistant/index.ts` — CRM backend AI helper with DB query access
- `supabase/functions/seo-agent/index.ts` — automated SEO optimization
- `src/components/admin/CRMAssistant.tsx` — floating CRM AI chat panel
- `src/components/admin/marketing/wa/WAAgentConfig.tsx` — AI bot configuration panel

**Files to modify:**
- `supabase/functions/whatsapp-webhook/index.ts` — route through ai-brain, auto-capture leads
- `src/components/CarAdvisorChat.tsx` — switch to ai-brain, add quick actions
- `src/components/admin/SEOBuilder.tsx` — add auto-optimize button
- `src/components/admin/marketing/WhatsAppMarketingPortal.tsx` — add AI Agent + Live tabs
- `src/pages/AdminLayout.tsx` — add CRM assistant overlay
- `supabase/config.toml` — register new edge functions with `verify_jwt = false`

**Database changes:**
- New table `ai_knowledge_base` — store editable knowledge snippets (company info, FAQs, product details) that the AI brain reads at runtime
- New table `ai_conversation_analytics` — track intent distribution, lead capture rate, response quality per channel
- Add columns to `whatsapp_conversations`: `ai_enabled` (boolean), `human_takeover` (boolean), `intent_detected` (text)

**No new API keys needed** — uses existing `LOVABLE_API_KEY` for all AI calls.

---

## Build Order

1. Database migration (ai_knowledge_base, ai_conversation_analytics, whatsapp_conversations columns)
2. `ai-brain` edge function (core AI engine)
3. Upgrade `whatsapp-webhook` to use ai-brain
4. Upgrade `CarAdvisorChat` to use ai-brain
5. `crm-ai-assistant` edge function + CRM panel
6. `seo-agent` edge function + SEO Builder upgrade
7. WhatsApp Portal new tabs (Agent Config, Live View)

