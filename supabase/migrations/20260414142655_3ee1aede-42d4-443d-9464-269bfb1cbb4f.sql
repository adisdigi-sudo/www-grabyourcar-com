
-- KPI Metrics: measurable output per employee per month
CREATE TABLE public.employee_kpi_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT,
  employee_name TEXT NOT NULL,
  designation TEXT NOT NULL DEFAULT '',
  vertical_name TEXT NOT NULL DEFAULT '',
  metric_name TEXT NOT NULL,
  target_value NUMERIC NOT NULL DEFAULT 0,
  achieved_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'count',
  score NUMERIC GENERATED ALWAYS AS (
    CASE WHEN target_value > 0 THEN ROUND((achieved_value / target_value) * 100, 1) ELSE 0 END
  ) STORED,
  month_year TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_kpi_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view kpi metrics" ON public.employee_kpi_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage kpi metrics" ON public.employee_kpi_metrics FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- KRA Definitions: role-based accountability areas
CREATE TABLE public.employee_kra_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  designation TEXT NOT NULL,
  vertical_name TEXT NOT NULL DEFAULT '',
  kra_name TEXT NOT NULL,
  description TEXT,
  weightage_pct NUMERIC NOT NULL DEFAULT 0,
  evaluation_criteria TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_kra_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view kra defs" ON public.employee_kra_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage kra defs" ON public.employee_kra_definitions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- KSA Scores: knowledge, skills, attitude evaluation
CREATE TABLE public.employee_ksa_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT,
  employee_name TEXT NOT NULL,
  designation TEXT NOT NULL DEFAULT '',
  vertical_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'knowledge',
  attribute_name TEXT NOT NULL,
  max_score NUMERIC NOT NULL DEFAULT 10,
  scored_value NUMERIC NOT NULL DEFAULT 0,
  evaluator_name TEXT,
  evaluator_notes TEXT,
  evaluation_period TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_ksa_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view ksa scores" ON public.employee_ksa_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ksa scores" ON public.employee_ksa_scores FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_kpi_month ON public.employee_kpi_metrics(month_year);
CREATE INDEX idx_kpi_employee ON public.employee_kpi_metrics(employee_name);
CREATE INDEX idx_kra_designation ON public.employee_kra_definitions(designation);
CREATE INDEX idx_ksa_employee ON public.employee_ksa_scores(employee_name);
CREATE INDEX idx_ksa_period ON public.employee_ksa_scores(evaluation_period);
