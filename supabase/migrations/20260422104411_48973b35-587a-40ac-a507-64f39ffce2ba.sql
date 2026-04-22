
-- ============================================
-- BUDGET-TO-PROFIT ENGINE
-- ============================================

-- 1. Marketing Budgets (top-level plan)
CREATE TABLE IF NOT EXISTS public.marketing_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_name TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly', -- monthly, quarterly, yearly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  month_year TEXT, -- YYYY-MM for quick filter
  total_budget NUMERIC NOT NULL DEFAULT 0,
  total_allocated NUMERIC NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  expected_leads INTEGER DEFAULT 0,
  expected_closures INTEGER DEFAULT 0,
  expected_revenue NUMERIC DEFAULT 0,
  actual_leads INTEGER DEFAULT 0,
  actual_closures INTEGER DEFAULT 0,
  actual_revenue NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, closed
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Budget Allocations (per channel split)
CREATE TABLE IF NOT EXISTS public.budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.marketing_budgets(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- whatsapp_meta, google_ads, meta_ads, data_purchase, sms, email, influencer, other
  channel_label TEXT,
  allocated_amount NUMERIC NOT NULL DEFAULT 0,
  spent_amount NUMERIC NOT NULL DEFAULT 0,
  expected_leads INTEGER DEFAULT 0,
  expected_closures INTEGER DEFAULT 0,
  expected_revenue NUMERIC DEFAULT 0,
  actual_leads INTEGER DEFAULT 0,
  actual_closures INTEGER DEFAULT 0,
  actual_revenue NUMERIC DEFAULT 0,
  target_vertical TEXT, -- car_sales, insurance, loans, hsrp, rental, etc.
  cost_per_message NUMERIC, -- for whatsapp/sms
  expected_volume INTEGER, -- e.g. 10000 messages, 80 clicks
  notes TEXT,
  ai_suggestion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Daily Marketing Spend (day-by-day actuals)
CREATE TABLE IF NOT EXISTS public.daily_marketing_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id UUID REFERENCES public.budget_allocations(id) ON DELETE SET NULL,
  budget_id UUID REFERENCES public.marketing_budgets(id) ON DELETE CASCADE,
  spend_date DATE NOT NULL DEFAULT CURRENT_DATE,
  channel TEXT NOT NULL,
  vertical TEXT,
  spent_amount NUMERIC NOT NULL DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  closures INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  cost_per_lead NUMERIC,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_spend_date ON public.daily_marketing_spend(spend_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_spend_budget ON public.daily_marketing_spend(budget_id);

-- 4. Vertical Targets (per-vertical period targets)
CREATE TABLE IF NOT EXISTS public.vertical_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_name TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly',
  month_year TEXT NOT NULL, -- YYYY-MM
  target_leads INTEGER DEFAULT 0,
  target_closures INTEGER DEFAULT 0,
  target_revenue NUMERIC DEFAULT 0,
  achieved_leads INTEGER DEFAULT 0,
  achieved_closures INTEGER DEFAULT 0,
  achieved_revenue NUMERIC DEFAULT 0,
  budget_id UUID REFERENCES public.marketing_budgets(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vertical_name, month_year)
);

-- 5. Employee Targets (per-person monthly targets)
CREATE TABLE IF NOT EXISTS public.employee_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  employee_name TEXT NOT NULL,
  vertical_name TEXT NOT NULL,
  month_year TEXT NOT NULL,
  target_leads INTEGER DEFAULT 0,
  target_closures INTEGER DEFAULT 0,
  target_revenue NUMERIC DEFAULT 0,
  achieved_leads INTEGER DEFAULT 0,
  achieved_closures INTEGER DEFAULT 0,
  achieved_revenue NUMERIC DEFAULT 0,
  achievement_pct NUMERIC DEFAULT 0,
  incentive_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, vertical_name, month_year)
);

-- 6. Incentive Rules (slab-based commission)
CREATE TABLE IF NOT EXISTS public.budget_incentive_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  vertical_name TEXT NOT NULL,
  applies_to TEXT NOT NULL DEFAULT 'closures', -- leads, closures, revenue, achievement_pct
  slab_min NUMERIC NOT NULL,
  slab_max NUMERIC,
  incentive_type TEXT NOT NULL DEFAULT 'fixed', -- fixed, percentage
  incentive_amount NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Incentive Payouts (calculated payouts)
CREATE TABLE IF NOT EXISTS public.budget_incentive_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  employee_name TEXT NOT NULL,
  vertical_name TEXT NOT NULL,
  month_year TEXT NOT NULL,
  achieved_count NUMERIC DEFAULT 0,
  achieved_revenue NUMERIC DEFAULT 0,
  achievement_pct NUMERIC DEFAULT 0,
  rules_applied JSONB DEFAULT '[]'::jsonb,
  base_incentive NUMERIC DEFAULT 0,
  bonus_incentive NUMERIC DEFAULT 0,
  total_incentive NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'calculated', -- calculated, approved, paid, rejected
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Channel Performance (auto-aggregated)
CREATE TABLE IF NOT EXISTS public.channel_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,
  vertical_name TEXT,
  month_year TEXT NOT NULL,
  total_spend NUMERIC DEFAULT 0,
  total_leads INTEGER DEFAULT 0,
  total_closures INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  cost_per_lead NUMERIC DEFAULT 0,
  cost_per_closure NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  roi NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  is_profitable BOOLEAN DEFAULT false,
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel, vertical_name, month_year)
);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.marketing_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_marketing_spend ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_incentive_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_incentive_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_performance ENABLE ROW LEVEL SECURITY;

-- Admin/manager full access policies
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'marketing_budgets',
    'budget_allocations',
    'daily_marketing_spend',
    'vertical_targets',
    'employee_targets',
    'budget_incentive_rules',
    'budget_incentive_payouts',
    'channel_performance'
  ])
  LOOP
    EXECUTE format($f$
      CREATE POLICY "Admins manage %1$s"
        ON public.%1$I FOR ALL
        TO authenticated
        USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'manager'::app_role))
        WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'manager'::app_role));
    $f$, t);
  END LOOP;
END$$;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER trg_marketing_budgets_updated
  BEFORE UPDATE ON public.marketing_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_budget_allocations_updated
  BEFORE UPDATE ON public.budget_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_vertical_targets_updated
  BEFORE UPDATE ON public.vertical_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_employee_targets_updated
  BEFORE UPDATE ON public.employee_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_incentive_rules_updated
  BEFORE UPDATE ON public.budget_incentive_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_incentive_payouts_updated
  BEFORE UPDATE ON public.budget_incentive_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_channel_performance_updated
  BEFORE UPDATE ON public.channel_performance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-set month_year on marketing_budgets
CREATE OR REPLACE FUNCTION public.set_budget_month_year()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.month_year := to_char(NEW.period_start, 'YYYY-MM');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_budget_month_year
  BEFORE INSERT OR UPDATE ON public.marketing_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_budget_month_year();
