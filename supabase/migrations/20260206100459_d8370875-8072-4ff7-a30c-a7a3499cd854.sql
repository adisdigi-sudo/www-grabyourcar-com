-- Lead Scoring System
CREATE TABLE IF NOT EXISTS public.lead_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}',
  engagement_level TEXT DEFAULT 'cold' CHECK (engagement_level IN ('cold', 'warm', 'hot', 'qualified')),
  last_activity_at TIMESTAMPTZ,
  email_opens INTEGER DEFAULT 0,
  email_clicks INTEGER DEFAULT 0,
  whatsapp_replies INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  form_submissions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketing Campaigns
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('email', 'whatsapp', 'multi_channel')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed')),
  target_segment JSONB DEFAULT '{}',
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  ab_test_enabled BOOLEAN DEFAULT false,
  ab_test_variants JSONB DEFAULT '[]',
  winning_variant TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Journey Automations (Drip Campaigns)
CREATE TABLE IF NOT EXISTS public.journey_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('form_submit', 'page_view', 'manual', 'scheduled', 'segment_entry', 'event')),
  trigger_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  total_enrolled INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Journey Steps (Automation Nodes)
CREATE TABLE IF NOT EXISTS public.journey_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID REFERENCES public.journey_automations(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('email', 'whatsapp', 'wait', 'condition', 'action', 'split')),
  step_config JSONB NOT NULL DEFAULT '{}',
  template_id UUID,
  delay_days INTEGER DEFAULT 0,
  delay_hours INTEGER DEFAULT 0,
  delay_minutes INTEGER DEFAULT 0,
  condition_rules JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Journey Enrollments (Leads in Journeys)
CREATE TABLE IF NOT EXISTS public.journey_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journey_id UUID REFERENCES public.journey_automations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  current_step_id UUID REFERENCES public.journey_steps(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'exited', 'converted')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  next_action_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- WhatsApp Broadcasts
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template_id UUID REFERENCES public.whatsapp_templates(id),
  target_segment JSONB DEFAULT '{}',
  segment_filters JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'failed')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  message_content TEXT,
  variables_data JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Broadcast Recipients
CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID REFERENCES public.whatsapp_broadcasts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id),
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'replied', 'failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead Activity Tracking (for scoring)
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS score_impact INTEGER DEFAULT 0;
ALTER TABLE public.lead_activities ADD COLUMN IF NOT EXISTS activity_source TEXT;

-- Real-time Alerts Configuration
CREATE TABLE IF NOT EXISTS public.marketing_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('hot_lead', 'high_intent', 'conversion', 'campaign_goal', 'custom')),
  conditions JSONB NOT NULL DEFAULT '{}',
  notification_channels JSONB DEFAULT '["dashboard"]',
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaign ROI Tracking
CREATE TABLE IF NOT EXISTS public.campaign_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id),
  conversion_type TEXT NOT NULL,
  conversion_value NUMERIC DEFAULT 0,
  attributed_revenue NUMERIC DEFAULT 0,
  converted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_conversions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users (admin access)
CREATE POLICY "Authenticated users can manage lead_scores" ON public.lead_scores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage marketing_campaigns" ON public.marketing_campaigns FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage journey_automations" ON public.journey_automations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage journey_steps" ON public.journey_steps FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage journey_enrollments" ON public.journey_enrollments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage whatsapp_broadcasts" ON public.whatsapp_broadcasts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage broadcast_recipients" ON public.broadcast_recipients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage marketing_alerts" ON public.marketing_alerts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage campaign_conversions" ON public.campaign_conversions FOR ALL USING (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead_id ON public.lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_engagement ON public.lead_scores(engagement_level);
CREATE INDEX IF NOT EXISTS idx_journey_enrollments_journey ON public.journey_enrollments(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_enrollments_lead ON public.journey_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast ON public.broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_campaign_conversions_campaign ON public.campaign_conversions(campaign_id);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_alerts;