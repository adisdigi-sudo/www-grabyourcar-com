-- Main cars table
CREATE TABLE public.cars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  body_type TEXT,
  tagline TEXT,
  price_range TEXT,
  price_numeric INTEGER,
  original_price TEXT,
  discount TEXT,
  overview TEXT,
  availability TEXT DEFAULT 'available',
  is_hot BOOLEAN DEFAULT false,
  is_limited BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  is_upcoming BOOLEAN DEFAULT false,
  launch_date DATE,
  fuel_types TEXT[] DEFAULT '{}',
  transmission_types TEXT[] DEFAULT '{}',
  key_highlights TEXT[] DEFAULT '{}',
  pros TEXT[] DEFAULT '{}',
  cons TEXT[] DEFAULT '{}',
  competitors TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Car specifications table
CREATE TABLE public.car_specifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'engine', 'dimensions', 'performance', 'features', 'safety'
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Car variants table
CREATE TABLE public.car_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  price_numeric INTEGER,
  fuel_type TEXT,
  transmission TEXT,
  features TEXT[] DEFAULT '{}',
  ex_showroom INTEGER,
  rto INTEGER,
  insurance INTEGER,
  tcs INTEGER,
  fastag INTEGER DEFAULT 500,
  registration INTEGER DEFAULT 1000,
  handling INTEGER DEFAULT 15000,
  on_road_price INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Car colors table
CREATE TABLE public.car_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex_code TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Car images table
CREATE TABLE public.car_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Car offers table
CREATE TABLE public.car_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discount TEXT NOT NULL,
  valid_till TEXT,
  offer_type TEXT NOT NULL, -- 'cashback', 'accessory', 'exchange', 'finance'
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_offers ENABLE ROW LEVEL SECURITY;

-- Public read access for all car data (anyone can view cars)
CREATE POLICY "Anyone can view cars" ON public.cars FOR SELECT USING (true);
CREATE POLICY "Anyone can view car specifications" ON public.car_specifications FOR SELECT USING (true);
CREATE POLICY "Anyone can view car variants" ON public.car_variants FOR SELECT USING (true);
CREATE POLICY "Anyone can view car colors" ON public.car_colors FOR SELECT USING (true);
CREATE POLICY "Anyone can view car images" ON public.car_images FOR SELECT USING (true);
CREATE POLICY "Anyone can view car offers" ON public.car_offers FOR SELECT USING (true);

-- Create indexes for better query performance
CREATE INDEX idx_cars_brand ON public.cars(brand);
CREATE INDEX idx_cars_body_type ON public.cars(body_type);
CREATE INDEX idx_cars_slug ON public.cars(slug);
CREATE INDEX idx_cars_is_upcoming ON public.cars(is_upcoming);
CREATE INDEX idx_car_specifications_car_id ON public.car_specifications(car_id);
CREATE INDEX idx_car_variants_car_id ON public.car_variants(car_id);
CREATE INDEX idx_car_colors_car_id ON public.car_colors(car_id);
CREATE INDEX idx_car_images_car_id ON public.car_images(car_id);
CREATE INDEX idx_car_offers_car_id ON public.car_offers(car_id);

-- Create trigger for automatic timestamp updates on cars
CREATE TRIGGER update_cars_updated_at
BEFORE UPDATE ON public.cars
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();