-- Add vertical scoping to api_partners
ALTER TABLE public.api_partners 
ADD COLUMN IF NOT EXISTS vertical_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS api_key_prefix text,
ADD COLUMN IF NOT EXISTS total_requests bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_request_at timestamptz,
ADD COLUMN IF NOT EXISTS key_created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS key_rotated_at timestamptz;

-- Create api_key_vertical_access for granular per-key vertical permissions
CREATE TABLE IF NOT EXISTS public.api_key_vertical_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.api_partners(id) ON DELETE CASCADE NOT NULL,
  vertical_id uuid REFERENCES public.business_verticals(id) ON DELETE CASCADE NOT NULL,
  can_read boolean DEFAULT true,
  can_write boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(partner_id, vertical_id)
);

ALTER TABLE public.api_key_vertical_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage api key vertical access"
ON public.api_key_vertical_access
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Create api_usage_daily for analytics aggregation
CREATE TABLE IF NOT EXISTS public.api_usage_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.api_partners(id) ON DELETE CASCADE NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  total_requests integer DEFAULT 0,
  successful_requests integer DEFAULT 0,
  failed_requests integer DEFAULT 0,
  avg_response_ms integer DEFAULT 0,
  endpoints_hit jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(partner_id, usage_date)
);

ALTER TABLE public.api_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view api usage"
ON public.api_usage_daily
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_partners_api_key ON public.api_partners(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_api_usage_daily_partner_date ON public.api_usage_daily(partner_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_api_logs_partner_created ON public.api_logs(partner_id, created_at DESC);