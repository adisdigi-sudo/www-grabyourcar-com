-- =============================================
-- WEBSITE CONTENT MANAGEMENT TABLES
-- =============================================

-- Homepage Banners/Carousel
CREATE TABLE IF NOT EXISTS public.homepage_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_text TEXT,
  cta_link TEXT,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  display_from TIMESTAMP WITH TIME ZONE,
  display_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Customer Testimonials
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_location TEXT,
  customer_image TEXT,
  car_purchased TEXT,
  rating INTEGER DEFAULT 5,
  testimonial_text TEXT NOT NULL,
  video_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Customer Delivery Stories (Happy Customers Gallery)
CREATE TABLE IF NOT EXISTS public.customer_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  car_name TEXT NOT NULL,
  car_brand TEXT,
  delivery_date DATE,
  image_url TEXT NOT NULL,
  location TEXT,
  testimonial TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insurance Partners
CREATE TABLE IF NOT EXISTS public.insurance_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Finance Partners / Banks
CREATE TABLE IF NOT EXISTS public.finance_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  interest_rate_from NUMERIC(4,2),
  interest_rate_to NUMERIC(4,2),
  processing_fee TEXT,
  max_tenure_months INTEGER DEFAULT 84,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Corporate Clients (Logo Grid)
CREATE TABLE IF NOT EXISTS public.corporate_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  industry TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- FAQ Categories and Questions
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'general',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Service Pages Content
CREATE TABLE IF NOT EXISTS public.service_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_image TEXT,
  content JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Site Settings (Global)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.homepage_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public read policies for all content tables
CREATE POLICY "Anyone can view active banners" ON public.homepage_banners FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage banners" ON public.homepage_banners FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active testimonials" ON public.testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage testimonials" ON public.testimonials FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active customer stories" ON public.customer_stories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage customer stories" ON public.customer_stories FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active insurance partners" ON public.insurance_partners FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage insurance partners" ON public.insurance_partners FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active finance partners" ON public.finance_partners FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage finance partners" ON public.finance_partners FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active corporate clients" ON public.corporate_clients FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage corporate clients" ON public.corporate_clients FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active faqs" ON public.faqs FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage faqs" ON public.faqs FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view active service pages" ON public.service_pages FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage service pages" ON public.service_pages FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL USING (is_admin(auth.uid()));

-- Update triggers
CREATE TRIGGER update_homepage_banners_updated_at BEFORE UPDATE ON public.homepage_banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_pages_updated_at BEFORE UPDATE ON public.service_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();