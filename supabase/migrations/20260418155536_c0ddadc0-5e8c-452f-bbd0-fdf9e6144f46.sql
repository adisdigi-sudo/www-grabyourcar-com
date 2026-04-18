
-- Reply Agents: form-based AI agents managed by Super Admin + Vertical Managers
CREATE TABLE IF NOT EXISTS public.reply_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  vertical_id UUID REFERENCES public.business_verticals(id) ON DELETE CASCADE,
  vertical_slug TEXT,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','email','both')),
  trigger_type TEXT NOT NULL DEFAULT 'inbound_message' CHECK (trigger_type IN ('inbound_message','keyword','new_lead','stage_change','any')),
  trigger_keywords TEXT[] DEFAULT '{}',
  trigger_stages TEXT[] DEFAULT '{}',
  system_prompt TEXT NOT NULL,
  knowledge_base TEXT,
  ai_model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  temperature NUMERIC DEFAULT 0.7,
  auto_send BOOLEAN NOT NULL DEFAULT false,
  business_hours_only BOOLEAN DEFAULT false,
  business_start_hour INT DEFAULT 9,
  business_end_hour INT DEFAULT 21,
  max_replies_per_lead INT DEFAULT 5,
  reply_delay_seconds INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INT DEFAULT 100,
  total_runs INT DEFAULT 0,
  total_replies_sent INT DEFAULT 0,
  total_approvals_pending INT DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reply_agents_vertical ON public.reply_agents(vertical_id);
CREATE INDEX IF NOT EXISTS idx_reply_agents_active ON public.reply_agents(is_active, channel);

-- Logs
CREATE TABLE IF NOT EXISTS public.reply_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.reply_agents(id) ON DELETE CASCADE,
  channel TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_name TEXT,
  inbound_message TEXT,
  ai_reply TEXT,
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated','sent','queued_for_approval','rejected','failed','test')),
  auto_sent BOOLEAN DEFAULT false,
  approval_required BOOLEAN DEFAULT false,
  error_message TEXT,
  ai_model_used TEXT,
  tokens_used INT,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reply_agent_logs_agent ON public.reply_agent_logs(agent_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.reply_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reply_agent_logs ENABLE ROW LEVEL SECURITY;

-- Helper: super admin check (uses existing get_crm_role pattern)
CREATE OR REPLACE FUNCTION public.is_super_admin_user(_uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role IN ('admin','super_admin')
  );
$$;

-- Policies: Super admin full access; vertical managers can manage agents in their vertical
CREATE POLICY "reply_agents_admin_all" ON public.reply_agents
  FOR ALL TO authenticated
  USING (public.is_super_admin_user(auth.uid()))
  WITH CHECK (public.is_super_admin_user(auth.uid()));

CREATE POLICY "reply_agents_vertical_read" ON public.reply_agents
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "reply_agent_logs_admin_all" ON public.reply_agent_logs
  FOR ALL TO authenticated
  USING (public.is_super_admin_user(auth.uid()))
  WITH CHECK (public.is_super_admin_user(auth.uid()));

CREATE POLICY "reply_agent_logs_read" ON public.reply_agent_logs
  FOR SELECT TO authenticated
  USING (true);

-- Service role / edge functions need insert access for logs
CREATE POLICY "reply_agent_logs_insert_any" ON public.reply_agent_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Updated-at trigger
CREATE TRIGGER trg_reply_agents_updated_at
BEFORE UPDATE ON public.reply_agents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
