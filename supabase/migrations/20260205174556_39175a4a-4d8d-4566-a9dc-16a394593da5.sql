-- Create cross-sell rules table
CREATE TABLE public.cross_sell_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'car_view', 'lead_submit', 'cart_add', 'checkout', 'page_visit'
  trigger_value TEXT, -- specific car slug, page path, etc.
  display_location TEXT NOT NULL, -- 'sidebar', 'modal', 'inline', 'footer', 'popup'
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  conditions JSONB DEFAULT '{}', -- additional conditions like price range, brand, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cross-sell items table (what to recommend)
CREATE TABLE public.cross_sell_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.cross_sell_rules(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'accessory', 'insurance', 'loan', 'hsrp', 'service', 'car', 'custom'
  item_id TEXT, -- reference to actual item (accessory id, car slug, etc.)
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  cta_text TEXT DEFAULT 'Learn More',
  cta_link TEXT,
  discount_text TEXT, -- e.g., "20% OFF", "Free with purchase"
  original_price NUMERIC,
  offer_price NUMERIC,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cross-sell bundles table
CREATE TABLE public.cross_sell_bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  bundle_type TEXT NOT NULL, -- 'starter', 'premium', 'complete', 'custom'
  total_value NUMERIC,
  bundle_price NUMERIC,
  savings_text TEXT, -- e.g., "Save ₹15,000"
  image_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  applicable_brands TEXT[], -- which car brands this applies to
  applicable_segments TEXT[], -- SUV, Sedan, Hatchback, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bundle items table
CREATE TABLE public.cross_sell_bundle_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.cross_sell_bundles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  individual_price NUMERIC,
  is_optional BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0
);

-- Create cross-sell analytics table
CREATE TABLE public.cross_sell_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES public.cross_sell_rules(id) ON DELETE SET NULL,
  bundle_id UUID REFERENCES public.cross_sell_bundles(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.cross_sell_items(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'impression', 'click', 'conversion'
  user_id TEXT,
  session_id TEXT,
  page_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cross_sell_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_sell_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_sell_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_sell_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_sell_analytics ENABLE ROW LEVEL SECURITY;

-- Admin policies for cross_sell_rules
CREATE POLICY "Admins can manage cross-sell rules" ON public.cross_sell_rules
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Public can view active cross-sell rules" ON public.cross_sell_rules
  FOR SELECT USING (is_active = true);

-- Admin policies for cross_sell_items
CREATE POLICY "Admins can manage cross-sell items" ON public.cross_sell_items
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Public can view active cross-sell items" ON public.cross_sell_items
  FOR SELECT USING (is_active = true);

-- Admin policies for cross_sell_bundles
CREATE POLICY "Admins can manage cross-sell bundles" ON public.cross_sell_bundles
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Public can view active cross-sell bundles" ON public.cross_sell_bundles
  FOR SELECT USING (is_active = true);

-- Admin policies for cross_sell_bundle_items
CREATE POLICY "Admins can manage bundle items" ON public.cross_sell_bundle_items
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Public can view bundle items" ON public.cross_sell_bundle_items
  FOR SELECT USING (true);

-- Policies for analytics (insert from anyone, read for admins)
CREATE POLICY "Anyone can insert analytics" ON public.cross_sell_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view analytics" ON public.cross_sell_analytics
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_cross_sell_rules_updated_at
  BEFORE UPDATE ON public.cross_sell_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cross_sell_bundles_updated_at
  BEFORE UPDATE ON public.cross_sell_bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_cross_sell_rules_trigger ON public.cross_sell_rules(trigger_type, is_active);
CREATE INDEX idx_cross_sell_items_rule ON public.cross_sell_items(rule_id, is_active);
CREATE INDEX idx_cross_sell_bundles_active ON public.cross_sell_bundles(is_active, is_featured);
CREATE INDEX idx_cross_sell_analytics_created ON public.cross_sell_analytics(created_at DESC);