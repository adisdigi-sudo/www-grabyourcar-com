
-- =====================================================
-- WhatsApp Marketing Platform - Enhanced Schema
-- Provider-agnostic architecture (Finbite now, swappable later)
-- =====================================================

-- 1. Messaging provider config (abstraction layer)
CREATE TABLE public.messaging_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL DEFAULT 'finbite', -- finbite, meta_cloud, etc.
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  rate_limit_per_second INTEGER DEFAULT 5,
  daily_limit INTEGER DEFAULT 10000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messaging_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin only access to providers" ON public.messaging_providers
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

INSERT INTO public.messaging_providers (name, provider_type, is_active, rate_limit_per_second, daily_limit)
VALUES ('Finbite WhatsApp', 'finbite', true, 5, 10000);

-- 2. WhatsApp campaigns (enhanced from broadcasts)
CREATE TABLE public.wa_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL DEFAULT 'broadcast', -- broadcast, drip, event_triggered, journey
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, queued, sending, paused, completed, failed, cancelled
  template_id UUID REFERENCES public.whatsapp_templates(id),
  message_content TEXT,
  media_url TEXT,
  media_type TEXT, -- image, video, document
  
  -- Targeting
  segment_rules JSONB DEFAULT '[]', -- [{field, operator, value}]
  estimated_recipients INTEGER DEFAULT 0,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  send_window_start TIME, -- e.g., 09:00
  send_window_end TIME,   -- e.g., 21:00
  timezone TEXT DEFAULT 'Asia/Kolkata',
  
  -- Throughput control
  batch_size INTEGER DEFAULT 50,
  batch_delay_ms INTEGER DEFAULT 1000,
  
  -- Stats
  total_queued INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_opted_out INTEGER DEFAULT 0,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wa_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access to campaigns" ON public.wa_campaigns
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- 3. Message queue (the core delivery engine)
CREATE TABLE public.wa_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.wa_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id),
  phone TEXT NOT NULL,
  message_content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  
  -- Queue management
  status TEXT NOT NULL DEFAULT 'queued', -- queued, processing, sent, delivered, read, replied, failed, cancelled
  priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  -- Delivery tracking
  provider_message_id TEXT, -- ID from Finbite/provider
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  error_code TEXT,
  
  -- Metadata
  variables_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wa_message_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access to queue" ON public.wa_message_queue
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Index for queue processing
CREATE INDEX idx_wa_queue_status_priority ON public.wa_message_queue (status, priority, created_at) WHERE status IN ('queued', 'processing');
CREATE INDEX idx_wa_queue_campaign ON public.wa_message_queue (campaign_id);
CREATE INDEX idx_wa_queue_retry ON public.wa_message_queue (next_retry_at) WHERE status = 'queued' AND attempts > 0;

-- 4. Automation rules engine
CREATE TABLE public.wa_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  
  -- Trigger config
  trigger_event TEXT NOT NULL, -- lead_created, lead_updated, form_submitted, variant_viewed, booking_created, price_drop, custom
  trigger_conditions JSONB DEFAULT '[]', -- [{field, operator, value}]
  
  -- Action config
  template_id UUID REFERENCES public.whatsapp_templates(id),
  message_content TEXT,
  delay_minutes INTEGER DEFAULT 0, -- delay before sending
  
  -- Limits
  max_sends_per_lead INTEGER DEFAULT 1, -- prevent spam
  cooldown_hours INTEGER DEFAULT 24, -- min hours between sends to same lead
  
  -- Stats
  total_triggered INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_suppressed INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wa_automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access to automation" ON public.wa_automation_rules
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- 5. Automation execution log
CREATE TABLE public.wa_automation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.wa_automation_rules(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id),
  phone TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  trigger_data JSONB DEFAULT '{}',
  message_id UUID REFERENCES public.wa_message_queue(id),
  status TEXT DEFAULT 'triggered', -- triggered, queued, sent, suppressed, failed
  suppression_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wa_automation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access to automation log" ON public.wa_automation_log
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- 6. Opt-out registry (compliance)
CREATE TABLE public.wa_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  reason TEXT,
  opted_out_at TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'user_request' -- user_request, admin, system
);

ALTER TABLE public.wa_opt_outs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access to opt-outs" ON public.wa_opt_outs
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX idx_wa_opt_outs_phone ON public.wa_opt_outs (phone);

-- 7. Contact segments (saved filters)
CREATE TABLE public.wa_contact_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB DEFAULT '[]', -- [{field, operator, value}]
  estimated_count INTEGER DEFAULT 0,
  is_dynamic BOOLEAN DEFAULT true, -- recalculates on use
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wa_contact_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access to segments" ON public.wa_contact_segments
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- 8. Campaign analytics (daily aggregates)
CREATE TABLE public.wa_campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.wa_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sent INTEGER DEFAULT 0,
  delivered INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  replied INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  opted_out INTEGER DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, date)
);

ALTER TABLE public.wa_campaign_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin access to analytics" ON public.wa_campaign_analytics
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Enable realtime for queue status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_message_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_campaigns;

-- Triggers for updated_at
CREATE TRIGGER update_wa_campaigns_updated_at BEFORE UPDATE ON public.wa_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wa_queue_updated_at BEFORE UPDATE ON public.wa_message_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wa_automation_updated_at BEFORE UPDATE ON public.wa_automation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wa_segments_updated_at BEFORE UPDATE ON public.wa_contact_segments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
