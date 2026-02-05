-- Add image_url column to car_colors table for color-specific images
ALTER TABLE public.car_colors ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create HSRP service banners table for backend management
CREATE TABLE IF NOT EXISTS public.hsrp_service_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  vehicle_class TEXT NOT NULL, -- '2w', '4w', 'ev', 'commercial', 'tractor'
  icon_type TEXT DEFAULT 'car', -- 'car', 'bike', 'truck', 'ev', 'tractor'
  gradient_from TEXT DEFAULT '#1e3a5f',
  gradient_to TEXT DEFAULT '#2563eb',
  badge_text TEXT, -- e.g., 'Most Popular', 'Best Value'
  badge_color TEXT DEFAULT 'green',
  features TEXT[], -- list of features shown on card
  price_key TEXT NOT NULL, -- maps to hsrp_pricing key
  cta_text TEXT DEFAULT 'Book Now',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  animation_type TEXT DEFAULT 'slide', -- 'slide', 'fade', 'scale'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hsrp_service_banners ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can manage HSRP banners" ON public.hsrp_service_banners
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Public can view active HSRP banners" ON public.hsrp_service_banners
  FOR SELECT USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_hsrp_service_banners_updated_at
  BEFORE UPDATE ON public.hsrp_service_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default HSRP service banners
INSERT INTO public.hsrp_service_banners (title, subtitle, description, vehicle_class, icon_type, gradient_from, gradient_to, badge_text, features, price_key, sort_order) VALUES
('Two Wheeler HSRP', 'Bikes & Scooters', 'High Security Registration Plates for motorcycles, scooters, and mopeds', '2w', 'bike', '#059669', '#10b981', NULL, ARRAY['Quick 3-Day Delivery', 'Doorstep Installation', 'RTO Compliant'], 'two_wheeler', 1),
('Four Wheeler HSRP', 'Cars & SUVs', 'Premium HSRP plates for personal vehicles including cars, SUVs and sedans', '4w', 'car', '#2563eb', '#3b82f6', 'Most Popular', ARRAY['Same Day Processing', 'Free Installation', 'Nationwide Service'], 'four_wheeler', 2),
('Electric Vehicle HSRP', 'EV Special', 'Specialized green HSRP plates for electric vehicles with priority processing', 'ev', 'ev', '#7c3aed', '#8b5cf6', 'Green Plate', ARRAY['Priority Processing', 'EV Green Plates', 'Eco-Friendly'], 'ev', 3),
('Commercial Vehicle HSRP', 'Trucks & Buses', 'Heavy-duty HSRP for commercial transport vehicles', 'commercial', 'truck', '#dc2626', '#ef4444', NULL, ARRAY['Fleet Discounts', 'Bulk Orders', 'Pan-India Coverage'], 'commercial', 4),
('Tractor HSRP', 'Agricultural', 'HSRP registration plates for tractors and agricultural vehicles', 'tractor', 'tractor', '#ca8a04', '#eab308', NULL, ARRAY['Rural Delivery', 'Farm-Friendly Schedule', 'Special Rates'], 'tractor', 5);

-- Add admin write policies for car_colors
DROP POLICY IF EXISTS "Admins can manage car colors" ON public.car_colors;
CREATE POLICY "Admins can manage car colors" ON public.car_colors
  FOR ALL USING (public.is_admin(auth.uid()));