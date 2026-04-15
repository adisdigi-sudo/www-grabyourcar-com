
-- 1. Employee profiles
CREATE TABLE public.employee_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  team_member_id text,
  full_name text NOT NULL,
  email text,
  phone text,
  designation text,
  department text,
  role text DEFAULT 'employee',
  manager_user_id uuid REFERENCES auth.users(id),
  manager_name text,
  vertical_id uuid,
  vertical_name text,
  monthly_ctc numeric DEFAULT 0,
  basic_salary numeric DEFAULT 0,
  hra numeric DEFAULT 0,
  da numeric DEFAULT 0,
  special_allowance numeric DEFAULT 0,
  pf_deduction numeric DEFAULT 0,
  esi_deduction numeric DEFAULT 0,
  professional_tax numeric DEFAULT 0,
  tds numeric DEFAULT 0,
  joining_date date,
  probation_end_date date,
  employment_type text DEFAULT 'full_time',
  working_days_per_month integer DEFAULT 26,
  shift_start time DEFAULT '09:00',
  shift_end time DEFAULT '18:00',
  grace_minutes integer DEFAULT 15,
  is_active boolean DEFAULT true,
  onboarded_by uuid,
  onboarded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Alter existing employee_documents
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS employee_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS month_year text;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS generated_data jsonb;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS uploaded_by uuid;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS is_signed boolean DEFAULT false;
ALTER TABLE public.employee_documents ADD COLUMN IF NOT EXISTS signed_at timestamp with time zone;

-- 3. Monthly salary calculations
CREATE TABLE public.employee_salary_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  month_year text NOT NULL,
  monthly_ctc numeric DEFAULT 0,
  basic_salary numeric DEFAULT 0,
  hra numeric DEFAULT 0,
  da numeric DEFAULT 0,
  special_allowance numeric DEFAULT 0,
  gross_salary numeric DEFAULT 0,
  total_working_days integer DEFAULT 26,
  days_present integer DEFAULT 0,
  days_absent integer DEFAULT 0,
  half_days integer DEFAULT 0,
  late_count integer DEFAULT 0,
  late_deduction numeric DEFAULT 0,
  leave_deduction numeric DEFAULT 0,
  pf_deduction numeric DEFAULT 0,
  esi_deduction numeric DEFAULT 0,
  professional_tax numeric DEFAULT 0,
  tds numeric DEFAULT 0,
  other_deductions numeric DEFAULT 0,
  total_deductions numeric DEFAULT 0,
  incentive_amount numeric DEFAULT 0,
  bonus_amount numeric DEFAULT 0,
  net_salary numeric DEFAULT 0,
  payment_status text DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamp with time zone,
  paid_at timestamp with time zone,
  calculation_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(employee_user_id, month_year)
);

-- 4. Employee tickets
CREATE TABLE public.employee_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL DEFAULT ('TKT-' || to_char(now(), 'YYYYMMDD') || '-' || substring(gen_random_uuid()::text, 1, 6)),
  employee_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  ticket_type text NOT NULL,
  subject text NOT NULL,
  description text,
  priority text DEFAULT 'medium',
  status text DEFAULT 'pending',
  leave_type text,
  leave_start_date date,
  leave_end_date date,
  leave_days numeric,
  manager_user_id uuid,
  manager_name text,
  manager_action text,
  manager_action_at timestamp with time zone,
  manager_remarks text,
  hr_user_id uuid,
  hr_action text,
  hr_action_at timestamp with time zone,
  hr_remarks text,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. RLS
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ep_admin" ON public.employee_profiles FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "ep_self" ON public.employee_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ep_manager" ON public.employee_profiles FOR SELECT USING (auth.uid() = manager_user_id);

CREATE POLICY "ed_admin" ON public.employee_documents FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "ed_self" ON public.employee_documents FOR SELECT USING (auth.uid() = employee_user_id);

CREATE POLICY "esr_admin" ON public.employee_salary_records FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "esr_self" ON public.employee_salary_records FOR SELECT USING (auth.uid() = employee_user_id);

CREATE POLICY "et_insert" ON public.employee_tickets FOR INSERT WITH CHECK (auth.uid() = employee_user_id);
CREATE POLICY "et_self" ON public.employee_tickets FOR SELECT USING (auth.uid() = employee_user_id);
CREATE POLICY "et_mgr_sel" ON public.employee_tickets FOR SELECT USING (auth.uid() = manager_user_id);
CREATE POLICY "et_mgr_upd" ON public.employee_tickets FOR UPDATE USING (auth.uid() = manager_user_id);
CREATE POLICY "et_admin" ON public.employee_tickets FOR ALL USING (public.is_admin(auth.uid()));

-- 6. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_salary_records;
