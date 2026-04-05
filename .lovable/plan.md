

## Understanding the Current State

After investigating the database, **your Anshdeep Singh quotes ARE being saved** — I found 2 entries from today (April 5) in the quote history:
- `save_quote` — Rs. 12,823
- `whatsapp` — Rs. 12,823

The persistence system is working. The issue is **visibility** — it's hard to see/confirm saved quotes at a glance.

## Plan: Improve Quote Save Visibility & Reliability

### 1. Add a "Quote Saved" confirmation banner in the Quote Modal
After a quote is generated and saved, show a green success card inside the modal with:
- Quote Reference (e.g., QS-M1ABCD)
- Premium amount, insurer, share method
- Link to view in Quote History tab

**File**: `src/components/admin/insurance/InsuranceQuoteModal.tsx`

### 2. Make PDF upload failure non-blocking
Currently if PDF upload to storage fails, the entire save fails and nothing is recorded. Change to:
- Try PDF upload, but if it fails, still save the quote history record (with `pdf_storage_path = null`)
- Show a warning instead of blocking error

**File**: `src/lib/insuranceQuotePersistence.ts`

### 3. Add Quote History count badge on the client card
Show a small badge like "3 quotes" on each client card in the pipeline view, so you can instantly see which clients have saved quotes.

**File**: `src/components/admin/insurance/InsuranceStatusPipeline.tsx`

### 4. Auto-refresh Quote History tab after save
After a quote is saved from the modal, automatically invalidate and refresh the Quote History tab so new entries appear immediately without manual refresh.

**File**: `src/components/admin/insurance/InsuranceQuoteModal.tsx`

## Technical Details

- `persistInsuranceQuoteHistory()` will be refactored to make `uploadQuotePdf()` a soft dependency (try/catch with fallback to null path)
- Quote modal will track `lastSavedQuoteRef` state to display confirmation UI
- Pipeline client cards will include quote count from a lightweight query
- `useQueryClient().invalidateQueries()` will target `["client-quote-history"]` after each save

