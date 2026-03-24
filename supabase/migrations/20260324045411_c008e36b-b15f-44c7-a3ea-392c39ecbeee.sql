
CREATE TABLE public.vertical_profit_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_slug text NOT NULL UNIQUE,
  vertical_name text NOT NULL,
  margin_type text NOT NULL DEFAULT 'percentage',
  margin_value numeric DEFAULT 0,
  margin_description text,
  gst_percentage numeric DEFAULT 18,
  is_active boolean DEFAULT true,
  config_json jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.vertical_pl_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_slug text NOT NULL,
  reference_id text,
  reference_type text,
  customer_name text,
  description text,
  gross_revenue numeric NOT NULL DEFAULT 0,
  cost_of_service numeric NOT NULL DEFAULT 0,
  gst_amount numeric NOT NULL DEFAULT 0,
  net_revenue numeric NOT NULL DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  margin_percentage numeric DEFAULT 0,
  breakdown jsonb DEFAULT '{}',
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  month_year text,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_pl_month_year()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.month_year := to_char(NEW.entry_date, 'YYYY-MM');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_pl_month_year_trigger
  BEFORE INSERT OR UPDATE ON public.vertical_pl_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_pl_month_year();

ALTER TABLE public.vertical_profit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_pl_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access vertical_profit_config" ON public.vertical_profit_config
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin access vertical_pl_entries" ON public.vertical_pl_entries
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

INSERT INTO public.vertical_profit_config (vertical_slug, vertical_name, margin_type, margin_value, margin_description, config_json) VALUES
  ('car-sales', 'Car Sales', 'custom', 0, 'Per-deal breakdown: RTO savings, discount margin, insurance cut, accessories', '{"components": ["rto_savings", "discount_margin", "insurance_cut", "accessories_margin", "finance_commission"]}'),
  ('insurance', 'Insurance', 'percentage', 20, 'Motor: (Premium - 18% GST - TP) x 15-28%. Bus: (Premium - 18% GST) x 65%', '{"motor_margin_min": 15, "motor_margin_max": 28, "bus_margin": 65, "gst": 18}'),
  ('loans', 'Car Loans', 'percentage', 1.5, '1-2% of disbursement amount per deal', '{"min_margin": 1, "max_margin": 2}'),
  ('hsrp', 'HSRP', 'fixed', 300, 'Rs.300 per plate fixed margin', '{"per_plate": 300}'),
  ('accessories', 'Accessories', 'custom', 30, 'Custom margin per product (Sale Price - Buy Price)', '{"default_markup": 30}'),
  ('self-drive', 'Self Drive Rentals', 'custom', 20, 'Partner model: 20% of booking. Own car: full revenue minus costs', '{"partner_margin": 20, "own_car_margin": 80}');
