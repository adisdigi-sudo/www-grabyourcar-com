
-- Add UTM and ad attribution columns to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS ad_platform text,
  ADD COLUMN IF NOT EXISTS ad_campaign_id text,
  ADD COLUMN IF NOT EXISTS ad_set_id text,
  ADD COLUMN IF NOT EXISTS ad_id text,
  ADD COLUMN IF NOT EXISTS lead_source_type text,
  ADD COLUMN IF NOT EXISTS gclid text,
  ADD COLUMN IF NOT EXISTS fbclid text;

-- Add UTM fields to automation_lead_tracking
ALTER TABLE public.automation_lead_tracking
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS ad_platform text,
  ADD COLUMN IF NOT EXISTS ad_campaign_id text,
  ADD COLUMN IF NOT EXISTS gclid text,
  ADD COLUMN IF NOT EXISTS fbclid text;

-- Add UTM fields to sales_pipeline
ALTER TABLE public.sales_pipeline
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS ad_platform text;

-- Add UTM fields to insurance_clients
ALTER TABLE public.insurance_clients
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS ad_platform text;

-- Add UTM fields to loan_applications
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS ad_platform text;

-- Create ad_campaigns table for tracking ad spend
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL DEFAULT 'meta',
  campaign_id text,
  campaign_name text NOT NULL,
  ad_set_id text,
  ad_set_name text,
  ad_id text,
  ad_name text,
  daily_budget numeric DEFAULT 0,
  total_spend numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  leads_generated integer DEFAULT 0,
  conversions integer DEFAULT 0,
  cost_per_lead numeric GENERATED ALWAYS AS (CASE WHEN leads_generated > 0 THEN total_spend / leads_generated ELSE 0 END) STORED,
  start_date date,
  end_date date,
  status text DEFAULT 'active',
  vertical text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ad campaigns"
  ON public.ad_campaigns FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Index for UTM lookups
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON public.leads(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_ad_platform ON public.leads(ad_platform) WHERE ad_platform IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_platform ON public.ad_campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON public.ad_campaigns(status);
