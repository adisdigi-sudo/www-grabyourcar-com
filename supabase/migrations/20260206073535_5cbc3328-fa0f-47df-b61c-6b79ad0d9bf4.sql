-- Add service_category column for better lead categorization
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT 'car_inquiry';

-- Add team_assigned column to track which team the lead is assigned to
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS team_assigned TEXT;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_leads_service_category ON public.leads(service_category);
CREATE INDEX IF NOT EXISTS idx_leads_team_assigned ON public.leads(team_assigned);
CREATE INDEX IF NOT EXISTS idx_leads_tags ON public.leads USING GIN(tags);

-- Update existing leads based on lead_type to set service_category
UPDATE public.leads SET service_category = lead_type WHERE service_category IS NULL OR service_category = 'car_inquiry';

-- Comment for clarity
COMMENT ON COLUMN public.leads.service_category IS 'Service category: car_inquiry, insurance, finance, hsrp, rental, accessories, corporate';
COMMENT ON COLUMN public.leads.team_assigned IS 'Team assignment: sales, insurance_team, finance_team, hsrp_team, rental_team';