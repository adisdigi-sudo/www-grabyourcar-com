# 🤖 GrabYourCar AI Brain v2 — Complete Rebuild Plan

## Vision
A unified AI intelligence layer that powers the website chatbot, WhatsApp AI agent, CRM automation, and SEO optimization — all connected through a single "AI Brain" backbone with RAG knowledge, tool-calling, intent routing, and automated lead capture.

---

## Current State Audit

### ✅ Already Built & Deployed
| System | Edge Function | Frontend | Status |
|--------|--------------|----------|--------|
| AI Brain | `ai-brain/` | — | Working - RAG, intent detection, lead extraction |
| WhatsApp Webhook | `whatsapp-webhook/` | — | Working - Meta webhook, AI replies |
| WhatsApp Send | `whatsapp-send/` | — | Working - Meta Cloud API |
| WhatsApp Broadcasting | `broadcast-send/`, `wa-campaign-launcher/`, `wa-queue-processor/` | WhatsAppMarketingPortal | Working |
| Website Chatbot | `car-advisor/` | CarAdvisorChat | Working - Streaming |
| CRM AI Assistant | `crm-ai-assistant/` | CRMAssistant.tsx | Working - NL queries |
| SEO Agent | `seo-agent/` | SEOBuilder.tsx | Working - Auto meta tags |
| WhatsApp Portal | — | WhatsAppMarketingPortal | Working - 8 tabs |
| AI Agent Config | — | WAAgentConfig.tsx | Working |
| Live Conversations | — | WALiveConversations.tsx | Working |
| AI Performance | — | WAAIPerformance.tsx | Working |

### ❌ User Wants Full Rebuild
All systems to be rebuilt with enhanced capabilities.

---

## Phase 1: AI Brain v2 — Core Intelligence Engine
**Priority: 🔴 Highest | Est: 3-4 messages**

### Rebuild `ai-brain/` with:
1. **Streaming support** for website chatbot (SSE)
2. **Conversation memory** — multi-turn (last 20 messages from DB)
3. **Tool calling** — let AI:
   - Query car database (search by brand, model, price range)
   - Calculate EMI with custom params
   - Find nearest dealers by city
   - Check on-road price for any car+city
   - Look up insurance quotes
4. **Auto lead-capture** — when AI detects name+phone+interest → auto insert into `leads` table with proper vertical routing
5. **Cross-vertical routing** — detect service need → route to correct CRM vertical via `lead_routing_rules`
6. **Enhanced RAG** — auto-index car DB, offers, blog posts, FAQs into knowledge
7. **Confidence scoring** — when confidence <60%, flag for human review
8. **Model chain**: `gemini-3-flash-preview` → `gemini-2.5-flash` → `gpt-5-mini`

---

## Phase 2: Website AI Chatbot v2
**Priority: 🔴 High | Est: 2-3 messages**

### Rebuild `CarAdvisorChat.tsx`:
1. **Streaming SSE** responses via AI Brain v2
2. **Context-aware** — knows current car page, URL, user journey
3. **Quick action buttons**: "Get Price Quote", "Book Test Drive", "Calculate EMI", "Compare Cars"
4. **Inline lead capture** — form appears in chat when AI detects purchase intent
5. **Chat history** — localStorage + DB for returning visitors
6. **Markdown rendering** with ReactMarkdown
7. **Mobile-optimized** — bottom drawer on mobile, side panel on desktop
8. **Smart suggestions** — AI suggests relevant questions based on page context

---

## Phase 3: WhatsApp AI Agent v2
**Priority: 🔴 High | Est: 3-4 messages**

### Rebuild `whatsapp-webhook/`:
1. **Full conversation memory** — multi-turn stored in `whatsapp_conversations`
2. **Media handling** — process images (car photos), documents, voice notes
3. **Interactive messages** — buttons, lists, product catalogs via Meta API
4. **Business hours** — auto-reply outside hours with next available time
5. **Language detection** — Hindi/English auto-switch
6. **Escalation triggers** — auto-flag to human when AI confidence is low
7. **Greeting flow** — automated welcome sequence for new customers
8. **Follow-up automation** — schedule follow-up messages for hot leads

### Rebuild WhatsApp Marketing Portal:
1. **Broadcasting v2** — audience segmentation (by city, car interest, stage)
2. **AI Agent Config v2** — personality editor, knowledge management, prohibited topics
3. **Live Inbox v2** — real-time conversation view with human takeover toggle
4. **Analytics v2** — response times, CSAT scores, conversion funnel
5. **Template Manager v2** — create/edit Meta-approved templates with preview
6. **Campaign Scheduler** — schedule broadcasts with optimal timing
7. **A/B Testing** — test different templates for conversion

---

## Phase 4: CRM AI Brain v2
**Priority: 🟡 Medium | Est: 2-3 messages**

### Rebuild `crm-ai-assistant/`:
1. **Natural language DB queries** — "Show hot leads from Mumbai this week"
2. **Auto follow-up generation** — draft WhatsApp/Email for overdue leads
3. **Lead scoring AI** — suggest priority based on interaction history
4. **Deal forecasting** — pipeline value predictions
5. **Cross-sell recommendations** — car buyer → insurance → accessories
6. **Daily AI digest** — auto-generated summary of key metrics + action items
7. **Draft communications** — AI writes personalized messages for any lead

---

## Phase 5: SEO AI Agent v2
**Priority: 🟡 Medium | Est: 1-2 messages**

### Rebuild `seo-agent/`:
1. **Auto-optimize new car pages** when added to database
2. **City-specific meta descriptions** using car specs + city pricing data
3. **Blog SEO** — auto-optimize titles, headings, internal linking
4. **Weekly SEO health report** — AI-generated
5. **Dynamic sitemap** — regenerate on content changes
6. **Schema markup validation** — check JSON-LD errors

---

## Execution Order

| Step | Module | Description |
|------|--------|-------------|
| 1 | AI Brain v2 Edge Function | Core intelligence with tools, streaming, memory |
| 2 | Website Chatbot v2 | Streaming widget with context + lead capture |
| 3 | WhatsApp Webhook v2 | Enhanced agent with memory + media + escalation |
| 4 | WhatsApp Portal v2 | Broadcasting, inbox, analytics, templates |
| 5 | CRM AI v2 | Smart assistant with NL queries + automation |
| 6 | SEO Agent v2 | Auto-optimization + health reports |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              AI Brain v2 (Edge Function)         │
│  ┌─────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │   RAG   │ │  Intent  │ │   Tool Calling   │ │
│  │Knowledge│ │Detection │ │ (Car DB, EMI,    │ │
│  │  Base   │ │& Routing │ │  Dealer, Price,  │ │
│  │  v2     │ │          │ │  Insurance)      │ │
│  └─────────┘ └──────────┘ └──────────────────┘ │
│  ┌─────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Lead   │ │Sentiment │ │   Streaming      │ │
│  │Auto-    │ │& Confid. │ │   SSE Support    │ │
│  │Capture  │ │Scoring   │ │                  │ │
│  └─────────┘ └──────────┘ └──────────────────┘ │
│  ┌─────────────────────────────────────────────┐│
│  │         Conversation Memory (DB)            ││
│  │      Multi-turn • Per-channel • History     ││
│  └─────────────────────────────────────────────┘│
└──────────┬──────────┬──────────┬────────────────┘
           │          │          │
    ┌──────┴──┐ ┌─────┴────┐ ┌──┴──────────┐
    │Website  │ │WhatsApp  │ │CRM Admin    │
    │Chatbot  │ │AI Agent  │ │Assistant    │
    │(Stream) │ │(Webhook) │ │(Dashboard)  │
    └─────────┘ └──────────┘ └─────────────┘
```

## Status: ⏳ Awaiting user confirmation to start Phase 1
