
-- STEP 2: Lock rule tables with validation triggers (not CHECK for safety)
CREATE OR REPLACE FUNCTION public.validate_payout_rule_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.payout_type NOT IN ('manual','percentage','fixed_amount','slab') THEN
    RAISE EXCEPTION 'Invalid payout_type: %. Must be manual, percentage, fixed_amount, or slab.', NEW.payout_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_payout_rule_type_trg
  BEFORE INSERT OR UPDATE ON public.dealer_payout_rules
  FOR EACH ROW EXECUTE FUNCTION public.validate_payout_rule_type();

CREATE OR REPLACE FUNCTION public.validate_commission_rule_type()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.commission_type NOT IN ('percentage','fixed_amount','slab') THEN
    RAISE EXCEPTION 'Invalid commission_type: %. Must be percentage, fixed_amount, or slab.', NEW.commission_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_commission_rule_type_trg
  BEFORE INSERT OR UPDATE ON public.commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.validate_commission_rule_type();

-- STEP 3: Performance indexes
CREATE INDEX IF NOT EXISTS idx_deals_tenant_vertical ON public.deals (tenant_id, vertical_name);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_status ON public.deals (tenant_id, deal_status);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_payment_status ON public.deals (tenant_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_month ON public.expenses (tenant_id, month_year);

-- STEP 4: Monthly snapshot table
CREATE TABLE IF NOT EXISTS public.monthly_financial_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vertical_name TEXT NOT NULL,
    month_year TEXT NOT NULL,
    total_deal_value NUMERIC DEFAULT 0,
    total_dealer_payout NUMERIC DEFAULT 0,
    total_revenue_margin NUMERIC DEFAULT 0,
    total_commission NUMERIC DEFAULT 0,
    total_expenses NUMERIC DEFAULT 0,
    net_profit NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (tenant_id, vertical_name, month_year)
);

ALTER TABLE public.monthly_financial_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for snapshots" ON public.monthly_financial_snapshots
  FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- STEP 5: Auto payment status trigger
CREATE OR REPLACE FUNCTION public.update_payment_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
    IF NEW.payment_received_amount IS NULL OR NEW.payment_received_amount = 0 THEN
        NEW.payment_status := 'pending';
    ELSIF NEW.deal_value IS NOT NULL AND NEW.payment_received_amount < NEW.deal_value THEN
        NEW.payment_status := 'partial';
    ELSE
        NEW.payment_status := 'received';
        IF NEW.closed_at IS NULL THEN
            NEW.closed_at := now();
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_payment_status ON public.deals;
CREATE TRIGGER trg_update_payment_status
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_payment_status();

-- STEP 6: Financial summary view
CREATE OR REPLACE VIEW public.tenant_financial_summary AS
SELECT
    tenant_id,
    vertical_name,
    SUM(deal_value) AS total_deal_value,
    SUM(dealer_payout) AS total_dealer_payout,
    SUM(revenue_margin) AS total_revenue_margin,
    SUM(commission_amount) AS total_commission
FROM public.deals
WHERE deal_status != 'cancelled'
GROUP BY tenant_id, vertical_name;
