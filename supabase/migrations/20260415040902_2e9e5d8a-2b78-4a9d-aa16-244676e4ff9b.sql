
-- Add hard test fields to hr_recruitment
ALTER TABLE public.hr_recruitment
  ADD COLUMN IF NOT EXISTS test_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS test_score numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS test_max_score numeric DEFAULT 100,
  ADD COLUMN IF NOT EXISTS test_passed boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS test_notes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS test_taken_at timestamp with time zone DEFAULT NULL;

-- Monthly attendance aggregation table (from employee_sessions)
CREATE TABLE IF NOT EXISTS public.employee_monthly_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_user_id uuid NOT NULL,
  employee_name text,
  month_year text NOT NULL,
  total_login_days integer DEFAULT 0,
  total_active_seconds bigint DEFAULT 0,
  total_idle_seconds bigint DEFAULT 0,
  total_break_seconds bigint DEFAULT 0,
  late_count integer DEFAULT 0,
  half_day_count integer DEFAULT 0,
  absent_days integer DEFAULT 0,
  effective_working_days numeric(5,2) DEFAULT 0,
  overtime_hours numeric(6,2) DEFAULT 0,
  avg_login_time time,
  avg_logout_time time,
  total_working_days integer DEFAULT 26,
  shift_hours numeric(4,2) DEFAULT 9,
  per_day_salary numeric(10,2) DEFAULT 0,
  salary_earned numeric(10,2) DEFAULT 0,
  deduction_amount numeric(10,2) DEFAULT 0,
  synced_to_payroll boolean DEFAULT false,
  synced_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(employee_user_id, month_year)
);

ALTER TABLE public.employee_monthly_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage monthly attendance"
  ON public.employee_monthly_attendance FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_employee_monthly_attendance_updated_at
  BEFORE UPDATE ON public.employee_monthly_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
