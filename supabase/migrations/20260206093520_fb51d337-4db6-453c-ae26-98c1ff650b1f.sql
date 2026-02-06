-- Create state-city pricing table for cars
CREATE TABLE public.car_city_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.car_variants(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  ex_showroom INTEGER NOT NULL,
  rto INTEGER NOT NULL DEFAULT 0,
  insurance INTEGER NOT NULL DEFAULT 0,
  tcs INTEGER NOT NULL DEFAULT 0,
  fastag INTEGER NOT NULL DEFAULT 500,
  registration INTEGER NOT NULL DEFAULT 1000,
  handling INTEGER NOT NULL DEFAULT 15000,
  other_charges INTEGER NOT NULL DEFAULT 0,
  on_road_price INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_till DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(car_id, variant_id, state, city)
);

-- Create index for faster lookups
CREATE INDEX idx_car_city_pricing_car_id ON public.car_city_pricing(car_id);
CREATE INDEX idx_car_city_pricing_state_city ON public.car_city_pricing(state, city);
CREATE INDEX idx_car_city_pricing_variant ON public.car_city_pricing(variant_id);

-- Create states master table
CREATE TABLE public.indian_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  rto_percentage NUMERIC(5,2) DEFAULT 8.00,
  road_tax_percentage NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cities master table
CREATE TABLE public.indian_cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state_code TEXT NOT NULL,
  name TEXT NOT NULL,
  rto_code TEXT,
  rto_percentage_override NUMERIC(5,2),
  is_metro BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(state_code, name)
);

-- Enable RLS
ALTER TABLE public.car_city_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indian_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indian_cities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for car_city_pricing
CREATE POLICY "Anyone can view car city pricing" ON public.car_city_pricing
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage car city pricing" ON public.car_city_pricing
  FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for indian_states
CREATE POLICY "Anyone can view states" ON public.indian_states
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage states" ON public.indian_states
  FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for indian_cities
CREATE POLICY "Anyone can view cities" ON public.indian_cities
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage cities" ON public.indian_cities
  FOR ALL USING (is_admin(auth.uid()));

-- Insert Indian states with RTO percentages
INSERT INTO public.indian_states (code, name, rto_percentage, sort_order) VALUES
('DL', 'Delhi', 8.00, 1),
('MH', 'Maharashtra', 11.00, 2),
('KA', 'Karnataka', 13.00, 3),
('TN', 'Tamil Nadu', 10.00, 4),
('UP', 'Uttar Pradesh', 8.00, 5),
('GJ', 'Gujarat', 6.00, 6),
('RJ', 'Rajasthan', 8.00, 7),
('WB', 'West Bengal', 10.00, 8),
('AP', 'Andhra Pradesh', 12.00, 9),
('TS', 'Telangana', 12.00, 10),
('KL', 'Kerala', 15.00, 11),
('MP', 'Madhya Pradesh', 10.00, 12),
('HR', 'Haryana', 6.00, 13),
('PB', 'Punjab', 9.00, 14),
('BR', 'Bihar', 7.00, 15),
('OR', 'Odisha', 8.00, 16),
('JH', 'Jharkhand', 7.00, 17),
('CG', 'Chhattisgarh', 10.00, 18),
('AS', 'Assam', 7.00, 19),
('UK', 'Uttarakhand', 8.00, 20),
('HP', 'Himachal Pradesh', 6.00, 21),
('JK', 'Jammu & Kashmir', 6.00, 22),
('GA', 'Goa', 9.00, 23),
('CH', 'Chandigarh', 5.00, 24);

-- Insert major cities
INSERT INTO public.indian_cities (state_code, name, rto_code, is_metro, sort_order) VALUES
-- Delhi
('DL', 'New Delhi', 'DL', true, 1),
('DL', 'South Delhi', 'DL 3', false, 2),
('DL', 'North Delhi', 'DL 4', false, 3),
('DL', 'East Delhi', 'DL 5', false, 4),
('DL', 'West Delhi', 'DL 6', false, 5),
-- Maharashtra
('MH', 'Mumbai', 'MH 01', true, 1),
('MH', 'Pune', 'MH 12', true, 2),
('MH', 'Thane', 'MH 04', false, 3),
('MH', 'Nagpur', 'MH 31', false, 4),
('MH', 'Nashik', 'MH 15', false, 5),
('MH', 'Navi Mumbai', 'MH 43', false, 6),
-- Karnataka
('KA', 'Bangalore', 'KA 01', true, 1),
('KA', 'Mysore', 'KA 09', false, 2),
('KA', 'Mangalore', 'KA 19', false, 3),
('KA', 'Hubli', 'KA 25', false, 4),
-- Tamil Nadu
('TN', 'Chennai', 'TN 01', true, 1),
('TN', 'Coimbatore', 'TN 37', false, 2),
('TN', 'Madurai', 'TN 58', false, 3),
('TN', 'Trichy', 'TN 45', false, 4),
-- Uttar Pradesh
('UP', 'Lucknow', 'UP 32', false, 1),
('UP', 'Noida', 'UP 16', true, 2),
('UP', 'Greater Noida', 'UP 16', false, 3),
('UP', 'Ghaziabad', 'UP 14', true, 4),
('UP', 'Kanpur', 'UP 78', false, 5),
('UP', 'Agra', 'UP 80', false, 6),
('UP', 'Varanasi', 'UP 65', false, 7),
-- Gujarat
('GJ', 'Ahmedabad', 'GJ 01', true, 1),
('GJ', 'Surat', 'GJ 05', false, 2),
('GJ', 'Vadodara', 'GJ 06', false, 3),
('GJ', 'Rajkot', 'GJ 03', false, 4),
-- Haryana
('HR', 'Gurugram', 'HR 26', true, 1),
('HR', 'Faridabad', 'HR 44', true, 2),
('HR', 'Panipat', 'HR 20', false, 3),
('HR', 'Ambala', 'HR 01', false, 4),
-- Telangana
('TS', 'Hyderabad', 'TS 09', true, 1),
('TS', 'Secunderabad', 'TS 07', false, 2),
('TS', 'Warangal', 'TS 11', false, 3),
-- Kerala
('KL', 'Kochi', 'KL 07', false, 1),
('KL', 'Thiruvananthapuram', 'KL 01', false, 2),
('KL', 'Kozhikode', 'KL 11', false, 3),
-- Punjab
('PB', 'Chandigarh', 'PB 65', true, 1),
('PB', 'Ludhiana', 'PB 10', false, 2),
('PB', 'Amritsar', 'PB 02', false, 3),
('PB', 'Jalandhar', 'PB 08', false, 4),
-- Rajasthan
('RJ', 'Jaipur', 'RJ 14', false, 1),
('RJ', 'Jodhpur', 'RJ 19', false, 2),
('RJ', 'Udaipur', 'RJ 27', false, 3),
-- West Bengal
('WB', 'Kolkata', 'WB 01', true, 1),
('WB', 'Howrah', 'WB 06', false, 2),
('WB', 'Siliguri', 'WB 73', false, 3);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_car_city_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_car_city_pricing_timestamp
  BEFORE UPDATE ON public.car_city_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_car_city_pricing_updated_at();