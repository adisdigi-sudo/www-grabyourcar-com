
-- 1. Promotional Banners table
CREATE TABLE IF NOT EXISTS public.promotional_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  cta_label TEXT,
  cta_url TEXT,
  offer_type TEXT NOT NULL DEFAULT 'general',
  color_theme TEXT NOT NULL DEFAULT 'primary',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  page_scope TEXT[] NOT NULL DEFAULT ARRAY['all']::text[],
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_banners_active ON public.promotional_banners(is_active, ends_at);

ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners"
  ON public.promotional_banners FOR SELECT
  USING (is_active = true AND (ends_at IS NULL OR ends_at > now()) AND starts_at <= now());

CREATE POLICY "Admins can manage banners"
  ON public.promotional_banners FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_promo_banners_updated
  BEFORE UPDATE ON public.promotional_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Marketing Conversion Events table
CREATE TABLE IF NOT EXISTS public.marketing_conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- view | call_click | whatsapp_click | form_submit | form_view
  page_path TEXT NOT NULL,
  cta_label TEXT,
  vertical TEXT,
  source TEXT,
  campaign TEXT,
  session_id TEXT,
  user_agent TEXT,
  referrer TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mce_event_type_date ON public.marketing_conversion_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mce_page_path ON public.marketing_conversion_events(page_path);
CREATE INDEX IF NOT EXISTS idx_mce_vertical ON public.marketing_conversion_events(vertical);

ALTER TABLE public.marketing_conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert conversion events"
  ON public.marketing_conversion_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view conversion events"
  ON public.marketing_conversion_events FOR SELECT
  USING (public.is_admin(auth.uid()));

-- 3. Seed a few default banners
INSERT INTO public.promotional_banners (slug, title, message, cta_label, cta_url, offer_type, color_theme, ends_at, page_scope, display_order)
VALUES
  ('homepage-mega-deal', '🔥 Mega Car Deal', 'Get up to ₹1.5L off + Zero waiting period on top models', 'Get Best Price', 'https://wa.me/919855924442', 'mega_deal', 'red', now() + INTERVAL '14 days', ARRAY['home','cars'], 1),
  ('insurance-renewal', '🛡️ Insurance Renewal Offer', 'Save up to 70% on car insurance — instant policy in 5 mins', 'Get Quote', '/car-insurance', 'insurance', 'green', now() + INTERVAL '30 days', ARRAY['car-insurance','home'], 2),
  ('hsrp-fast', '🚗 HSRP Fast-Track', 'High Security Number Plate at home — book in 60 seconds', 'Book HSRP', '/hsrp', 'hsrp', 'blue', now() + INTERVAL '60 days', ARRAY['hsrp','home'], 3)
ON CONFLICT (slug) DO NOTHING;
