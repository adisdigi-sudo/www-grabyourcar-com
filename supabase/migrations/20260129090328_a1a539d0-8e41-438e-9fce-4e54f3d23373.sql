-- Add brochures table for storing PDF links
CREATE TABLE public.car_brochures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  variant_name TEXT,
  file_size TEXT,
  language TEXT DEFAULT 'English',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add feature categories table for structured features
CREATE TABLE public.car_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'safety', 'comfort', 'infotainment', 'adas', 'exterior', 'interior'
  feature_name TEXT NOT NULL,
  is_standard BOOLEAN DEFAULT true,
  variant_specific TEXT[], -- Array of variant names where this applies
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add price history for tracking changes
CREATE TABLE public.car_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.car_variants(id) ON DELETE CASCADE,
  old_price INTEGER,
  new_price INTEGER,
  change_type TEXT NOT NULL, -- 'increase', 'decrease', 'launch'
  change_percentage NUMERIC(5,2),
  recorded_at TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'manual'
);

-- Add data freshness tracking to cars table
ALTER TABLE public.cars 
ADD COLUMN IF NOT EXISTS data_freshness_score INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS official_url TEXT,
ADD COLUMN IF NOT EXISTS brochure_url TEXT,
ADD COLUMN IF NOT EXISTS is_discontinued BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_bestseller BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expected_price_min INTEGER,
ADD COLUMN IF NOT EXISTS expected_price_max INTEGER;

-- Enable RLS on new tables
ALTER TABLE public.car_brochures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_price_history ENABLE ROW LEVEL SECURITY;

-- Public read access for brochures
CREATE POLICY "Anyone can view car brochures"
ON public.car_brochures FOR SELECT
USING (true);

-- Public read access for features
CREATE POLICY "Anyone can view car features"
ON public.car_features FOR SELECT
USING (true);

-- Public read access for price history
CREATE POLICY "Anyone can view price history"
ON public.car_price_history FOR SELECT
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_car_brochures_car_id ON public.car_brochures(car_id);
CREATE INDEX idx_car_features_car_id ON public.car_features(car_id);
CREATE INDEX idx_car_features_category ON public.car_features(category);
CREATE INDEX idx_car_price_history_car_id ON public.car_price_history(car_id);
CREATE INDEX idx_cars_data_freshness ON public.cars(data_freshness_score);
CREATE INDEX idx_cars_last_verified ON public.cars(last_verified_at);