-- Integration health logs table
CREATE TABLE IF NOT EXISTS public.integration_health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'warning', 'skipped')),
  message TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  tested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tested_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_health_provider_created
  ON public.integration_health_logs (provider, created_at DESC);

ALTER TABLE public.integration_health_logs ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read
DROP POLICY IF EXISTS "Authenticated can view health logs" ON public.integration_health_logs;
CREATE POLICY "Authenticated can view health logs"
ON public.integration_health_logs
FOR SELECT
TO authenticated
USING (true);

-- Only authenticated users can insert (edge function uses service role anyway)
DROP POLICY IF EXISTS "Authenticated can insert health logs" ON public.integration_health_logs;
CREATE POLICY "Authenticated can insert health logs"
ON public.integration_health_logs
FOR INSERT
TO authenticated
WITH CHECK (true);