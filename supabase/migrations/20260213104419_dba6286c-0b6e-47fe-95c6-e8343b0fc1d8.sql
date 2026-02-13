
-- Create hero_slides table for managing the Rivian-style homepage hero carousel
CREATE TABLE public.hero_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  brand TEXT,
  price_range TEXT,
  launch_date TEXT,
  image_url TEXT NOT NULL,
  cta_label TEXT DEFAULT 'Get Launch Alert',
  cta_link TEXT DEFAULT '/upcoming-cars',
  cta_secondary_label TEXT DEFAULT 'Explore More',
  cta_secondary_link TEXT DEFAULT '/cars',
  spec_1_label TEXT,
  spec_1_value TEXT,
  spec_2_label TEXT,
  spec_2_value TEXT,
  spec_3_label TEXT,
  spec_3_value TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Hero slides are publicly readable"
  ON public.hero_slides FOR SELECT
  USING (true);

-- Admin write access
CREATE POLICY "Admins can manage hero slides"
  ON public.hero_slides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
    )
  );

-- Insert real upcoming cars data
INSERT INTO public.hero_slides (title, subtitle, description, brand, price_range, launch_date, image_url, cta_label, cta_link, cta_secondary_label, cta_secondary_link, spec_1_label, spec_1_value, spec_2_label, spec_2_value, spec_3_label, spec_3_value, sort_order) VALUES
('Tata Sierra EV', 'The Future of Adventure', 'India''s most anticipated electric SUV with 500+ km range, Level 2 ADAS, and a 69 kWh battery pack. Adventure meets zero emissions.', 'Tata Motors', '₹25 – 35 Lakh', 'Q3 2026', '/assets/hero-upcoming-1.jpg', 'Get Launch Alert', '/upcoming-cars', 'Explore More', '/cars', 'Battery', '69 kWh', 'Range', '500+ km', 'ADAS', 'Level 2', 1),
('Tesla Model 3', 'Finally in India', 'The world''s best-selling electric car arrives in India. Autopilot, premium performance, and a 513 km range — the wait is over.', 'Tesla', '₹35 – 45 Lakh', '2026', '/assets/hero-upcoming-2.jpg', 'Get Notified', '/upcoming-cars', 'View All EVs', '/cars', 'Battery', '60 kWh', 'Range', '513 km', '0-100', '6.1 sec', 2),
('Mahindra BE 6e', 'Born Electric, Born Bold', 'India''s first 800V electric architecture. 682 km range, 0-100 in 6.7 seconds — Mahindra''s boldest move yet.', 'Mahindra', '₹18.90 – 26.90 Lakh', 'Available Now', '/assets/hero-upcoming-3.jpg', 'Book Now', '/upcoming-cars', 'Compare EVs', '/cars', 'Architecture', '800V', 'Range', '682 km', '0-100', '6.7 sec', 3),
('Hyundai Creta EV', 'India''s Favourite, Now Electric', 'The best-selling SUV goes fully electric with 473 km range, fast charging, and signature Hyundai design.', 'Hyundai', '₹17.99 – 23.50 Lakh', 'Launched 2025', '/assets/hero-upcoming-1.jpg', 'Check Price', '/cars', 'View Details', '/cars', 'Range', '473 km', 'Charging', '10-80% in 58 min', 'Motor', '150 kW', 4),
('Maruti Suzuki eVX', 'Suzuki''s Electric Future', 'Maruti''s first pure electric SUV concept with a projected 550 km range, built on the new EV-only platform.', 'Maruti Suzuki', '₹15 – 20 Lakh', 'Early 2026', '/assets/hero-upcoming-2.jpg', 'Get Notified', '/upcoming-cars', 'Explore', '/cars', 'Range', '550 km', 'Platform', 'EV-Only', 'Segment', 'Mid-SUV', 5),
('Tata Harrier EV', 'Command the Road, Silently', 'The iconic Harrier goes electric with dual-motor AWD, 500+ km range, and Level 2+ ADAS suite.', 'Tata Motors', '₹22 – 30 Lakh', 'Mid 2026', '/assets/hero-upcoming-3.jpg', 'Get Launch Alert', '/upcoming-cars', 'Compare', '/cars', 'Drive', 'AWD', 'Range', '500+ km', 'Motors', 'Dual', 6);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.hero_slides;
