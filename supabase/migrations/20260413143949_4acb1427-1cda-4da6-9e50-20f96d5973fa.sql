
-- Add escalation tracking to ai_cofounder_tasks
ALTER TABLE public.ai_cofounder_tasks 
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalated_to TEXT,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_chain JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID,
  ADD COLUMN IF NOT EXISTS visibility_tier TEXT DEFAULT 'self';

-- Create employee_daily_reports table for tracking daily summaries
CREATE TABLE IF NOT EXISTS public.employee_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_name TEXT,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  report_type TEXT NOT NULL DEFAULT 'daily',
  leads_handled INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  follow_ups_done INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_pending INTEGER DEFAULT 0,
  tasks_overdue INTEGER DEFAULT 0,
  active_seconds INTEGER DEFAULT 0,
  idle_seconds INTEGER DEFAULT 0,
  break_seconds INTEGER DEFAULT 0,
  performance_score NUMERIC DEFAULT 0,
  summary TEXT,
  sent_to_email TEXT,
  sent_via_whatsapp BOOLEAN DEFAULT false,
  sent_via_email BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, report_date, report_type)
);

ALTER TABLE public.employee_daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage daily reports" ON public.employee_daily_reports
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own reports" ON public.employee_daily_reports
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
