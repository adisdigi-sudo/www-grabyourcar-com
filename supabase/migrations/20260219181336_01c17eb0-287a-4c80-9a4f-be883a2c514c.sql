
-- Add pipeline_stage column with 9 stages for insurance CRM
ALTER TABLE public.insurance_clients 
ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'new_lead';

-- Add previous_claim tracking
ALTER TABLE public.insurance_clients 
ADD COLUMN IF NOT EXISTS previous_claim boolean DEFAULT false;

-- Add contact_attempts counter
ALTER TABLE public.insurance_clients 
ADD COLUMN IF NOT EXISTS contact_attempts integer DEFAULT 0;

-- Add quote tracking fields
ALTER TABLE public.insurance_clients 
ADD COLUMN IF NOT EXISTS quote_amount numeric DEFAULT null;

ALTER TABLE public.insurance_clients 
ADD COLUMN IF NOT EXISTS quote_insurer text DEFAULT null;

-- Add lost_reason for analytics
ALTER TABLE public.insurance_clients 
ADD COLUMN IF NOT EXISTS lost_reason text DEFAULT null;

-- Add assigned_executive for team assignment
ALTER TABLE public.insurance_clients 
ADD COLUMN IF NOT EXISTS assigned_executive text DEFAULT null;

-- Add follow_up_date
ALTER TABLE public.insurance_clients 
ADD COLUMN IF NOT EXISTS follow_up_date date DEFAULT null;

-- Create index on pipeline_stage for fast filtering
CREATE INDEX IF NOT EXISTS idx_insurance_clients_pipeline_stage ON public.insurance_clients(pipeline_stage);
