
-- WhatsApp Drip Sequences (multi-step follow-up per vertical)
CREATE TABLE IF NOT EXISTS public.wa_drip_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vertical text NOT NULL DEFAULT 'car',
  trigger_event text NOT NULL DEFAULT 'new_lead',
  is_active boolean DEFAULT true,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.wa_drip_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage wa_drip_sequences" ON public.wa_drip_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WhatsApp Drip Enrollments
CREATE TABLE IF NOT EXISTS public.wa_drip_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid REFERENCES public.wa_drip_sequences(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid NOT NULL,
  phone text NOT NULL,
  lead_name text,
  current_step_index int DEFAULT 0,
  status text DEFAULT 'active',
  next_send_at timestamptz,
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.wa_drip_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage wa_drip_enrollments" ON public.wa_drip_enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_wa_drip_enrollments_next ON public.wa_drip_enrollments(status, next_send_at) WHERE status = 'active';
CREATE INDEX idx_wa_drip_enrollments_lead ON public.wa_drip_enrollments(lead_id);

-- Dedicated Lead Scores table
CREATE TABLE IF NOT EXISTS public.lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  score int NOT NULL DEFAULT 0,
  segment text DEFAULT 'cold',
  reason text,
  recommended_action text,
  scored_at timestamptz DEFAULT now(),
  scored_by text DEFAULT 'ai',
  created_at timestamptz DEFAULT now(),
  UNIQUE(lead_id)
);
ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users read lead_scores" ON public.lead_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service can manage lead_scores" ON public.lead_scores FOR ALL USING (true) WITH CHECK (true);

-- Auto Dialer Campaigns
CREATE TABLE IF NOT EXISTS public.auto_dialer_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text DEFAULT 'draft',
  total_contacts int DEFAULT 0,
  completed_contacts int DEFAULT 0,
  pending_contacts int DEFAULT 0,
  interested_contacts int DEFAULT 0,
  not_interested_contacts int DEFAULT 0,
  no_answer_contacts int DEFAULT 0,
  vertical text DEFAULT 'car',
  assigned_team_member text,
  created_by text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.auto_dialer_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage auto_dialer_campaigns" ON public.auto_dialer_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto Dialer Contacts
CREATE TABLE IF NOT EXISTS public.auto_dialer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.auto_dialer_campaigns(id) ON DELETE CASCADE NOT NULL,
  phone text NOT NULL,
  name text,
  email text,
  city text,
  call_status text DEFAULT 'pending',
  disposition text,
  notes text,
  call_duration_seconds int,
  called_at timestamptz,
  follow_up_date timestamptz,
  lead_id uuid,
  extra_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.auto_dialer_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage auto_dialer_contacts" ON public.auto_dialer_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_dialer_contacts_campaign ON public.auto_dialer_contacts(campaign_id, call_status);

-- Auto Close Rules
CREATE TABLE IF NOT EXISTS public.auto_close_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL,
  from_stage text NOT NULL,
  to_stage text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  description text,
  auto_notify boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.auto_close_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage auto_close_rules" ON public.auto_close_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add lead_score column to leads table for quick access
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_score int;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_segment text;
