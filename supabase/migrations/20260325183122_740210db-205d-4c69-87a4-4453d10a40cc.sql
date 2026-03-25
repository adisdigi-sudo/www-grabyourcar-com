
-- Auto-Pilot configuration table
CREATE TABLE IF NOT EXISTS public.auto_pilot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL UNIQUE,
  agent_name text NOT NULL,
  description text,
  is_enabled boolean DEFAULT true,
  schedule_description text,
  recipient_type text DEFAULT 'founder',
  recipient_phones text[] DEFAULT '{}',
  config jsonb DEFAULT '{}',
  last_run_at timestamptz,
  last_run_status text,
  total_runs int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-Pilot execution logs
CREATE TABLE IF NOT EXISTS public.auto_pilot_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL,
  status text DEFAULT 'running',
  summary text,
  details jsonb,
  messages_sent int DEFAULT 0,
  error_message text,
  execution_time_ms int,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add quote_sent_at to leads if not exists
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS quote_sent_at timestamptz;

-- Enable RLS
ALTER TABLE public.auto_pilot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_pilot_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins manage auto_pilot_config" ON public.auto_pilot_config
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage auto_pilot_logs" ON public.auto_pilot_logs
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Update trigger
CREATE TRIGGER update_auto_pilot_config_updated_at
  BEFORE UPDATE ON public.auto_pilot_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default agents
INSERT INTO public.auto_pilot_config (agent_type, agent_name, description, schedule_description, recipient_type, recipient_phones, is_enabled) VALUES
  ('morning_briefing', '🌅 Morning Briefing', 'Sends personalized daily briefing to each team member with their tasks, stale leads, and targets at 9 AM IST', 'Daily at 9:00 AM IST', 'team', '{}', true),
  ('evening_report', '🌙 Evening Report', 'Sends founder a comprehensive day-end summary with leads, deals, revenue, and team performance at 7 PM IST', 'Daily at 7:00 PM IST', 'founder', ARRAY['9855924442'], true),
  ('stale_lead_checker', '🔔 Stale Lead Escalator', 'Every 4 hours, finds untouched leads and auto-assigns or sends escalation alerts', 'Every 4 hours', 'team', '{}', true),
  ('auto_quote', '📄 Auto Quote Generator', 'When a lead reaches interested stage, auto-generates and sends personalized quote via WhatsApp', 'Every 30 minutes', 'team', '{}', true),
  ('weekly_pl', '📊 Weekly P&L Report', 'Every Monday at 10 AM, generates comprehensive financial summary with AI insights', 'Every Monday at 10:00 AM IST', 'founder', ARRAY['9855924442'], true)
ON CONFLICT (agent_type) DO NOTHING;
