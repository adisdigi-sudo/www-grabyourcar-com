CREATE TABLE IF NOT EXISTS public.meta_ads_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_label text NOT NULL,
  ad_account_id text NOT NULL,
  access_token text,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ad_account_id)
);

ALTER TABLE public.meta_ads_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meta ads config"
ON public.meta_ads_config
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER meta_ads_config_updated_at
BEFORE UPDATE ON public.meta_ads_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.meta_ads_daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id text NOT NULL,
  campaign_id text,
  campaign_name text,
  ad_set_id text,
  ad_set_name text,
  ad_id text,
  ad_name text,
  level text NOT NULL DEFAULT 'campaign',
  metric_date date NOT NULL,
  impressions integer NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  spend numeric NOT NULL DEFAULT 0,
  leads integer NOT NULL DEFAULT 0,
  ctr numeric,
  cpc numeric,
  cpm numeric,
  raw jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_meta_ads_daily
ON public.meta_ads_daily_metrics (ad_account_id, level, COALESCE(ad_id,''), COALESCE(ad_set_id,''), COALESCE(campaign_id,''), metric_date);

CREATE INDEX IF NOT EXISTS idx_meta_ads_daily_date ON public.meta_ads_daily_metrics (metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_ads_daily_campaign ON public.meta_ads_daily_metrics (campaign_id);

ALTER TABLE public.meta_ads_daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meta ads metrics"
ON public.meta_ads_daily_metrics
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.wa_failure_codes (
  code integer PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text,
  user_action text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_failure_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read failure codes"
ON public.wa_failure_codes
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins manage failure codes"
ON public.wa_failure_codes
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.wa_failure_codes (code, title, description, category, user_action) VALUES
  (130429, 'Rate limit hit', 'Too many messages sent in a short window.', 'rate_limit', 'Slow down sends or upgrade messaging tier.'),
  (131026, 'Message undeliverable', 'Recipient cannot receive your message right now.', 'undeliverable', 'Retry later or verify the number.'),
  (131047, 'Re-engagement required', '24h customer service window expired.', 'window', 'Send an approved template instead.'),
  (131051, 'Unsupported message type', 'WhatsApp does not support this content type.', 'content', 'Switch to a supported message type.'),
  (131053, 'Media upload error', 'Could not download/process media.', 'media', 'Re-upload the media file.'),
  (132000, 'Template params mismatch', 'Variable count differs from template.', 'template', 'Fix template variables.'),
  (132001, 'Template not approved/exists', 'Template missing, paused, or rejected.', 'template', 'Use an approved template.'),
  (132005, 'Hydrated text too long', 'Final message exceeds size limit.', 'template', 'Shorten template content.'),
  (132007, 'Template format mismatch', 'Variable formatting violates rules.', 'template', 'Fix variable formatting.'),
  (133010, 'Phone not on WhatsApp', 'Number is not registered on WhatsApp.', 'recipient', 'Remove from list.'),
  (368, 'User blocked business', 'Recipient blocked your number.', 'blocked', 'Remove from list.'),
  (470, '24h window closed', 'Free-form message outside 24h window.', 'window', 'Send a template message.'),
  (1, 'Generic Meta error', 'Unknown failure returned by Meta.', 'unknown', 'Check WhatsApp Cloud logs.')
ON CONFLICT (code) DO UPDATE
  SET title = EXCLUDED.title,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      user_action = EXCLUDED.user_action,
      updated_at = now();