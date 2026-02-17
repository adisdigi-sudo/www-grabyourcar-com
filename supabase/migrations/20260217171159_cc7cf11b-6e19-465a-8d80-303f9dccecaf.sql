
-- Call Disposition Enum
CREATE TYPE public.call_disposition AS ENUM (
  'connected',
  'not_connected', 
  'busy',
  'switched_off',
  'wrong_number',
  'no_answer',
  'callback_requested'
);

-- Call Logs table
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID,
  lead_type TEXT NOT NULL DEFAULT 'general',
  lead_name TEXT,
  lead_phone TEXT NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'outbound',
  call_method TEXT NOT NULL DEFAULT 'phone',
  disposition public.call_disposition,
  duration_seconds INTEGER DEFAULT 0,
  notes TEXT,
  lead_stage_before TEXT,
  lead_stage_after TEXT,
  follow_up_at TIMESTAMPTZ,
  follow_up_priority TEXT DEFAULT 'normal',
  vertical_id UUID REFERENCES public.business_verticals(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_call_logs_agent ON public.call_logs(agent_id);
CREATE INDEX idx_call_logs_lead_phone ON public.call_logs(lead_phone);
CREATE INDEX idx_call_logs_follow_up ON public.call_logs(follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX idx_call_logs_vertical ON public.call_logs(vertical_id);
CREATE INDEX idx_call_logs_created ON public.call_logs(created_at DESC);
CREATE INDEX idx_call_logs_disposition ON public.call_logs(disposition);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Agents can view their own call logs
CREATE POLICY "Agents view own calls"
  ON public.call_logs FOR SELECT
  USING (auth.uid() = agent_id OR public.is_admin(auth.uid()));

-- Agents can insert their own call logs
CREATE POLICY "Agents create calls"
  ON public.call_logs FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

-- Agents can update their own call logs
CREATE POLICY "Agents update own calls"
  ON public.call_logs FOR UPDATE
  USING (auth.uid() = agent_id OR public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_call_logs_updated_at
  BEFORE UPDATE ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Calling Queue View: prioritized leads needing calls
CREATE OR REPLACE VIEW public.calling_queue AS
SELECT 
  cl.id as last_call_id,
  cl.lead_phone,
  cl.lead_name,
  cl.lead_type,
  cl.lead_id,
  cl.disposition as last_disposition,
  cl.follow_up_at,
  cl.follow_up_priority,
  cl.vertical_id,
  cl.agent_id,
  cl.created_at as last_called_at,
  cl.notes as last_notes,
  CASE
    WHEN cl.follow_up_priority = 'hot' THEN 1
    WHEN cl.follow_up_priority = 'high' THEN 2
    WHEN cl.follow_up_at <= now() THEN 3
    WHEN cl.follow_up_priority = 'normal' THEN 4
    ELSE 5
  END as queue_priority
FROM public.call_logs cl
INNER JOIN (
  SELECT lead_phone, MAX(created_at) as max_created
  FROM public.call_logs
  GROUP BY lead_phone
) latest ON cl.lead_phone = latest.lead_phone AND cl.created_at = latest.max_created
WHERE cl.follow_up_at IS NOT NULL
ORDER BY queue_priority, cl.follow_up_at ASC;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;
