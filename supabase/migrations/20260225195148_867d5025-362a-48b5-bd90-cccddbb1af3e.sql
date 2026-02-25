
-- 1) dealer_payout_rules
CREATE TABLE public.dealer_payout_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  vertical_name TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  payout_type TEXT NOT NULL DEFAULT 'fixed',
  base_amount NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  slab_config JSONB,
  conditions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) commission_rules
CREATE TABLE public.commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  vertical_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'executive',
  rule_name TEXT NOT NULL,
  commission_type TEXT NOT NULL DEFAULT 'fixed',
  base_amount NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  slab_config JSONB,
  conditions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) deals
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  customer_id UUID NOT NULL REFERENCES public.master_customers(id),
  vertical_name TEXT NOT NULL,
  deal_number TEXT,
  deal_status TEXT NOT NULL DEFAULT 'open',
  deal_value NUMERIC DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  dealer_payout NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  payout_rule_id UUID REFERENCES public.dealer_payout_rules(id),
  commission_rule_id UUID REFERENCES public.commission_rules(id),
  assigned_to UUID,
  closed_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  vertical_name TEXT NOT NULL,
  expense_type TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  month_year TEXT,
  approved_by UUID,
  receipt_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-populate month_year on insert/update
CREATE OR REPLACE FUNCTION public.set_expense_month_year()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.month_year := to_char(NEW.expense_date, 'YYYY-MM');
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_expenses_month_year BEFORE INSERT OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_expense_month_year();

-- Indexes
CREATE INDEX idx_dealer_payout_rules_tenant_vertical ON public.dealer_payout_rules(tenant_id, vertical_name);
CREATE INDEX idx_commission_rules_tenant_vertical ON public.commission_rules(tenant_id, vertical_name);
CREATE INDEX idx_deals_tenant_vertical ON public.deals(tenant_id, vertical_name);
CREATE INDEX idx_deals_tenant_month ON public.deals(tenant_id, created_at);
CREATE INDEX idx_deals_customer ON public.deals(customer_id);
CREATE INDEX idx_deals_status ON public.deals(deal_status);
CREATE INDEX idx_expenses_tenant_vertical ON public.expenses(tenant_id, vertical_name);
CREATE INDEX idx_expenses_tenant_month ON public.expenses(tenant_id, month_year);

-- RLS
ALTER TABLE public.dealer_payout_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON public.dealer_payout_rules FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant isolation" ON public.commission_rules FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant isolation" ON public.deals FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant isolation" ON public.expenses FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Updated_at triggers
CREATE TRIGGER update_dealer_payout_rules_updated_at BEFORE UPDATE ON public.dealer_payout_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_commission_rules_updated_at BEFORE UPDATE ON public.commission_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
