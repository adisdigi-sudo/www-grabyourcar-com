ALTER TABLE public.wa_campaigns ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp';
ALTER TABLE public.wa_campaigns ADD COLUMN IF NOT EXISTS email_subject text;
ALTER TABLE public.wa_campaigns ADD COLUMN IF NOT EXISTS email_provider text DEFAULT 'resend';

COMMENT ON COLUMN public.wa_campaigns.channel IS 'whatsapp, email, or rcs';
COMMENT ON COLUMN public.wa_campaigns.email_subject IS 'Subject line for email campaigns';
COMMENT ON COLUMN public.wa_campaigns.email_provider IS 'resend or lovable for email campaigns';