-- 1. Categories table
CREATE TABLE public.corporate_expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  is_standard BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.corporate_expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view categories"
  ON public.corporate_expense_categories FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.corporate_expense_categories FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 2. Master budgets
CREATE TABLE public.corporate_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  period_type TEXT NOT NULL DEFAULT 'monthly', -- monthly/quarterly/yearly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_planned NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_actual NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft/pending_approval/approved/rejected/active/closed
  submitted_by UUID,
  submitted_by_name TEXT,
  submitted_at TIMESTAMPTZ,
  approved_by UUID,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.corporate_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view budgets"
  ON public.corporate_budgets FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage budgets"
  ON public.corporate_budgets FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_corp_budgets_status ON public.corporate_budgets(status);
CREATE INDEX idx_corp_budgets_period ON public.corporate_budgets(period_start, period_end);

-- 3. Budget line items (category x vertical x department breakdown)
CREATE TABLE public.corporate_budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.corporate_budgets(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.corporate_expense_categories(id),
  category_name TEXT NOT NULL,
  vertical TEXT, -- Insurance/CarSales/Loans/HSRP/Rental/Accessories/General/All
  department TEXT, -- HR/Ops/Tech/Finance/Marketing/Sales/All
  planned_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.corporate_budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view budget lines"
  ON public.corporate_budget_lines FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage budget lines"
  ON public.corporate_budget_lines FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_corp_budget_lines_budget ON public.corporate_budget_lines(budget_id);

-- 4. Approval audit log
CREATE TABLE public.corporate_budget_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.corporate_budgets(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- submitted/approved/rejected/revised/closed
  actor_id UUID,
  actor_name TEXT,
  previous_status TEXT,
  new_status TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.corporate_budget_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view approval log"
  ON public.corporate_budget_approvals FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can write approval log"
  ON public.corporate_budget_approvals FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_corp_budget_approvals_budget ON public.corporate_budget_approvals(budget_id);

-- Triggers for updated_at
CREATE TRIGGER trg_corp_categories_upd BEFORE UPDATE ON public.corporate_expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_corp_budgets_upd BEFORE UPDATE ON public.corporate_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_corp_budget_lines_upd BEFORE UPDATE ON public.corporate_budget_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed standard categories
INSERT INTO public.corporate_expense_categories (name, icon, color, is_standard, sort_order) VALUES
  ('Marketing', '📢', '#f59e0b', true, 1),
  ('Salaries', '💰', '#10b981', true, 2),
  ('Rent', '🏢', '#6366f1', true, 3),
  ('Advertisement', '🎯', '#ec4899', true, 4),
  ('Utilities', '⚡', '#06b6d4', true, 5),
  ('Software', '💻', '#8b5cf6', true, 6),
  ('Travel', '✈️', '#f97316', true, 7),
  ('Office Supplies', '📦', '#64748b', true, 8),
  ('Miscellaneous', '📌', '#94a3b8', true, 9);