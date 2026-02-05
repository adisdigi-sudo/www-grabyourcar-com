-- Add service_type to hsrp_service_banners to support both HSRP and FASTag
ALTER TABLE public.hsrp_service_banners 
ADD COLUMN service_type text NOT NULL DEFAULT 'hsrp';

-- Update column comment
COMMENT ON COLUMN public.hsrp_service_banners.service_type IS 'Type of service: hsrp or fastag';

-- Add index for filtering by service type
CREATE INDEX idx_hsrp_service_banners_service_type ON public.hsrp_service_banners(service_type);

-- Insert default FASTag banners
INSERT INTO public.hsrp_service_banners (title, subtitle, description, vehicle_class, icon_type, gradient_from, gradient_to, badge_text, badge_color, features, price_key, cta_text, sort_order, is_active, animation_type, service_type)
VALUES 
('Car FASTag', 'Private Vehicles', 'Get instant FASTag for seamless toll payments across India', '4w', 'car', '#7c3aed', '#a855f7', 'Popular', 'purple', ARRAY['Instant Activation', 'Cashback Offers', 'All Toll Plazas'], 'four_wheeler', 'Get FASTag', 10, true, 'slide', 'fastag'),
('Bike FASTag', 'Two Wheelers', 'Affordable FASTag solution for two-wheelers', '2w', 'bike', '#ec4899', '#f472b6', NULL, 'pink', ARRAY['Quick Setup', 'Low Balance Alerts', 'Auto Recharge'], 'two_wheeler', 'Get FASTag', 11, true, 'fade', 'fastag'),
('Commercial FASTag', 'Trucks & Buses', 'Fleet management FASTag for commercial vehicles', 'commercial', 'truck', '#f59e0b', '#fbbf24', 'Fleet', 'yellow', ARRAY['Bulk Discounts', 'Fleet Dashboard', 'Trip Reports'], 'commercial', 'Get FASTag', 12, true, 'scale', 'fastag');