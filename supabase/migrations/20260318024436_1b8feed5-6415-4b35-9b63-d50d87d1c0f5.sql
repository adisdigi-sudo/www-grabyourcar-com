
-- Document Vault: centralized document management
CREATE TABLE IF NOT EXISTS public.document_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  sub_category text,
  file_url text,
  file_name text,
  file_size text,
  file_type text,
  tags text[] DEFAULT '{}',
  folder_path text DEFAULT '/',
  related_entity_type text,
  related_entity_id text,
  uploaded_by text,
  is_template boolean DEFAULT false,
  vertical_name text,
  month_year text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.document_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage documents" ON public.document_vault
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own documents" ON public.document_vault
  FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid()::text OR related_entity_id = auth.uid()::text);

-- HR Templates
CREATE TABLE IF NOT EXISTS public.hr_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_type text NOT NULL,
  content text,
  variables text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.hr_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage HR templates" ON public.hr_templates
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- HR Onboarding Checklist
CREATE TABLE IF NOT EXISTS public.hr_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL,
  employee_name text NOT NULL,
  step_name text NOT NULL,
  step_order int DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.hr_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage onboarding" ON public.hr_onboarding
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- KPI Targets
CREATE TABLE IF NOT EXISTS public.kpi_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  employee_name text NOT NULL,
  vertical_name text,
  month_year text NOT NULL,
  target_deals int DEFAULT 0,
  target_revenue numeric DEFAULT 0,
  achieved_deals int DEFAULT 0,
  achieved_revenue numeric DEFAULT 0,
  kpi_score numeric DEFAULT 0,
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.kpi_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage KPIs" ON public.kpi_targets
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users view own KPIs" ON public.kpi_targets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

-- Incentive Payouts (approval workflow)
CREATE TABLE IF NOT EXISTS public.incentive_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  employee_name text NOT NULL,
  vertical_name text,
  month_year text NOT NULL,
  total_incentive numeric DEFAULT 0,
  bonus_amount numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  net_payout numeric DEFAULT 0,
  status text DEFAULT 'pending',
  approved_by text,
  approved_at timestamptz,
  paid_at timestamptz,
  payment_reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.incentive_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payouts" ON public.incentive_payouts
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users view own payouts" ON public.incentive_payouts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

-- Storage bucket for HR and finance documents
INSERT INTO storage.buckets (id, name, public) VALUES ('hr-documents', 'hr-documents', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Admins access hr docs" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'hr-documents' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'hr-documents' AND public.is_admin(auth.uid()));
