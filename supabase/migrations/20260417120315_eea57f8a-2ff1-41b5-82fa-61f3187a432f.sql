-- Extend crm_message_templates with channel/email/purpose fields
ALTER TABLE public.crm_message_templates
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS email_html text,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS is_default_followup boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vertical text;

-- Add a check on channel values
DO $$ BEGIN
  ALTER TABLE public.crm_message_templates
    ADD CONSTRAINT crm_message_templates_channel_check
    CHECK (channel IN ('whatsapp','email','both'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes for cron / hub lookups
CREATE INDEX IF NOT EXISTS idx_crm_templates_vertical ON public.crm_message_templates(vertical);
CREATE INDEX IF NOT EXISTS idx_crm_templates_channel ON public.crm_message_templates(channel);
CREATE INDEX IF NOT EXISTS idx_crm_templates_default_followup ON public.crm_message_templates(vertical, is_default_followup) WHERE is_default_followup = true;
CREATE INDEX IF NOT EXISTS idx_crm_templates_purpose ON public.crm_message_templates(purpose);

-- Send log for automated follow-ups (audit + dedupe)
CREATE TABLE IF NOT EXISTS public.template_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL,
  lead_id text NOT NULL,
  lead_table text,
  template_slug text NOT NULL,
  channel text NOT NULL,
  recipient_phone text,
  recipient_email text,
  recipient_name text,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  follow_up_date date,
  follow_up_time text,
  payload jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_send_log_lead ON public.template_send_log(vertical, lead_id, template_slug);
CREATE INDEX IF NOT EXISTS idx_template_send_log_dedupe ON public.template_send_log(vertical, lead_id, template_slug, follow_up_date, follow_up_time);
CREATE INDEX IF NOT EXISTS idx_template_send_log_sent_at ON public.template_send_log(sent_at DESC);

ALTER TABLE public.template_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can view send log"
    ON public.template_send_log FOR SELECT
    USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can insert send log"
    ON public.template_send_log FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;