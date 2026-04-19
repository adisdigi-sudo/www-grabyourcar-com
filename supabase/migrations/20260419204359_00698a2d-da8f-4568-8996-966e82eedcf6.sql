-- 1) Live takeover columns
ALTER TABLE public.riya_chat_sessions
  ADD COLUMN IF NOT EXISTS takeover_state text NOT NULL DEFAULT 'ai',
  ADD COLUMN IF NOT EXISTS assigned_agent_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_agent_name text,
  ADD COLUMN IF NOT EXISTS human_taken_over_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_visitor_message_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_riya_sessions_takeover ON public.riya_chat_sessions(takeover_state, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_riya_sessions_vertical ON public.riya_chat_sessions(vertical_interest, last_message_at DESC);

ALTER TABLE public.riya_chat_messages
  ADD COLUMN IF NOT EXISTS sender_name text,
  ADD COLUMN IF NOT EXISTS sender_id uuid;

-- 2) Bulk send job tracking
CREATE TABLE IF NOT EXISTS public.wa_bulk_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_name text,
  template_variables jsonb DEFAULT '[]'::jsonb,
  message_text text,
  message_type text DEFAULT 'template',
  media_url text,
  audience_source text NOT NULL DEFAULT 'manual',
  audience_filters jsonb DEFAULT '{}'::jsonb,
  total integer NOT NULL DEFAULT 0,
  sent integer NOT NULL DEFAULT 0,
  delivered integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  read_count integer NOT NULL DEFAULT 0,
  rate_per_minute integer NOT NULL DEFAULT 80,
  status text NOT NULL DEFAULT 'queued',
  cancel_requested boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wa_bulk_job_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.wa_bulk_jobs(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text,
  variables jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  wa_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_bulk_jobs_status ON public.wa_bulk_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_bulk_recipients_job ON public.wa_bulk_job_recipients(job_id, status);

ALTER TABLE public.wa_bulk_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_bulk_job_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth manage bulk jobs" ON public.wa_bulk_jobs;
CREATE POLICY "Auth manage bulk jobs" ON public.wa_bulk_jobs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Auth manage bulk recipients" ON public.wa_bulk_job_recipients;
CREATE POLICY "Auth manage bulk recipients" ON public.wa_bulk_job_recipients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_wa_bulk_jobs_updated_at
  BEFORE UPDATE ON public.wa_bulk_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();