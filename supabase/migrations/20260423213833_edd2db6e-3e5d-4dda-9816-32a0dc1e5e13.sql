
CREATE TABLE IF NOT EXISTS public.car_scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model_name TEXT NOT NULL,
  car_id UUID REFERENCES public.cars(id) ON DELETE SET NULL,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | running | done | failed
  variants_found INT DEFAULT 0,
  colors_found INT DEFAULT 0,
  specs_found INT DEFAULT 0,
  brochure_found BOOLEAN DEFAULT false,
  city_pricing_count INT DEFAULT 0,
  ex_showroom_delhi INT,
  firecrawl_credits_used INT DEFAULT 0,
  error_message TEXT,
  raw_data JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csj_status ON public.car_scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_csj_brand ON public.car_scrape_jobs(brand);
CREATE INDEX IF NOT EXISTS idx_csj_created ON public.car_scrape_jobs(created_at DESC);

ALTER TABLE public.car_scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all scrape jobs"
ON public.car_scrape_jobs FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage scrape jobs"
ON public.car_scrape_jobs FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER tg_csj_updated_at
BEFORE UPDATE ON public.car_scrape_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
