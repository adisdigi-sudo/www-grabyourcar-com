

## WhatsApp Campaign Command Center — Unified Side-by-Side Redesign

### What We're Building

A complete redesign of the WhatsApp Campaigns tab into a **single-page command center** with three integrated panels:

1. **Left Panel — Template Designer + Campaign Builder** (side-by-side)
2. **Center — Customer Chat View** with delivery statuses (sent/delivered/read/replied)
3. **Top — Overview Dashboard** with all key metrics

Plus: media attachment support (PDF, images, video up to 30s) and a "Shoot Marketing Now" instant-send button.

### Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  OVERVIEW BAR: Campaigns | Sent | Delivered | Read | Reply  │
├──────────────────────┬──────────────────────────────────────┤
│  CAMPAIGN BUILDER    │  CUSTOMER CHAT + STATUS VIEW         │
│                      │                                      │
│  ┌────────────────┐  │  ┌──────────┐ ┌───────────────────┐  │
│  │ Template Design │  │  │ Contact  │ │ Chat Thread       │  │
│  │ - Pick template │  │  │ List     │ │ - Messages        │  │
│  │ - Edit message  │  │  │ - Search │ │ - Status ticks    │  │
│  │ - Attach media  │  │  │ - Filter │ │ - Delivered/Read  │  │
│  │   PDF/IMG/Video │  │  │          │ │ - Reply input     │  │
│  ├────────────────┤  │  └──────────┘ └───────────────────┘  │
│  │ Campaign Setup  │  │                                      │
│  │ - Name/Segment  │  │  ┌──────────────────────────────┐   │
│  │ - Schedule      │  │  │ Message Delivery Overview     │   │
│  │ - Batch size    │  │  │ Sent | Delivered | Read |     │   │
│  │ [Shoot Now! 🚀] │  │  │ Failed | Replied per msg     │   │
│  └────────────────┘  │  └──────────────────────────────┘   │
└──────────────────────┴──────────────────────────────────────┘
```

### Implementation Plan

#### Step 1: Create `WACampaignCommandCenter.tsx`
New unified component replacing the separate Campaigns tab content. Contains:
- **Overview Stats Bar** (top) — Total campaigns, sent, delivered, read, replied, failed counts
- **Left column (40%)** — Template designer + campaign builder in a single scrollable panel
- **Right column (60%)** — Chat view with delivery status + message log overview

#### Step 2: Template Designer Section (Left Panel, Top)
- Template selector dropdown (existing templates from `whatsapp_templates`)
- Inline message editor with live preview (WhatsApp bubble style)
- **Media Attachment Section**:
  - Buttons: "Attach PDF", "Attach Image", "Attach Video (30s)"
  - File upload to `broadcast-media` storage bucket
  - Preview thumbnails for attached media
  - Store `media_url` and `media_type` in campaign record
- Variable insertion buttons ({name}, {phone}, {car_model}, etc.)

#### Step 3: Campaign Builder Section (Left Panel, Bottom)
- Campaign name, description
- Segment selector (from `wa_contact_segments`)
- Schedule picker or **"Shoot Marketing Now!"** button (green, prominent)
- Batch size selector
- "Shoot Now" triggers immediate launch via `wa-campaign-launcher`

#### Step 4: Customer Chat + Status View (Right Panel)
- **Contact List** (left sub-panel): Searchable list from `whatsapp_conversations` + `wa_message_logs`
- **Chat Thread** (right sub-panel): WhatsApp-style bubbles with delivery ticks:
  - Single grey tick = Sent
  - Double grey tick = Delivered
  - Double blue tick = Read
  - Reply indicator
- **Message Delivery Overview** (bottom): Per-campaign breakdown showing sent/delivered/read/replied/failed counts with progress bars

#### Step 5: Update `wa-campaign-launcher` Edge Function
- Accept `media_url` and `media_type` fields
- When sending via Meta API, use image/document/video message types based on `media_type`
- Log media type in `wa_message_logs`

#### Step 6: Update `wa_campaigns` Table
- Add columns: `media_url` (text, nullable), `media_type` (text, nullable — values: 'image', 'video', 'document', null for text-only)

#### Step 7: Wire into WhatsAppMarketingPortal
- Replace `<WACampaignDashboard />` with `<WACampaignCommandCenter />` in the campaigns tab
- Keep other tabs (Inbox, Templates, Analytics, etc.) unchanged

### Files to Create/Edit
| File | Action |
|------|--------|
| `src/components/admin/marketing/wa/WACampaignCommandCenter.tsx` | **Create** — Main unified component |
| `src/components/admin/marketing/WhatsAppMarketingPortal.tsx` | **Edit** — Import and use new component |
| `supabase/functions/wa-campaign-launcher/index.ts` | **Edit** — Add media support |
| `supabase/functions/wa-queue-processor/index.ts` | **Edit** — Send media messages via Meta API |
| DB Migration | **Add** `media_url` and `media_type` columns to `wa_campaigns` |

### Technical Details
- Media uploads use existing `broadcast-media` public bucket
- Meta API supports image/document/video message types (already implemented in `whatsapp-send/index.ts`)
- Delivery status ticks follow WhatsApp convention: `sent` (single tick), `delivered` (double tick), `read` (blue double tick)
- Real-time updates via Supabase channel subscriptions on `whatsapp_conversations` and `wa_message_logs`
- "Shoot Now" button calls `wa-campaign-launcher` with `action: "launch"` immediately (no schedule)

