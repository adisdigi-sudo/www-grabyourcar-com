-- Sessions table
CREATE TABLE IF NOT EXISTS public.riya_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT NOT NULL UNIQUE,
  agent_name TEXT,
  visitor_name TEXT,
  visitor_phone TEXT,
  visitor_city TEXT,
  vertical_interest TEXT,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_count INTEGER NOT NULL DEFAULT 0,
  lead_captured BOOLEAN NOT NULL DEFAULT false,
  lead_id TEXT,
  user_agent TEXT,
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_riya_chat_sessions_last_message_at
  ON public.riya_chat_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_riya_chat_sessions_session_key
  ON public.riya_chat_sessions(session_key);

-- Messages table
CREATE TABLE IF NOT EXISTS public.riya_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.riya_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_riya_chat_messages_session_id
  ON public.riya_chat_messages(session_id, created_at);

-- Enable RLS
ALTER TABLE public.riya_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riya_chat_messages ENABLE ROW LEVEL SECURITY;

-- Admins can read everything
CREATE POLICY "Admins can read chat sessions"
  ON public.riya_chat_sessions FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can read chat messages"
  ON public.riya_chat_messages FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Public chatbot writes via service role only — but allow anon insert as a fallback
CREATE POLICY "Anyone can insert chat sessions"
  ON public.riya_chat_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update chat sessions"
  ON public.riya_chat_sessions FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can insert chat messages"
  ON public.riya_chat_messages FOR INSERT
  WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER trg_riya_chat_sessions_updated_at
  BEFORE UPDATE ON public.riya_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.riya_chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.riya_chat_messages;
ALTER TABLE public.riya_chat_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.riya_chat_messages REPLICA IDENTITY FULL;