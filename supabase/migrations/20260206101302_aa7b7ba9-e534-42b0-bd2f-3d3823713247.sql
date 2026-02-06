-- Create lookup tables for vehicle attributes

-- Brands table
CREATE TABLE public.vehicle_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  country TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Body types table
CREATE TABLE public.vehicle_body_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fuel types table
CREATE TABLE public.vehicle_fuel_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Transmission types table
CREATE TABLE public.vehicle_transmissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  full_name TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Price ranges table
CREATE TABLE public.vehicle_price_ranges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  min_price NUMERIC NOT NULL DEFAULT 0,
  max_price NUMERIC,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.vehicle_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_body_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_fuel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_transmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_price_ranges ENABLE ROW LEVEL SECURITY;

-- Public read policies (anyone can view active items)
CREATE POLICY "Anyone can view active brands" ON public.vehicle_brands FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active body types" ON public.vehicle_body_types FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active fuel types" ON public.vehicle_fuel_types FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active transmissions" ON public.vehicle_transmissions FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active price ranges" ON public.vehicle_price_ranges FOR SELECT USING (is_active = true);

-- Admin write policies (authenticated users can manage)
CREATE POLICY "Admins can manage brands" ON public.vehicle_brands FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage body types" ON public.vehicle_body_types FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage fuel types" ON public.vehicle_fuel_types FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage transmissions" ON public.vehicle_transmissions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage price ranges" ON public.vehicle_price_ranges FOR ALL USING (auth.role() = 'authenticated');

-- Trigger for updated_at on brands
CREATE TRIGGER update_vehicle_brands_updated_at
  BEFORE UPDATE ON public.vehicle_brands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default data
INSERT INTO public.vehicle_brands (name, country, sort_order) VALUES
  ('Maruti Suzuki', 'India/Japan', 1),
  ('Hyundai', 'South Korea', 2),
  ('Tata', 'India', 3),
  ('Mahindra', 'India', 4),
  ('Kia', 'South Korea', 5),
  ('Toyota', 'Japan', 6),
  ('Honda', 'Japan', 7),
  ('MG', 'UK/China', 8),
  ('Skoda', 'Czech Republic', 9),
  ('Volkswagen', 'Germany', 10),
  ('Mercedes-Benz', 'Germany', 11),
  ('BMW', 'Germany', 12),
  ('Audi', 'Germany', 13);

INSERT INTO public.vehicle_body_types (name, sort_order) VALUES
  ('Hatchback', 1),
  ('Sedan', 2),
  ('Compact SUV', 3),
  ('Mid-Size SUV', 4),
  ('Full-Size SUV', 5),
  ('MPV', 6),
  ('MUV', 7),
  ('Coupe', 8),
  ('Convertible', 9),
  ('Pickup', 10),
  ('Electric', 11),
  ('Luxury', 12);

INSERT INTO public.vehicle_fuel_types (name, sort_order) VALUES
  ('Petrol', 1),
  ('Diesel', 2),
  ('Electric', 3),
  ('Hybrid', 4),
  ('CNG', 5),
  ('LPG', 6);

INSERT INTO public.vehicle_transmissions (name, full_name, sort_order) VALUES
  ('Manual', 'Manual Transmission', 1),
  ('Automatic', 'Automatic Transmission', 2),
  ('AMT', 'Automated Manual Transmission', 3),
  ('CVT', 'Continuously Variable Transmission', 4),
  ('DCT', 'Dual Clutch Transmission', 5),
  ('iMT', 'Intelligent Manual Transmission', 6);

INSERT INTO public.vehicle_price_ranges (label, min_price, max_price, sort_order) VALUES
  ('Under ₹5 Lakh', 0, 500000, 1),
  ('₹5-10 Lakh', 500000, 1000000, 2),
  ('₹10-15 Lakh', 1000000, 1500000, 3),
  ('₹15-20 Lakh', 1500000, 2000000, 4),
  ('₹20-30 Lakh', 2000000, 3000000, 5),
  ('₹30-50 Lakh', 3000000, 5000000, 6),
  ('₹50 Lakh - 1 Cr', 5000000, 10000000, 7),
  ('Above ₹1 Cr', 10000000, NULL, 8);