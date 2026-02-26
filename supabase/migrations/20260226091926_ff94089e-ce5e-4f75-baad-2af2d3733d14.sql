
-- STEP 5: Lead Assignment System

-- Table 1: lead_assignment_rules
CREATE TABLE public.lead_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('manual','round_robin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table 2: lead_assignment_log
CREATE TABLE public.lead_assignment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.crm_users(id),
  assigned_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_lead_assignment_log_lead_id ON public.lead_assignment_log(lead_id);
CREATE INDEX idx_lead_assignment_log_assigned_to ON public.lead_assignment_log(assigned_to);
CREATE INDEX idx_lead_assignment_rules_vertical_id ON public.lead_assignment_rules(vertical_id);

-- RLS
ALTER TABLE public.lead_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read assignment rules"
  ON public.lead_assignment_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read assignment log"
  ON public.lead_assignment_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert assignment log"
  ON public.lead_assignment_log FOR INSERT TO authenticated WITH CHECK (true);
