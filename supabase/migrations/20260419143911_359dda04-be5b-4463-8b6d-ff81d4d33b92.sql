-- Calling Queue enhancements
ALTER TABLE public.auto_dialer_campaigns
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid,
  ADD COLUMN IF NOT EXISTS vertical_slug text,
  ADD COLUMN IF NOT EXISTS last_import_filename text,
  ADD COLUMN IF NOT EXISTS import_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.auto_dialer_contacts
  ADD COLUMN IF NOT EXISTS dial_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_dialed_at timestamptz,
  ADD COLUMN IF NOT EXISTS recording_url text,
  ADD COLUMN IF NOT EXISTS dialed_by uuid;

CREATE INDEX IF NOT EXISTS idx_auto_dialer_contacts_pending
  ON public.auto_dialer_contacts (campaign_id, call_status, created_at);

CREATE INDEX IF NOT EXISTS idx_auto_dialer_campaigns_vertical
  ON public.auto_dialer_campaigns (vertical_slug);