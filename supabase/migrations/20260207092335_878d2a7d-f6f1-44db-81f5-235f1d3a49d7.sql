-- Add missing columns to site_settings
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS field_type TEXT DEFAULT 'text';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update RLS policies
DROP POLICY IF EXISTS "Public can read public settings" ON public.site_settings;
CREATE POLICY "Public can read public settings" ON public.site_settings
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.site_settings;
CREATE POLICY "Admins can manage settings" ON public.site_settings
  FOR ALL USING (public.is_admin(auth.uid()));

-- Create remaining tables
-- 2. NAVIGATION MENU
CREATE TABLE IF NOT EXISTS public.navigation_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_location TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  parent_id UUID REFERENCES public.navigation_menu(id) ON DELETE CASCADE,
  is_external BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.navigation_menu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active nav items" ON public.navigation_menu;
CREATE POLICY "Public can read active nav items" ON public.navigation_menu FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage nav" ON public.navigation_menu;
CREATE POLICY "Admins can manage nav" ON public.navigation_menu FOR ALL USING (public.is_admin(auth.uid()));

-- 3. HOMEPAGE SECTIONS
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  content JSONB DEFAULT '{}',
  background_image TEXT,
  background_color TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active sections" ON public.homepage_sections;
CREATE POLICY "Public can read active sections" ON public.homepage_sections FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage sections" ON public.homepage_sections;
CREATE POLICY "Admins can manage sections" ON public.homepage_sections FOR ALL USING (public.is_admin(auth.uid()));

-- 4. BANNERS
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  link_url TEXT,
  link_text TEXT,
  position TEXT DEFAULT 'homepage',
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active banners" ON public.banners;
CREATE POLICY "Public can read active banners" ON public.banners FOR SELECT USING (is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));
DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Admins can manage banners" ON public.banners FOR ALL USING (public.is_admin(auth.uid()));

-- 5. TESTIMONIALS
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_location TEXT,
  customer_image TEXT,
  car_purchased TEXT,
  rating INTEGER DEFAULT 5,
  review_text TEXT NOT NULL,
  review_date DATE DEFAULT CURRENT_DATE,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active testimonials" ON public.testimonials;
CREATE POLICY "Public can read active testimonials" ON public.testimonials FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage testimonials" ON public.testimonials;
CREATE POLICY "Admins can manage testimonials" ON public.testimonials FOR ALL USING (public.is_admin(auth.uid()));

-- 6. FAQ
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active faqs" ON public.faqs;
CREATE POLICY "Public can read active faqs" ON public.faqs FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage faqs" ON public.faqs;
CREATE POLICY "Admins can manage faqs" ON public.faqs FOR ALL USING (public.is_admin(auth.uid()));

-- 7. SERVICE PRICING
CREATE TABLE IF NOT EXISTS public.service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  gst_rate DECIMAL(5,2) DEFAULT 18.00,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  final_price DECIMAL(10,2),
  description TEXT,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active pricing" ON public.service_pricing;
CREATE POLICY "Public can read active pricing" ON public.service_pricing FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage pricing" ON public.service_pricing;
CREATE POLICY "Admins can manage pricing" ON public.service_pricing FOR ALL USING (public.is_admin(auth.uid()));

-- 8. INSURANCE PARTNERS
CREATE TABLE IF NOT EXISTS public.insurance_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  features JSONB DEFAULT '[]',
  cashless_garages INTEGER,
  claim_settlement_ratio DECIMAL(5,2),
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active partners" ON public.insurance_partners;
CREATE POLICY "Public can read active partners" ON public.insurance_partners FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage partners" ON public.insurance_partners;
CREATE POLICY "Admins can manage partners" ON public.insurance_partners FOR ALL USING (public.is_admin(auth.uid()));

-- 9. FINANCE PARTNERS
CREATE TABLE IF NOT EXISTS public.finance_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  interest_rate_min DECIMAL(5,2),
  interest_rate_max DECIMAL(5,2),
  max_tenure_months INTEGER DEFAULT 84,
  processing_fee TEXT,
  features JSONB DEFAULT '[]',
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active finance partners" ON public.finance_partners;
CREATE POLICY "Public can read active finance partners" ON public.finance_partners FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage finance partners" ON public.finance_partners;
CREATE POLICY "Admins can manage finance partners" ON public.finance_partners FOR ALL USING (public.is_admin(auth.uid()));

-- 10. PAGES
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  content JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read published pages" ON public.pages;
CREATE POLICY "Public can read published pages" ON public.pages FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS "Admins can manage pages" ON public.pages;
CREATE POLICY "Admins can manage pages" ON public.pages FOR ALL USING (public.is_admin(auth.uid()));

-- Enable realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.navigation_menu; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_sections; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.banners; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.testimonials; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.faqs; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.service_pricing; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.insurance_partners; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_partners; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;