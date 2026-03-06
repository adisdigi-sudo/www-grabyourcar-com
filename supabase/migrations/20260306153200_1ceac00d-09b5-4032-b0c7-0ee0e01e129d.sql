
-- Add new columns to insurance_clients for the unified workspace
ALTER TABLE public.insurance_clients ADD COLUMN IF NOT EXISTS call_status text;
ALTER TABLE public.insurance_clients ADD COLUMN IF NOT EXISTS call_remarks text;
ALTER TABLE public.insurance_clients ADD COLUMN IF NOT EXISTS follow_up_time text;
ALTER TABLE public.insurance_clients ADD COLUMN IF NOT EXISTS renewal_reminder_set boolean DEFAULT false;
ALTER TABLE public.insurance_clients ADD COLUMN IF NOT EXISTS renewal_reminder_date date;
ALTER TABLE public.insurance_clients ADD COLUMN IF NOT EXISTS incentive_eligible boolean DEFAULT false;

-- Create insurance_quote_history table
CREATE TABLE IF NOT EXISTS public.insurance_quote_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.insurance_clients(id) ON DELETE CASCADE NOT NULL,
  quote_data jsonb NOT NULL DEFAULT '{}',
  shared_via text DEFAULT 'download',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.insurance_quote_history ENABLE ROW LEVEL SECURITY;

-- RLS policy: authenticated users can do everything
CREATE POLICY "Authenticated users can manage quote history"
  ON public.insurance_quote_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_insurance_quote_history_client_id ON public.insurance_quote_history(client_id);
CREATE INDEX IF NOT EXISTS idx_insurance_quote_history_created_at ON public.insurance_quote_history(created_at DESC);
