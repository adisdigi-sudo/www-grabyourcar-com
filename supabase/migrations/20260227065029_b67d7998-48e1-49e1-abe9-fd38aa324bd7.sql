
-- PHASE 1 FIX (corrected — skip existing triggers)

-- 1) leads updated_at trigger (MISSING)
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2) SELECT policies for authenticated on dealer tables
CREATE POLICY "Authenticated can read dealer_companies"
  ON public.dealer_companies FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can read dealer_representatives"
  ON public.dealer_representatives FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can read dealer_inventory"
  ON public.dealer_inventory FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated can read dealer_broadcast_logs"
  ON public.dealer_broadcast_logs FOR SELECT
  TO authenticated USING (true);

-- 3) Add missing columns to dealer_inventory
ALTER TABLE public.dealer_inventory
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS manufacturing_year INTEGER,
  ADD COLUMN IF NOT EXISTS source_message TEXT,
  ADD COLUMN IF NOT EXISTS source_date TIMESTAMPTZ;

-- 4) Add indexes
CREATE INDEX IF NOT EXISTS idx_dealer_inventory_brand_model ON public.dealer_inventory(brand, model);
CREATE INDEX IF NOT EXISTS idx_dealer_inventory_dealer_rep_id ON public.dealer_inventory(dealer_rep_id);
CREATE INDEX IF NOT EXISTS idx_dealer_inventory_stock_status ON public.dealer_inventory(stock_status);

-- 5) search_inventory function
CREATE OR REPLACE FUNCTION public.search_inventory(
  p_brand TEXT DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID, brand TEXT, model TEXT, car_name TEXT, variant TEXT,
  fuel_type TEXT, transmission TEXT, color TEXT, manufacturing_year INTEGER,
  ex_showroom_price NUMERIC, on_road_price NUMERIC, discount TEXT,
  offer_details TEXT, stock_status TEXT, quantity INTEGER,
  dealer_company TEXT, dealer_city TEXT, rep_name TEXT, rep_phone TEXT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = 'public'
AS $$
  SELECT di.id, di.brand, di.model, di.car_name, di.variant,
    di.fuel_type, di.transmission, di.color, di.manufacturing_year,
    di.ex_showroom_price, di.on_road_price, di.discount,
    di.offer_details, di.stock_status, di.quantity,
    dc.company_name, dc.city, dr.name, dr.phone
  FROM public.dealer_inventory di
  LEFT JOIN public.dealer_representatives dr ON di.dealer_rep_id = dr.id
  LEFT JOIN public.dealer_companies dc ON dr.dealer_company_id = dc.id
  WHERE di.is_active = true AND di.stock_status = 'available'
    AND (p_brand IS NULL OR di.brand ILIKE '%' || p_brand || '%')
    AND (p_model IS NULL OR (di.model ILIKE '%' || p_model || '%' OR di.car_name ILIKE '%' || p_model || '%'))
    AND (p_city IS NULL OR dc.city ILIKE '%' || p_city || '%')
  ORDER BY di.created_at DESC;
$$;

-- 6) inventory_broadcast_logs table
CREATE TABLE IF NOT EXISTS public.inventory_broadcast_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_ids UUID[] NOT NULL DEFAULT '{}',
  sent_to_count INTEGER NOT NULL DEFAULT 0,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  message_preview TEXT,
  sent_by UUID,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_broadcast_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage inventory_broadcast_logs"
  ON public.inventory_broadcast_logs FOR ALL
  TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Auth read inventory_broadcast_logs"
  ON public.inventory_broadcast_logs FOR SELECT
  TO authenticated USING (true);
