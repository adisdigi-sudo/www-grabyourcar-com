
-- Employee session tracking: login, logout, breaks, screen time
CREATE TABLE public.employee_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  user_name text,
  vertical_name text,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  login_at timestamptz NOT NULL DEFAULT now(),
  logout_at timestamptz,
  total_active_seconds integer DEFAULT 0,
  total_idle_seconds integer DEFAULT 0,
  total_break_seconds integer DEFAULT 0,
  break_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  last_heartbeat_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.employee_sessions ENABLE ROW LEVEL SECURITY;

-- Employees see own sessions, admins see all
CREATE POLICY "Users see own sessions" ON public.employee_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users insert own sessions" ON public.employee_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own sessions" ON public.employee_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Admins can update any
CREATE POLICY "Admins update all sessions" ON public.employee_sessions
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Employee inactivity / absence logs for HR
CREATE TABLE public.employee_absence_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  user_name text,
  vertical_name text,
  absence_type text NOT NULL DEFAULT 'not_logged_in',
  absence_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  auto_detected boolean DEFAULT true,
  notified_hr boolean DEFAULT false,
  notified_admin boolean DEFAULT false,
  acknowledged_by text,
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.employee_absence_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own absences" ON public.employee_absence_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "System inserts absences" ON public.employee_absence_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins update absences" ON public.employee_absence_logs
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Enable realtime for sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_absence_logs;
