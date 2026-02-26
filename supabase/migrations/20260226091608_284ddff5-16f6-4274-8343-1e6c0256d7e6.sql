
-- Drop old lead_activities table and recreate with clean schema
DROP TABLE IF EXISTS public.lead_activities CASCADE;

CREATE TABLE public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call','note','whatsapp','email','status_change','followup')),
  description TEXT,
  created_by UUID REFERENCES public.crm_users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_activities_activity_type ON public.lead_activities(activity_type);
CREATE INDEX idx_lead_activities_created_at ON public.lead_activities(created_at DESC);

-- RLS
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read lead activities"
  ON public.lead_activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert lead activities"
  ON public.lead_activities FOR INSERT
  TO authenticated
  WITH CHECK (true);
