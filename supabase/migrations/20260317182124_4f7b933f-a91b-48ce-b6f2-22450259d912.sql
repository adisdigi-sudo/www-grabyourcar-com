
-- ══════════════════════════════════════════════════════════════
-- INCENTIVE MANAGEMENT SYSTEM
-- ══════════════════════════════════════════════════════════════

-- 1. Incentive Rule Configuration (Super Admin configures per vertical)
CREATE TABLE IF NOT EXISTS public.incentive_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_name TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed', 'slab', 'percentage', 'bank_wise'
  role_applicable TEXT NOT NULL DEFAULT 'employee', -- 'employee', 'manager', 'all'
  -- Fixed incentive
  fixed_amount NUMERIC DEFAULT 0,
  -- Percentage based
  percentage NUMERIC DEFAULT 0,
  percentage_of TEXT DEFAULT 'deal_value', -- 'deal_value', 'premium', 'loan_amount', 'team_total'
  -- Slab configuration: [{min: 1, max: 5, amount: 1000}, {min: 6, max: 10, amount: 2000}]
  slab_config JSONB DEFAULT '[]'::jsonb,
  -- Bank-wise config: [{bank: "SBI", amount: 1500}, {bank: "HDFC", amount: 2000}]
  bank_wise_config JSONB DEFAULT '[]'::jsonb,
  -- Manager override
  manager_bonus_type TEXT DEFAULT 'target_based', -- 'percentage_override', 'target_based'
  manager_bonus_config JSONB DEFAULT '{}'::jsonb,
  -- Conditions
  conditions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Monthly Targets per team member
CREATE TABLE IF NOT EXISTS public.incentive_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  vertical_name TEXT NOT NULL,
  month_year TEXT NOT NULL, -- '2026-03'
  target_count INTEGER DEFAULT 0,
  target_value NUMERIC DEFAULT 0,
  achieved_count INTEGER DEFAULT 0,
  achieved_value NUMERIC DEFAULT 0,
  achievement_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, vertical_name, month_year)
);

-- 3. Individual Incentive Entries (per deal/policy/loan)
CREATE TABLE IF NOT EXISTS public.incentive_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  vertical_name TEXT NOT NULL,
  month_year TEXT NOT NULL,
  deal_reference TEXT, -- deal id / policy number / loan id
  deal_description TEXT,
  deal_value NUMERIC DEFAULT 0,
  incentive_amount NUMERIC DEFAULT 0,
  rule_id UUID REFERENCES public.incentive_rules(id),
  calculation_details JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'rejected'
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Monthly Incentive Summary (auto-aggregated)
CREATE TABLE IF NOT EXISTS public.incentive_monthly_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  role TEXT DEFAULT 'employee',
  vertical_name TEXT NOT NULL,
  month_year TEXT NOT NULL,
  total_deals INTEGER DEFAULT 0,
  total_deal_value NUMERIC DEFAULT 0,
  base_incentive NUMERIC DEFAULT 0,
  slab_bonus NUMERIC DEFAULT 0,
  manager_bonus NUMERIC DEFAULT 0,
  special_bonus NUMERIC DEFAULT 0,
  total_incentive NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'calculated', -- 'calculated', 'approved', 'sent_to_accounts', 'paid'
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  sent_to_accounts_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  super_admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, vertical_name, month_year)
);

-- 5. Manager bonus tracking
CREATE TABLE IF NOT EXISTS public.manager_bonus_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_name TEXT NOT NULL,
  vertical_name TEXT NOT NULL,
  month_year TEXT NOT NULL,
  team_total_deals INTEGER DEFAULT 0,
  team_total_value NUMERIC DEFAULT 0,
  team_target INTEGER DEFAULT 0,
  team_achievement_pct NUMERIC DEFAULT 0,
  bonus_amount NUMERIC DEFAULT 0,
  bonus_config JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'calculated',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(manager_user_id, vertical_name, month_year)
);

-- Enable RLS
ALTER TABLE public.incentive_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_monthly_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_bonus_tracking ENABLE ROW LEVEL SECURITY;

-- RLS: Rules - admin only manage, all authenticated read
CREATE POLICY "Admin manage incentive rules" ON public.incentive_rules FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Auth users read incentive rules" ON public.incentive_rules FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS: Targets - own or admin
CREATE POLICY "Users see own targets" ON public.incentive_targets FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admin manage targets" ON public.incentive_targets FOR ALL USING (public.is_admin(auth.uid()));

-- RLS: Entries - own or admin
CREATE POLICY "Users see own entries" ON public.incentive_entries FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admin manage entries" ON public.incentive_entries FOR ALL USING (public.is_admin(auth.uid()));

-- RLS: Summary - own or admin
CREATE POLICY "Users see own summary" ON public.incentive_monthly_summary FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admin manage summary" ON public.incentive_monthly_summary FOR ALL USING (public.is_admin(auth.uid()));

-- RLS: Manager bonus - own or admin
CREATE POLICY "Managers see own bonus" ON public.manager_bonus_tracking FOR SELECT USING (auth.uid() = manager_user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admin manage manager bonus" ON public.manager_bonus_tracking FOR ALL USING (public.is_admin(auth.uid()));

-- Seed default incentive rules
INSERT INTO public.incentive_rules (vertical_name, rule_name, rule_type, role_applicable, fixed_amount, slab_config, conditions) VALUES
-- Car Sales: Fixed per delivery + Slab
('car_sales', 'Per Delivery Incentive', 'fixed', 'employee', 2000, '[]', '{"requires_feedback": true}'),
('car_sales', 'Monthly Slab Bonus', 'slab', 'employee', 0, '[{"min":1,"max":5,"amount":1000},{"min":6,"max":10,"amount":2000},{"min":11,"max":999,"amount":3000}]', '{}'),
-- Insurance: Fixed per policy + Slab
('insurance', 'Per Policy Incentive (New)', 'fixed', 'employee', 500, '[]', '{"policy_type":"new"}'),
('insurance', 'Per Policy Incentive (Renewal)', 'fixed', 'employee', 300, '[]', '{"policy_type":"renewal"}'),
('insurance', 'Monthly Policy Slab', 'slab', 'employee', 0, '[{"min":1,"max":10,"amount":300},{"min":11,"max":25,"amount":500},{"min":26,"max":999,"amount":800}]', '{}'),
-- Loans: Bank-wise
('car_loans', 'Bank-wise Loan Incentive', 'bank_wise', 'employee', 0, '[]', '{}'),
-- Manager bonuses
('car_sales', 'Sales Manager Team Bonus', 'slab', 'manager', 0, '[{"min":80,"max":99,"amount":5000},{"min":100,"max":120,"amount":10000},{"min":121,"max":999,"amount":15000}]', '{"type":"target_achievement_pct"}'),
('insurance', 'Insurance Manager Team Bonus', 'slab', 'manager', 0, '[{"min":80,"max":99,"amount":3000},{"min":100,"max":120,"amount":7000},{"min":121,"max":999,"amount":12000}]', '{"type":"target_achievement_pct"}'),
('car_loans', 'Loan Manager Team Bonus', 'slab', 'manager', 0, '[{"min":80,"max":99,"amount":4000},{"min":100,"max":120,"amount":8000},{"min":121,"max":999,"amount":14000}]', '{"type":"target_achievement_pct"}');

-- Update bank-wise config for loans
UPDATE public.incentive_rules SET bank_wise_config = '[{"bank":"SBI","amount":1500},{"bank":"HDFC","amount":2000},{"bank":"ICICI","amount":1800},{"bank":"Bank of Baroda","amount":1200},{"bank":"Axis","amount":1600},{"bank":"Kotak","amount":1700},{"bank":"PNB","amount":1000},{"bank":"Other","amount":1000}]' WHERE vertical_name = 'car_loans' AND rule_type = 'bank_wise';
