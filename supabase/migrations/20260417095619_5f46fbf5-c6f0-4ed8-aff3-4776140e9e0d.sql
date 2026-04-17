-- AI Communication Brain — decisions log
CREATE TABLE IF NOT EXISTS public.ai_brain_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  customer_name text,
  customer_id uuid,
  vertical text NOT NULL,
  source_table text,
  source_record_id uuid,

  -- AI decision
  action_type text NOT NULL, -- 'whatsapp', 'email', 'call_suggestion', 'no_action'
  message_channel text DEFAULT 'whatsapp',
  message_content text,
  message_subject text,
  reasoning text, -- AI's explanation
  confidence_score numeric DEFAULT 0, -- 0-100
  
  -- Lifecycle
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'auto_sent', 'sent', 'rejected', 'failed', 'expired'
  auto_send boolean DEFAULT false,
  scheduled_for timestamptz,
  sent_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  rejected_reason text,

  -- Response tracking (for learning)
  customer_responded boolean DEFAULT false,
  customer_response_at timestamptz,
  response_sentiment text, -- 'positive', 'neutral', 'negative'
  led_to_conversion boolean DEFAULT false,

  -- Metadata
  context_snapshot jsonb DEFAULT '{}'::jsonb, -- full lead snapshot at decision time
  ai_model_used text DEFAULT 'google/gemini-2.5-flash',
  error_message text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_brain_decisions_status ON public.ai_brain_decisions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_brain_decisions_vertical ON public.ai_brain_decisions(vertical, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_brain_decisions_phone ON public.ai_brain_decisions(customer_phone);
CREATE INDEX IF NOT EXISTS idx_ai_brain_decisions_pending ON public.ai_brain_decisions(status) WHERE status IN ('pending', 'approved');

ALTER TABLE public.ai_brain_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all AI brain decisions"
  ON public.ai_brain_decisions FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage AI brain decisions"
  ON public.ai_brain_decisions FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Service role full access"
  ON public.ai_brain_decisions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_ai_brain_decisions_updated_at
  BEFORE UPDATE ON public.ai_brain_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Settings for AI Brain (single row config)
CREATE TABLE IF NOT EXISTS public.ai_brain_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT true,
  auto_send_threshold numeric DEFAULT 90, -- confidence % above which to auto-send
  scan_interval_minutes int DEFAULT 15,
  max_decisions_per_run int DEFAULT 50,
  enabled_verticals text[] DEFAULT ARRAY['sales','insurance','loans','accessories','rentals','hsrp','dealer_network','marketing'],
  enabled_channels text[] DEFAULT ARRAY['whatsapp','email'],
  ai_model text DEFAULT 'google/gemini-2.5-flash',
  business_hours_only boolean DEFAULT true,
  business_start_hour int DEFAULT 9,
  business_end_hour int DEFAULT 21,
  last_run_at timestamptz,
  last_run_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_brain_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI brain config"
  ON public.ai_brain_config FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Service role full access config"
  ON public.ai_brain_config FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_ai_brain_config_updated_at
  BEFORE UPDATE ON public.ai_brain_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default config row
INSERT INTO public.ai_brain_config (is_enabled, auto_send_threshold)
VALUES (true, 90)
ON CONFLICT DO NOTHING;