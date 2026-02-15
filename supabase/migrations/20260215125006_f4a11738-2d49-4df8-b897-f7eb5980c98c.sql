
-- ============================================================
-- PHASE 1: Central Road Tax Rules Database
-- ============================================================

CREATE TABLE public.road_tax_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state_code TEXT NOT NULL,
  state_name TEXT NOT NULL,
  city TEXT DEFAULT NULL, -- NULL = state-level rule, value = city override
  ownership_type TEXT NOT NULL DEFAULT 'individual', -- individual, corporate, commercial
  fuel_type TEXT NOT NULL DEFAULT 'petrol', -- petrol, diesel, cng, ev, hybrid
  price_min NUMERIC NOT NULL DEFAULT 0,
  price_max NUMERIC DEFAULT NULL, -- NULL = no upper limit
  tax_percentage NUMERIC NOT NULL DEFAULT 0,
  flat_charge NUMERIC NOT NULL DEFAULT 0,
  additional_cess NUMERIC NOT NULL DEFAULT 0,
  green_tax NUMERIC NOT NULL DEFAULT 0,
  luxury_surcharge NUMERIC NOT NULL DEFAULT 0,
  ev_exemption BOOLEAN NOT NULL DEFAULT false,
  registration_fee NUMERIC NOT NULL DEFAULT 600,
  hsrp_fee NUMERIC NOT NULL DEFAULT 400,
  hypothecation_fee NUMERIC NOT NULL DEFAULT 1500,
  temp_reg_fee NUMERIC NOT NULL DEFAULT 200,
  handling_charges NUMERIC NOT NULL DEFAULT 15000,
  fastag_fee NUMERIC NOT NULL DEFAULT 500,
  insurance_percentage NUMERIC NOT NULL DEFAULT 3.0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_till DATE DEFAULT NULL, -- NULL = currently active
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0, -- Higher = more specific (city > state)
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID DEFAULT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

-- Indexes for fast lookup
CREATE INDEX idx_road_tax_state ON public.road_tax_rules(state_code, is_active);
CREATE INDEX idx_road_tax_lookup ON public.road_tax_rules(state_code, fuel_type, ownership_type, is_active);
CREATE INDEX idx_road_tax_price_range ON public.road_tax_rules(price_min, price_max);
CREATE INDEX idx_road_tax_effective ON public.road_tax_rules(effective_from, effective_till);

-- Prevent overlapping slabs (unique constraint on key combo)
CREATE UNIQUE INDEX idx_road_tax_unique_slab ON public.road_tax_rules(
  state_code, COALESCE(city, ''), ownership_type, fuel_type, price_min, COALESCE(price_max, 999999999), version
) WHERE is_active = true;

-- Auto-update timestamp trigger
CREATE TRIGGER update_road_tax_rules_updated_at
  BEFORE UPDATE ON public.road_tax_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.road_tax_rules ENABLE ROW LEVEL SECURITY;

-- Public read access (pricing data is public)
CREATE POLICY "Road tax rules are publicly readable"
  ON public.road_tax_rules FOR SELECT
  USING (true);

-- Admin-only write access
CREATE POLICY "Admins can manage road tax rules"
  ON public.road_tax_rules FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Version history table for rollback
CREATE TABLE public.road_tax_rule_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.road_tax_rules(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  old_data JSONB DEFAULT NULL,
  new_data JSONB DEFAULT NULL,
  changed_by UUID DEFAULT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.road_tax_rule_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Road tax history readable by admins"
  ON public.road_tax_rule_history FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Road tax history writable by admins"
  ON public.road_tax_rule_history FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Trigger to auto-log changes
CREATE OR REPLACE FUNCTION public.log_road_tax_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.road_tax_rule_history(rule_id, action, new_data, changed_by)
    VALUES (NEW.id, 'create', to_jsonb(NEW), NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.road_tax_rule_history(rule_id, action, old_data, new_data, changed_by)
    VALUES (NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), NEW.created_by);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.road_tax_rule_history(rule_id, action, old_data)
    VALUES (OLD.id, 'delete', to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER road_tax_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.road_tax_rules
  FOR EACH ROW EXECUTE FUNCTION public.log_road_tax_changes();
