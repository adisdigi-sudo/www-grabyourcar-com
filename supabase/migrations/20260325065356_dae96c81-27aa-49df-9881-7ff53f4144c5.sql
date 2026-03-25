
-- Add is_legacy flag to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_legacy boolean DEFAULT false;

-- Add is_legacy flag to insurance_clients
ALTER TABLE public.insurance_clients ADD COLUMN IF NOT EXISTS is_legacy boolean DEFAULT false;

-- Add is_legacy to loan_applications
ALTER TABLE public.loan_applications ADD COLUMN IF NOT EXISTS is_legacy boolean DEFAULT false;

-- Add is_legacy to sales_pipeline
ALTER TABLE public.sales_pipeline ADD COLUMN IF NOT EXISTS is_legacy boolean DEFAULT false;

-- Mark ALL existing data as legacy
UPDATE public.leads SET is_legacy = true WHERE is_legacy = false OR is_legacy IS NULL;
UPDATE public.insurance_clients SET is_legacy = true WHERE is_legacy = false OR is_legacy IS NULL;
UPDATE public.loan_applications SET is_legacy = true WHERE is_legacy = false OR is_legacy IS NULL;
UPDATE public.sales_pipeline SET is_legacy = true WHERE is_legacy = false OR is_legacy IS NULL;

-- Create lead_forwards table for cross-vertical forwarding
CREATE TABLE public.lead_forwards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  lead_table text NOT NULL DEFAULT 'leads',
  lead_name text,
  lead_phone text,
  from_vertical_id uuid REFERENCES public.business_verticals(id),
  to_vertical_id uuid NOT NULL REFERENCES public.business_verticals(id),
  from_user_id uuid NOT NULL,
  from_user_name text,
  to_user_id uuid,
  to_user_name text,
  task_note text,
  status text NOT NULL DEFAULT 'pending',
  accepted_at timestamp with time zone,
  completed_at timestamp with time zone,
  result_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create forward history for full chain tracking
CREATE TABLE public.lead_forward_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forward_id uuid NOT NULL REFERENCES public.lead_forwards(id) ON DELETE CASCADE,
  action text NOT NULL,
  action_by uuid,
  action_by_name text,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_forwards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_forward_history ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read forwards relevant to them
CREATE POLICY "Users can view their forwards" ON public.lead_forwards
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert forwards" ON public.lead_forwards
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their forwards" ON public.lead_forwards
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Users can view forward history" ON public.lead_forward_history
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert forward history" ON public.lead_forward_history
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Enable realtime for forwards
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_forwards;
