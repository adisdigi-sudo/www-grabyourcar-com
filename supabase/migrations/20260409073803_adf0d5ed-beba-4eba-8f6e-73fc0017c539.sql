
-- 1. Omni-Channel Campaigns (unified across email/whatsapp/rcs)
CREATE TABLE IF NOT EXISTS public.omni_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT DEFAULT 'draft',
  subject TEXT,
  message_body TEXT,
  html_content TEXT,
  template_id UUID,
  wa_template_name TEXT,
  segment_filter JSONB DEFAULT '{}'::jsonb,
  from_name TEXT,
  from_email TEXT,
  reply_to TEXT,
  batch_size INT DEFAULT 100,
  batch_delay_seconds INT DEFAULT 0,
  timezone_send BOOLEAN DEFAULT false,
  optimal_time_send BOOLEAN DEFAULT false,
  total_recipients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  bounce_count INT DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.omni_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage omni_campaigns" ON public.omni_campaigns FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 2. Omni Campaign Messages (delivery logs per recipient)
CREATE TABLE IF NOT EXISTS public.omni_campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.omni_campaigns(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  recipient_phone TEXT,
  recipient_email TEXT,
  recipient_name TEXT,
  status TEXT DEFAULT 'pending',
  external_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ocm_campaign ON public.omni_campaign_messages(campaign_id);
CREATE INDEX idx_ocm_status ON public.omni_campaign_messages(status);
ALTER TABLE public.omni_campaign_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage omni_campaign_messages" ON public.omni_campaign_messages FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 3. Integration Providers (marketplace catalog)
CREATE TABLE IF NOT EXISTS public.integration_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'messaging',
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  docs_url TEXT,
  setup_guide TEXT,
  required_secrets TEXT[] DEFAULT '{}',
  supported_channels TEXT[] DEFAULT '{}',
  pricing_tier TEXT DEFAULT 'free',
  is_available BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view providers" ON public.integration_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage providers" ON public.integration_providers FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 4. Integration Connections (active configurations)
CREATE TABLE IF NOT EXISTS public.integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.integration_providers(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  channel TEXT,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  credentials_configured BOOLEAN DEFAULT false,
  health_status TEXT DEFAULT 'unknown',
  last_health_check TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  total_messages_sent INT DEFAULT 0,
  total_messages_failed INT DEFAULT 0,
  error_rate NUMERIC(5,2) DEFAULT 0,
  connected_by UUID,
  connected_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage connections" ON public.integration_connections FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 5. Webhook Endpoints
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  provider_id UUID REFERENCES public.integration_providers(id) ON DELETE SET NULL,
  endpoint_url TEXT,
  secret_header TEXT DEFAULT 'X-Webhook-Secret',
  secret_value TEXT,
  is_active BOOLEAN DEFAULT true,
  events_subscribed TEXT[] DEFAULT '{}',
  last_received_at TIMESTAMPTZ,
  total_received INT DEFAULT 0,
  total_processed INT DEFAULT 0,
  total_failed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage webhooks" ON public.webhook_endpoints FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 6. Webhook Logs
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID REFERENCES public.webhook_endpoints(id) ON DELETE SET NULL,
  event_type TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  headers JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'received',
  processing_time_ms INT,
  error_message TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_wl_endpoint ON public.webhook_logs(endpoint_id);
CREATE INDEX idx_wl_created ON public.webhook_logs(created_at DESC);
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read webhook_logs" ON public.webhook_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
