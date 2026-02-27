
-- Dealer Companies (business entities)
CREATE TABLE public.dealer_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  dealer_type TEXT NOT NULL DEFAULT 'authorized',
  city TEXT,
  state TEXT,
  priority_level INT DEFAULT 1,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dealer_companies_city ON public.dealer_companies(city);
CREATE INDEX idx_dealer_companies_type ON public.dealer_companies(dealer_type);

-- Dealer Representatives (people/contacts)
CREATE TABLE public.dealer_representatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_company_id UUID REFERENCES public.dealer_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales_executive',
  brand TEXT NOT NULL,
  phone TEXT,
  whatsapp_number TEXT,
  email TEXT,
  commission_type TEXT DEFAULT 'fixed',
  commission_value NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dealer_rep_brand ON public.dealer_representatives(brand);
CREATE INDEX idx_dealer_rep_whatsapp ON public.dealer_representatives(whatsapp_number);
CREATE INDEX idx_dealer_rep_company ON public.dealer_representatives(dealer_company_id);

-- Dealer Inventory (cars available for sharing)
CREATE TABLE public.dealer_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_rep_id UUID REFERENCES public.dealer_representatives(id) ON DELETE CASCADE,
  car_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  variant TEXT,
  fuel_type TEXT,
  transmission TEXT,
  color TEXT,
  year INT,
  ex_showroom_price NUMERIC,
  on_road_price NUMERIC,
  discount TEXT,
  offer_details TEXT,
  stock_status TEXT NOT NULL DEFAULT 'available',
  quantity INT DEFAULT 1,
  image_url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dealer_inventory_brand ON public.dealer_inventory(brand);
CREATE INDEX idx_dealer_inventory_status ON public.dealer_inventory(stock_status);
CREATE INDEX idx_dealer_inventory_rep ON public.dealer_inventory(dealer_rep_id);

-- Broadcast logs (track what was sent to whom)
CREATE TABLE public.dealer_broadcast_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_type TEXT NOT NULL DEFAULT 'inventory_update',
  message_template TEXT,
  recipient_count INT DEFAULT 0,
  sent_by TEXT,
  status TEXT DEFAULT 'pending',
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dealer_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_broadcast_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies - admin access
CREATE POLICY "Admins can manage dealer_companies" ON public.dealer_companies
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage dealer_representatives" ON public.dealer_representatives
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage dealer_inventory" ON public.dealer_inventory
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage dealer_broadcast_logs" ON public.dealer_broadcast_logs
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_dealer_companies_updated_at
  BEFORE UPDATE ON public.dealer_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dealer_representatives_updated_at
  BEFORE UPDATE ON public.dealer_representatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dealer_inventory_updated_at
  BEFORE UPDATE ON public.dealer_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
