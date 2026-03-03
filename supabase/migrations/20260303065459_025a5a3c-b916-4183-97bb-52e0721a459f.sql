
-- Create lead routing rules table for auto-assignment
CREATE TABLE public.lead_routing_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name text NOT NULL,
  source_pattern text, -- e.g. 'website_insurance', 'whatsapp_loan', 'google_ads_sales'
  source_type text NOT NULL DEFAULT 'website', -- website, whatsapp, google_ads, meta_ads, walk_in, referral
  service_category text, -- matches leads.service_category
  target_vertical_id uuid REFERENCES public.business_verticals(id),
  target_vertical_slug text NOT NULL,
  priority_override text, -- hot, high, normal
  auto_assign_team text, -- team name to auto-assign
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.lead_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage routing rules" ON public.lead_routing_rules
  FOR ALL USING (true);

-- Insert default routing rules for all verticals
INSERT INTO public.lead_routing_rules (rule_name, source_type, service_category, target_vertical_slug, target_vertical_id) VALUES
  ('Website Car Inquiry', 'website', 'car_inquiry', 'sales', 'aea8e08b-1273-4152-984a-4bb2793e5d1a'),
  ('Website Insurance', 'website', 'insurance', 'insurance', '4c72ab78-e030-4321-aed0-bca18967f3af'),
  ('Website Car Loan', 'website', 'finance', 'loans', 'b4813a9b-f8af-4fcc-9503-f6a2d7909bbd'),
  ('Website HSRP', 'website', 'hsrp', 'hsrp', '8094c1ee-4174-47be-8f4b-34cd4abb908a'),
  ('Website Rental', 'website', 'rental', 'rental', 'eb5a39d8-e65d-43c7-9294-0ff37e62286b'),
  ('Website Accessories', 'website', 'accessories', 'accessories', '0231601e-535c-4d3a-a95f-0e818af3ad75'),
  ('Website Corporate', 'website', 'corporate', 'sales', 'aea8e08b-1273-4152-984a-4bb2793e5d1a'),
  ('WhatsApp General', 'whatsapp', NULL, 'sales', 'aea8e08b-1273-4152-984a-4bb2793e5d1a'),
  ('WhatsApp Insurance', 'whatsapp', 'insurance', 'insurance', '4c72ab78-e030-4321-aed0-bca18967f3af'),
  ('WhatsApp Loan', 'whatsapp', 'finance', 'loans', 'b4813a9b-f8af-4fcc-9503-f6a2d7909bbd'),
  ('Google Ads Sales', 'google_ads', 'car_inquiry', 'sales', 'aea8e08b-1273-4152-984a-4bb2793e5d1a'),
  ('Google Ads Insurance', 'google_ads', 'insurance', 'insurance', '4c72ab78-e030-4321-aed0-bca18967f3af'),
  ('Meta Ads Sales', 'meta_ads', 'car_inquiry', 'sales', 'aea8e08b-1273-4152-984a-4bb2793e5d1a'),
  ('Walk-in Sales', 'walk_in', 'car_inquiry', 'sales', 'aea8e08b-1273-4152-984a-4bb2793e5d1a'),
  ('Walk-in Insurance', 'walk_in', 'insurance', 'insurance', '4c72ab78-e030-4321-aed0-bca18967f3af'),
  ('Walk-in HSRP', 'walk_in', 'hsrp', 'hsrp', '8094c1ee-4174-47be-8f4b-34cd4abb908a'),
  ('Walk-in Rental', 'walk_in', 'rental', 'rental', 'eb5a39d8-e65d-43c7-9294-0ff37e62286b');

-- Create a trigger function to auto-route leads on insert
CREATE OR REPLACE FUNCTION public.auto_route_lead()
RETURNS TRIGGER AS $$
DECLARE
  rule RECORD;
BEGIN
  -- Only route if vertical_id is not already set
  IF NEW.vertical_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Try to find a matching routing rule
  SELECT * INTO rule FROM public.lead_routing_rules
    WHERE is_active = true
    AND (
      (service_category IS NOT NULL AND NEW.service_category = service_category)
      OR (source_type IS NOT NULL AND NEW.source = source_type)
    )
    ORDER BY 
      CASE WHEN service_category IS NOT NULL AND NEW.service_category = service_category THEN 0 ELSE 1 END,
      created_at ASC
    LIMIT 1;

  IF rule IS NOT NULL THEN
    NEW.vertical_id := rule.target_vertical_id;
    IF rule.priority_override IS NOT NULL AND (NEW.priority IS NULL OR NEW.priority = '') THEN
      NEW.priority := rule.priority_override;
    END IF;
    IF rule.auto_assign_team IS NOT NULL AND (NEW.team_assigned IS NULL OR NEW.team_assigned = '') THEN
      NEW.team_assigned := rule.auto_assign_team;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Attach trigger to leads table
DROP TRIGGER IF EXISTS trigger_auto_route_lead ON public.leads;
CREATE TRIGGER trigger_auto_route_lead
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_route_lead();
