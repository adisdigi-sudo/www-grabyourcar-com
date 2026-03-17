

# Plan: One-Click WhatsApp API Send Across All Workspaces

## Current State

The platform has **two WhatsApp send patterns**:
1. **API sends** (already working): ~8 places use `supabase.functions.invoke("whatsapp-send")` — these actually send messages via Meta API.
2. **wa.me link opens** (~18 files, ~145 instances): These just open WhatsApp Web in a new tab — the user still has to manually press "Send". This is the problem.

## What Will Change

Create a **unified `sendWhatsApp()` utility** that calls the `whatsapp-send` edge function directly. Then replace all `window.open(wa.me/...)` calls across 18 admin components with this utility, so every WhatsApp button becomes a **one-click auto-send**.

## Technical Approach

### 1. Create unified send utility (`src/lib/sendWhatsApp.ts`)
A single reusable function:
```
sendWhatsApp({ phone, message, name?, logEvent? }) → { success, messageId }
```
- Normalizes phone numbers
- Calls `whatsapp-send` edge function
- Logs to `wa_message_logs` automatically
- Returns success/failure with toast feedback
- Falls back to wa.me link if API fails (graceful degradation)

### 2. Update `whatsapp-send` edge function
Add a health check handler so the Integration Hub ping works, and ensure all message types (text, template) work reliably.

### 3. Replace wa.me links in all admin workspaces
Files to update (all in `src/components/admin/`):

| Workspace | File | wa.me instances |
|-----------|------|----------------|
| Insurance CRM | `InsuranceCRMDashboard.tsx` | ~8 instances |
| Insurance Renewals | `InsuranceRenewalsEngine.tsx` | `sendDirectWhatsApp()` |
| Insurance Quote | `InsuranceQuoteModal.tsx` | 1 |
| Insurance Clients | `InsuranceClientsManager.tsx` | 2 |
| Lead Management | `LeadManagement.tsx` | 2 |
| HSRP | `HSRPWorkspace.tsx` | 2 |
| Loans | `LoanWorkspace.tsx` | 3 |
| Loans Pipeline | `LoanPipelineBoard.tsx` | 1 |
| Loan Disposition | `LoanCallDispositionModal.tsx` | 1 |
| Sales | `SalesWorkspace.tsx` | 2 |
| Calling Queue | `SmartCallingQueue.tsx` | 1 |
| WA Management | `WhatsAppManagement.tsx` | 1 |

Each `window.open(wa.me/...)` becomes:
```ts
import { sendWhatsApp } from "@/lib/sendWhatsApp";
await sendWhatsApp({ phone, message, name });
```

### 4. Fix existing bugs
- `whatsapp-send` edge function doesn't handle `health_check` action — the Integration Hub ping always fails. Add that handler.
- `InsuranceRenewalsEngine.tsx` `sendDirectWhatsApp` opens wa.me instead of using API — convert to API send.
- Bulk send in `BulkRenewalQuoteGenerator` uses `wa-automation-trigger` which requires matching event rules — switch to direct `whatsapp-send` for reliability.

### 5. Message logging
Every API send will automatically log to `wa_message_logs` so the Analytics dashboard in Marketing shows real data.

## Scope
- ~15 files modified
- 1 new utility file created
- 1 edge function updated
- No database changes needed
- No new secrets needed (WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID already configured)

