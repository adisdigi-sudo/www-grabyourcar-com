
-- 1. Drip Sequences
CREATE TABLE IF NOT EXISTS public.drip_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_event TEXT,
  is_active BOOLEAN DEFAULT false,
  list_id UUID REFERENCES public.email_lists(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.drip_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage drip_sequences" ON public.drip_sequences FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 2. Drip Sequence Steps
CREATE TABLE IF NOT EXISTS public.drip_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.drip_sequences(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  step_order INT NOT NULL DEFAULT 0,
  delay_hours INT DEFAULT 0,
  delay_days INT DEFAULT 0,
  subject_override TEXT,
  conditions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.drip_sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage drip_sequence_steps" ON public.drip_sequence_steps FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 3. Drip Enrollments
CREATE TABLE IF NOT EXISTS public.drip_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.drip_sequences(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
  current_step_index INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  next_send_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sequence_id, subscriber_id)
);
ALTER TABLE public.drip_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage drip_enrollments" ON public.drip_enrollments FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 4. Email Events (Resend webhook tracking)
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id UUID REFERENCES public.email_logs(id) ON DELETE SET NULL,
  resend_id TEXT,
  event_type TEXT NOT NULL,
  recipient_email TEXT,
  campaign_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  link_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_email_events_resend_id ON public.email_events(resend_id);
CREATE INDEX idx_email_events_type ON public.email_events(event_type);
CREATE INDEX idx_email_events_campaign ON public.email_events(campaign_id);
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read email_events" ON public.email_events FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 5. Dynamic Content Rules
CREATE TABLE IF NOT EXISTS public.dynamic_content_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_html TEXT NOT NULL DEFAULT '',
  fallback_html TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.dynamic_content_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage dynamic_content_rules" ON public.dynamic_content_rules FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 6. Email Unsubscribe Tokens
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_unsub_token ON public.email_unsubscribe_tokens(token);
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read unsub tokens" ON public.email_unsubscribe_tokens FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 7. Add tracking columns to email_logs
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ;

-- 8. Add list_id to email_subscribers if missing
ALTER TABLE public.email_subscribers ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES public.email_lists(id) ON DELETE SET NULL;
