
-- Add new columns to deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS payout_type_used TEXT,
  ADD COLUMN IF NOT EXISTS payout_value_used NUMERIC,
  ADD COLUMN IF NOT EXISTS commission_type_used TEXT,
  ADD COLUMN IF NOT EXISTS commission_value_used NUMERIC,
  ADD COLUMN IF NOT EXISTS revenue_margin NUMERIC,
  ADD COLUMN IF NOT EXISTS payment_received_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Use validation trigger instead of CHECK for payment_status
CREATE OR REPLACE FUNCTION public.validate_deals_constraints()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_status NOT IN ('pending', 'partial', 'received') THEN
    RAISE EXCEPTION 'Invalid payment_status: %. Must be pending, partial, or received.', NEW.payment_status;
  END IF;
  IF NEW.deal_status NOT IN ('draft', 'active', 'cancelled', 'closed') THEN
    RAISE EXCEPTION 'Invalid deal_status: %. Must be draft, active, cancelled, or closed.', NEW.deal_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_deals_before_insert_update
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_deals_constraints();

-- Unique constraint
ALTER TABLE public.deals
  ADD CONSTRAINT unique_customer_vertical UNIQUE (tenant_id, customer_id, vertical_name);
