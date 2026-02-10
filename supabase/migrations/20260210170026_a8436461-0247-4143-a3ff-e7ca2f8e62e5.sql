
-- ============================================
-- WHATSAPP MESSAGING ABSTRACTION LAYER SCHEMA
-- ============================================

-- 1. Provider Configuration (swap Finbite for any provider later)
CREATE TABLE public.wa_provider_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_name TEXT NOT NULL DEFAULT 'finbite',
  base_url TEXT NOT NULL DEFAULT 'https://app.finbite.in/api/v2/whatsapp-business/messages',
  auth_type TEXT NOT NULL DEFAULT 'api_key',
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_provider_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on wa_provider_config"
  ON public.wa_provider_config FOR ALL
  USING (true) WITH CHECK (true);

-- Insert default Finbite provider
INSERT INTO public.wa_provider_config (provider_name, base_url, auth_type, config) VALUES (
  'finbite',
  'https://app.finbite.in/api/v2/whatsapp-business/messages',
  'api_key',
  '{"version": "v2", "endpoints": {"text": "/text", "template": "/template", "image": "/image", "document": "/document", "video": "/video", "audio": "/audio"}}'::jsonb
);

-- 2. Template Catalog (mirrors Finbite-approved templates)
CREATE TABLE public.wa_template_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  template_id TEXT,
  category TEXT NOT NULL DEFAULT 'utility',
  language TEXT NOT NULL DEFAULT 'en',
  description TEXT,
  variables TEXT[] DEFAULT '{}',
  sample_body TEXT,
  trigger_event TEXT,
  trigger_conditions JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  provider TEXT NOT NULL DEFAULT 'finbite',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_name, provider)
);

ALTER TABLE public.wa_template_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage wa_template_catalog"
  ON public.wa_template_catalog FOR ALL
  USING (true) WITH CHECK (true);

-- 3. Event-Template Mapping (which events trigger which templates)
CREATE TABLE public.wa_event_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  template_id UUID REFERENCES public.wa_template_catalog(id) ON DELETE CASCADE,
  delay_seconds INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB DEFAULT '{}',
  variable_mapping JSONB DEFAULT '{}',
  max_sends_per_lead INTEGER DEFAULT 1,
  cooldown_hours INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_event_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage wa_event_triggers"
  ON public.wa_event_triggers FOR ALL
  USING (true) WITH CHECK (true);

-- 4. Message Logs (internal data ownership - every message tracked)
CREATE TABLE public.wa_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  customer_name TEXT,
  template_name TEXT,
  template_id UUID REFERENCES public.wa_template_catalog(id),
  message_type TEXT NOT NULL DEFAULT 'template',
  message_content TEXT,
  variables JSONB DEFAULT '{}',
  trigger_event TEXT,
  lead_id UUID REFERENCES public.leads(id),
  campaign_id TEXT,
  provider TEXT NOT NULL DEFAULT 'finbite',
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on wa_message_logs"
  ON public.wa_message_logs FOR ALL
  USING (true) WITH CHECK (true);

-- Indexes for fast lookups
CREATE INDEX idx_wa_message_logs_phone ON public.wa_message_logs(phone);
CREATE INDEX idx_wa_message_logs_status ON public.wa_message_logs(status);
CREATE INDEX idx_wa_message_logs_template ON public.wa_message_logs(template_name);
CREATE INDEX idx_wa_message_logs_trigger ON public.wa_message_logs(trigger_event);
CREATE INDEX idx_wa_message_logs_lead ON public.wa_message_logs(lead_id);
CREATE INDEX idx_wa_message_logs_created ON public.wa_message_logs(created_at DESC);
CREATE INDEX idx_wa_event_triggers_event ON public.wa_event_triggers(event_name);
CREATE INDEX idx_wa_template_catalog_trigger ON public.wa_template_catalog(trigger_event);

-- Pre-populate template catalog with standard event mappings (placeholders)
INSERT INTO public.wa_template_catalog (template_name, category, trigger_event, description, variables) VALUES
  ('welcome_lead', 'utility', 'lead_created', 'Welcome message for new leads', ARRAY['name', 'car_model']),
  ('inquiry_ack', 'utility', 'car_inquiry', 'Acknowledgement for car inquiries', ARRAY['name', 'car_model', 'variant']),
  ('test_drive_confirm', 'utility', 'test_drive_requested', 'Test drive booking confirmation', ARRAY['name', 'car_model', 'date', 'time']),
  ('finance_interest', 'utility', 'loan_check', 'Finance/loan interest follow-up', ARRAY['name', 'car_model', 'emi_amount']),
  ('insurance_interest', 'utility', 'insurance_request', 'Insurance inquiry acknowledgement', ARRAY['name', 'car_model']),
  ('brochure_followup', 'marketing', 'brochure_download', 'Follow-up after brochure download', ARRAY['name', 'car_model']),
  ('price_drop_alert', 'marketing', 'price_drop', 'Price drop notification', ARRAY['name', 'car_model', 'old_price', 'new_price']),
  ('abandoned_journey', 'marketing', 'abandoned_flow', 'Nudge for abandoned browsing', ARRAY['name', 'car_model']),
  ('offer_campaign', 'marketing', 'offer_campaign', 'Promotional offer broadcast', ARRAY['name', 'offer_details']),
  ('variant_high_intent', 'utility', 'variant_viewed_multiple', 'High-intent variant viewing follow-up', ARRAY['name', 'car_model', 'variant']);

-- Create event triggers for each template
INSERT INTO public.wa_event_triggers (event_name, template_id, delay_seconds, priority, max_sends_per_lead, cooldown_hours)
SELECT 
  tc.trigger_event,
  tc.id,
  CASE 
    WHEN tc.trigger_event = 'lead_created' THEN 0
    WHEN tc.trigger_event = 'abandoned_flow' THEN 7200
    ELSE 60
  END,
  CASE
    WHEN tc.trigger_event = 'lead_created' THEN 1
    ELSE 5
  END,
  1,
  24
FROM public.wa_template_catalog tc
WHERE tc.trigger_event IS NOT NULL;

-- Triggers for updated_at
CREATE TRIGGER update_wa_provider_config_updated_at BEFORE UPDATE ON public.wa_provider_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_template_catalog_updated_at BEFORE UPDATE ON public.wa_template_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_event_triggers_updated_at BEFORE UPDATE ON public.wa_event_triggers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_message_logs_updated_at BEFORE UPDATE ON public.wa_message_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
