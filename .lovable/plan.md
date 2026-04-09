

# Integration Fix & Activation — Complete Workplan

## Current Status (What's Working vs Broken)

| Integration | Status | Issue |
|---|---|---|
| **WhatsApp (Finbite)** | ⚠️ Partially working | API returns success (`wamid`) but messages may not arrive — likely wrong `WHATSAPP_PHONE_NUMBER_ID` (current: `1015140975005622`, should be `998733619990657`) |
| **WhatsApp (Meta direct)** | ⚠️ Same issue | `whatsapp-send` function uses same credentials |
| **Email (Resend)** | ❌ Broken | Domain `grabyourcar.com` not verified in Resend — returns 403 |
| **Email (Lovable built-in)** | ❌ Not set up | No email domain configured in Lovable Cloud |
| **RCS (Twilio)** | ❌ Not configured | No Twilio connector or secrets |
| **Google Ads API** | ❌ Not configured | No secrets for Meta/Google lead webhook verification |

## Plan — Fix Each Integration (in order)

### Step 1: Fix WhatsApp — Update Phone Number ID
- Update the `WHATSAPP_PHONE_NUMBER_ID` secret from `1015140975005622` to `998733619990657` (as noted in your memory)
- Test by sending a real message to `919855924442` via `messaging-service`
- Verify delivery

### Step 2: Set Up Email via Lovable Cloud
- Set up a Lovable email domain (e.g. `notify.grabyourcar.com`) — this replaces the broken Resend direct integration with a built-in, managed system
- Set up email infrastructure (queues, tables, cron)
- Scaffold transactional email templates (contact confirmation, lead alert, etc.)
- Update all edge functions (`send-alert-email`, `send-automated-email`, `omni-channel-send` email adapter) to use Lovable's email system instead of raw Resend calls
- Test email delivery to `hrgyb1@gmail.com`

### Step 3: Connect Twilio for RCS/SMS
- Use the Twilio connector to link credentials
- Update `omni-channel-send` RCS adapter with real Twilio logic
- Update `omni-campaign-send` RCS path
- Test RCS delivery

### Step 4: Verify & Test All Channels End-to-End
- Send test WhatsApp to `919855924442`
- Send test email to `hrgyb1@gmail.com`
- Send test RCS/SMS to `919855924442`
- Verify logs in `wa_message_logs` and `email_send_log`
- Test from the CRM UI (OmniSendPanel)

### Step 5: Google Ads Webhook (Optional)
- If you have Google Ads credentials, we configure the `meta-lead-webhook` function
- Otherwise this stays as a placeholder until you have the API access

## Technical Details

- **WhatsApp**: Single secret update + re-test. No code changes needed.
- **Email**: Moving from raw Resend API calls (which require domain verification on Resend's dashboard) to Lovable's built-in email system (which manages DNS automatically via NS delegation). This is more reliable and doesn't require external dashboard access.
- **RCS/Twilio**: Connector provides `TWILIO_API_KEY` as env var → update edge functions to call Twilio's API for RCS messaging.
- **All existing edge functions** (`omni-channel-send`, `omni-campaign-send`, `send-alert-email`, `send-automated-email`, `broadcast-send`, `dealer-inquiry-broadcast`) will continue working — we fix the underlying providers they call.

## Execution Order

We'll tackle Steps 1-4 sequentially. Step 1 (WhatsApp fix) is the quickest win — just a secret update and test. Step 2 (Email) requires the email domain setup dialog. Step 3 (Twilio) requires you to connect the Twilio connector.

