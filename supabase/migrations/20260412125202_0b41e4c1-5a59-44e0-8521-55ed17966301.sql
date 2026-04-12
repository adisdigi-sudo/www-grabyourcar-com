
-- Visual chatbot flow builder
CREATE TABLE public.wa_chatbot_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'keyword', -- keyword, first_message, event, manual
  trigger_value TEXT, -- keyword or event name
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, paused
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of flow nodes
  vertical TEXT,
  total_runs INT NOT NULL DEFAULT 0,
  completed_runs INT NOT NULL DEFAULT 0,
  failed_runs INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_chatbot_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage chatbot flows"
  ON public.wa_chatbot_flows FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Flow run logs
CREATE TABLE public.wa_flow_run_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.wa_chatbot_flows(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  current_node_id TEXT,
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed, abandoned
  context JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_flow_run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage flow run logs"
  ON public.wa_flow_run_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_flow_runs_flow ON public.wa_flow_run_logs(flow_id);
CREATE INDEX idx_flow_runs_phone ON public.wa_flow_run_logs(contact_phone);
CREATE INDEX idx_flow_runs_status ON public.wa_flow_run_logs(status);
