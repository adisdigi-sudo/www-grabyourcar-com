
# Custom Email Suite for GrabYourCar

## Part 1 — Webmail Client (Gmail-like Inbox)

### Prerequisites
- Set up Zoho Mail account for grabyourcar.com (user does this in Zoho admin)
- Create a Zoho API Console app (Self Client) to get OAuth credentials
- Add `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN` as secrets

### What We Build
1. **Edge Function: `zoho-mail-proxy`** — handles all Zoho Mail API calls (list messages, read, send, delete, folders, search)
2. **Inbox Page** — full email client UI with:
   - Folder navigation (Inbox, Sent, Drafts, Trash, Spam)
   - Email list with sender, subject, preview, date
   - Email reader with full HTML rendering
   - Compose/Reply/Forward with rich text editor
   - Search across all folders
   - Unread count badges
   - Star/archive/delete actions

### Zoho Mail API Endpoints Used
- `GET /messages` — list emails in a folder
- `GET /messages/{id}` — read a specific email
- `POST /messages` — send an email
- `PUT /messages/{id}` — mark read/unread, star
- `DELETE /messages/{id}` — delete/trash
- `GET /folders` — list folders

## Part 2 — Marketing Email Analytics Enhancement

### What We Build
1. **Edge Function: `resend-webhook`** — receives Resend webhook events (open, click, bounce, complaint, delivery)
2. **Database migration** — add `email_events` table for tracking opens, clicks, bounces
3. **Enhanced Analytics Dashboard** — real-time metrics:
   - Open rate, click rate, bounce rate per campaign
   - Per-recipient delivery timeline
   - Click heatmap (which links get clicked)
   - Bounce/complaint management
   - Daily/weekly volume charts
4. **Update `email_logs`** — add columns for `opened_at`, `clicked_at`, `bounced_at`

## Files to Create
1. `supabase/functions/zoho-mail-proxy/index.ts`
2. `src/pages/admin/EmailClient.tsx` (main webmail page)
3. `src/components/admin/email-client/InboxSidebar.tsx`
4. `src/components/admin/email-client/EmailList.tsx`
5. `src/components/admin/email-client/EmailReader.tsx`
6. `src/components/admin/email-client/ComposeEmail.tsx`
7. `supabase/functions/resend-webhook/index.ts`
8. `src/components/admin/marketing/email/EnhancedEmailAnalytics.tsx`

## Order of Implementation
1. Zoho Mail API setup (secrets + edge function)
2. Webmail UI components
3. Resend webhook for analytics
4. Enhanced analytics dashboard
