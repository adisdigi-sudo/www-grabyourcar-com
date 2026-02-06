-- Create car_brands table for managing brand data
CREATE TABLE public.car_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_luxury BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.car_brands ENABLE ROW LEVEL SECURITY;

-- Public read access for brands
CREATE POLICY "Anyone can view active brands" 
ON public.car_brands 
FOR SELECT 
USING (is_active = true);

-- Admin full access (authenticated users can manage)
CREATE POLICY "Authenticated users can manage brands" 
ON public.car_brands 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Insert the brand data
INSERT INTO public.car_brands (name, slug, country, is_luxury, sort_order) VALUES
('Maruti Suzuki', 'maruti-suzuki', 'India', false, 1),
('Hyundai', 'hyundai', 'South Korea', false, 2),
('Tata Motors', 'tata-motors', 'India', false, 3),
('Mahindra', 'mahindra', 'India', false, 4),
('Kia', 'kia', 'South Korea', false, 5),
('Toyota', 'toyota', 'Japan', false, 6),
('Honda', 'honda', 'Japan', false, 7),
('Skoda', 'skoda', 'Czech Republic', false, 8),
('Volkswagen', 'volkswagen', 'Germany', false, 9),
('MG', 'mg', 'United Kingdom', false, 10),
('Renault', 'renault', 'France', false, 11),
('Nissan', 'nissan', 'Japan', false, 12),
('Citroen', 'citroen', 'France', false, 13),
('Jeep', 'jeep', 'United States', false, 14),
('Isuzu', 'isuzu', 'Japan', false, 15),
('Force Motors', 'force-motors', 'India', false, 16),
('BYD', 'byd', 'China', false, 17),
('Mini', 'mini', 'United Kingdom', true, 18),
('Mercedes-Benz', 'mercedes-benz', 'Germany', true, 19),
('BMW', 'bmw', 'Germany', true, 20),
('Audi', 'audi', 'Germany', true, 21),
('Volvo', 'volvo', 'Sweden', true, 22),
('Land Rover', 'land-rover', 'United Kingdom', true, 23),
('Jaguar', 'jaguar', 'United Kingdom', true, 24),
('Lexus', 'lexus', 'Japan', true, 25),
('Porsche', 'porsche', 'Germany', true, 26),
('Lamborghini', 'lamborghini', 'Italy', true, 27),
('Ferrari', 'ferrari', 'Italy', true, 28),
('Rolls-Royce', 'rolls-royce', 'United Kingdom', true, 29),
('Bentley', 'bentley', 'United Kingdom', true, 30),
('Maserati', 'maserati', 'Italy', true, 31);

-- Enable realtime for brands
ALTER PUBLICATION supabase_realtime ADD TABLE public.car_brands;

-- Create trigger for updated_at
CREATE TRIGGER update_car_brands_updated_at
BEFORE UPDATE ON public.car_brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();