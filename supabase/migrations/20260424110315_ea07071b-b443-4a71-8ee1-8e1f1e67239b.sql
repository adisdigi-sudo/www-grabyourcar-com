-- Visitor analytics tables
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_key TEXT NOT NULL UNIQUE,
  visitor_id TEXT NOT NULL,
  source TEXT,
  medium TEXT,
  campaign TEXT,
  referrer TEXT,
  landing_page TEXT,
  exit_page TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  page_count INTEGER NOT NULL DEFAULT 0,
  total_time_seconds INTEGER NOT NULL DEFAULT 0,
  is_bounced BOOLEAN NOT NULL DEFAULT true,
  captured_phone TEXT,
  captured_email TEXT,
  captured_name TEXT,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_started ON public.visitor_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_active ON public.visitor_sessions(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_source ON public.visitor_sessions(source);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_visitor ON public.visitor_sessions(visitor_id);

CREATE TABLE IF NOT EXISTS public.visitor_page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_key TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  scroll_depth INTEGER NOT NULL DEFAULT 0,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_session ON public.visitor_page_views(session_key);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON public.visitor_page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_entered ON public.visitor_page_views(entered_at DESC);

CREATE TABLE IF NOT EXISTS public.visitor_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  page_path TEXT,
  event_label TEXT,
  event_value TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_session ON public.visitor_events(session_key);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.visitor_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON public.visitor_events(created_at DESC);

CREATE TABLE IF NOT EXISTS public.visitor_captured_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_key TEXT NOT NULL,
  visitor_id TEXT,
  name TEXT,
  phone TEXT,
  email TEXT,
  message TEXT,
  capture_source TEXT NOT NULL,
  capture_page TEXT,
  source TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  pages_viewed INTEGER,
  time_on_site_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_captured_leads_phone ON public.visitor_captured_leads(phone);
CREATE INDEX IF NOT EXISTS idx_captured_leads_created ON public.visitor_captured_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_captured_leads_source ON public.visitor_captured_leads(capture_source);

-- Enable RLS
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_captured_leads ENABLE ROW LEVEL SECURITY;

-- Public can insert (anonymous tracking)
CREATE POLICY "Public can insert visitor sessions"
  ON public.visitor_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update own session by key"
  ON public.visitor_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can insert page views"
  ON public.visitor_page_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update page views"
  ON public.visitor_page_views FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can insert events"
  ON public.visitor_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can insert captured leads"
  ON public.visitor_captured_leads FOR INSERT
  WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins read visitor sessions"
  ON public.visitor_sessions FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins read page views"
  ON public.visitor_page_views FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins read events"
  ON public.visitor_events FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins read captured leads"
  ON public.visitor_captured_leads FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete sessions"
  ON public.visitor_sessions FOR DELETE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete leads"
  ON public.visitor_captured_leads FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_visitor_sessions_updated_at
  BEFORE UPDATE ON public.visitor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();