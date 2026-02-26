
-- Add back missing columns to leads table that the frontend expects
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_type TEXT DEFAULT 'car_inquiry';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS car_brand TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS car_model TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS car_variant TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget_min NUMERIC;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget_max NUMERIC;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_count INTEGER DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS buying_timeline TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS service_category TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS team_assigned TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- Backfill customer_name from name for existing rows
UPDATE public.leads SET customer_name = name WHERE customer_name IS NULL;

-- Drop the restrictive status CHECK constraint and replace with a broader one
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('new', 'contacted', 'qualified', 'hot', 'warm', 'cold', 'followup', 'converted', 'lost'));

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON public.leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_service_category ON public.leads(service_category);
