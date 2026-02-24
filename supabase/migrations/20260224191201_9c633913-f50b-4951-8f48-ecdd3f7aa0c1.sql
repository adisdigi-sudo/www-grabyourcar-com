
-- Add pipeline management fields to insurance_leads
ALTER TABLE public.insurance_leads 
  ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'new_lead',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS assigned_executive text,
  ADD COLUMN IF NOT EXISTS follow_up_date date,
  ADD COLUMN IF NOT EXISTS contact_attempts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quote_amount numeric,
  ADD COLUMN IF NOT EXISTS quote_insurer text,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS ncb_percentage numeric,
  ADD COLUMN IF NOT EXISTS previous_claim boolean,
  ADD COLUMN IF NOT EXISTS converted_client_id uuid,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

-- Update existing leads to have proper pipeline_stage
UPDATE public.insurance_leads SET pipeline_stage = 'new_lead' WHERE pipeline_stage IS NULL OR pipeline_stage = '';

-- Create index for pipeline queries
CREATE INDEX IF NOT EXISTS idx_insurance_leads_pipeline ON public.insurance_leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_insurance_leads_priority ON public.insurance_leads(priority);
CREATE INDEX IF NOT EXISTS idx_insurance_leads_follow_up ON public.insurance_leads(follow_up_date);
