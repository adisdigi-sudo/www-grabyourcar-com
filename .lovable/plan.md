

## Dealer Inquiry & Broadcast System — Plan

### What We're Building
A **Brand-wise Dealer Contact Manager** with one-click bulk WhatsApp inquiry capability. You select a brand → see all registered dealers for that brand → type one message → it reaches all of them instantly.

### Current State
- `dealer_companies` and `dealer_representatives` tables exist but only have 1 test record
- `dealer_broadcast_logs` table exists for history tracking
- `car_brands` table has 36+ active brands already registered
- Existing `DealerBroadcastManager` component exists but lacks brand-wise inquiry focus, state/city filtering, and actual WhatsApp send integration
- WhatsApp API is already configured (Meta Cloud API with access token)

### Database Changes

**1. Add `state` column to `dealer_representatives`** (currently only company has city/state):
- Add `state TEXT` and `city TEXT` to `dealer_representatives` for direct filtering
- This avoids always joining to company table for location filters

**2. Create a `dealer_contacts` table** — a simplified, purpose-built table for this use case:
No — we already have `dealer_representatives` with all needed fields (name, phone, whatsapp_number, brand, dealer_company_id). We'll add `state` and `city` columns to it and use it directly.

### UI Implementation — New Component: `DealerInquiryHub`

**Location**: New tab in Dealer Network management or standalone page

**Layout**:

```text
┌─────────────────────────────────────────────────────┐
│  DEALER INQUIRY HUB                                 │
│  [Brand: ▼ Maruti Suzuki] [State: ▼] [City: ▼]     │
│  [+ Add Dealer] [Bulk Import]                       │
├─────────────────────────────────────────────────────┤
│  ☐ Select All (15 dealers)                          │
│  ┌──────────────────────────────────────────────┐   │
│  │ ☐ Name    │ Dealer   │ WhatsApp  │ City │ St │   │
│  │ ☐ Rajesh  │ Arena DL │ 98xxxxx   │ Delhi│ DL │   │
│  │ ☐ Suresh  │ Nexa MH  │ 97xxxxx   │ Pune │ MH │   │
│  └──────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  MESSAGE COMPOSER                                   │
│  [Stock Inquiry ▼] [Auto-fill brand name]           │
│  ┌─────────────────────────────────────────────┐    │
│  │ Hi, do you have Maruti Swift available?     │    │
│  │ Please share best offer with stock details. │    │
│  └─────────────────────────────────────────────┘    │
│  [Send to All 15 ▶] [Send One-by-One ▶]            │
└─────────────────────────────────────────────────────┘
```

### Implementation Steps

**Step 1 — Database Migration**
- Add `state TEXT`, `city TEXT` columns to `dealer_representatives`
- These allow direct state/city filtering without joins

**Step 2 — Build `DealerInquiryHub` Component**
- Brand selector: Pulls from `car_brands` table (36+ brands)
- State/City filters on `dealer_representatives`
- Contact table: Checkbox select, Name, Dealer Name (from company), WhatsApp number, City, State
- Select All / Deselect All
- Message composer with pre-filled templates:
  - "Stock Inquiry" — auto-fills brand name
  - "Best Deal Request"
  - "Daily Offer Update"
  - Custom message
- **Send modes**:
  - "Shoot All" — calls edge function to send WhatsApp to all selected via Meta API
  - "Send One-by-One" — opens WhatsApp web links sequentially

**Step 3 — Bulk Add Feature**
- Dialog with a simple form: paste multiple rows (Name, WhatsApp, Dealer Name, City, State)
- Or CSV upload
- Auto-assigns the selected brand
- Inserts into `dealer_representatives` (creating company if needed)

**Step 4 — Edge Function for Bulk WhatsApp Send**
- Update existing `broadcast-send` or create `dealer-inquiry-broadcast` edge function
- Loops through selected WhatsApp numbers
- Sends text message via Meta WhatsApp Cloud API
- Logs results to `dealer_broadcast_logs`

**Step 5 — Integration**
- Add "Inquiry Hub" tab to `DealerManagement.tsx`
- Wire up navigation from admin sidebar

### Key Features
- Brands pulled from existing `car_brands` database (no hardcoding)
- State/city filters for regional targeting
- One-click "Send to All" via WhatsApp API
- Bulk import for adding dealers per brand quickly
- Broadcast history with delivery tracking

