
-- Prospect Pool (Data Bank) table
CREATE TABLE public.insurance_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  customer_name TEXT,
  email TEXT,
  vehicle_number TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  policy_type TEXT,
  expiry_date DATE,
  insurer TEXT,
  premium_amount NUMERIC,
  city TEXT,
  state TEXT,
  
  -- Prospect-specific fields
  prospect_status TEXT NOT NULL DEFAULT 'new' CHECK (prospect_status IN ('new','contacted','interested','callback','not_reachable','not_interested','converted','duplicate')),
  data_source TEXT NOT NULL DEFAULT 'website_lead' CHECK (data_source IN ('rollover_data','purchased_database','corporate_data','marketing_campaign','referral','walk_in','website_lead','other')),
  
  -- Ownership & assignment
  assigned_to TEXT,
  is_grabyourcar_customer BOOLEAN DEFAULT false,
  duplicate_of_client_id UUID,
  
  -- Conversion tracking
  converted_to_lead_id UUID,
  converted_at TIMESTAMPTZ,
  converted_by TEXT,
  
  -- Activity
  last_contacted_at TIMESTAMPTZ,
  next_callback_at TIMESTAMPTZ,
  call_count INTEGER DEFAULT 0,
  notes TEXT,
  tags TEXT[],
  
  -- Metadata
  source_file TEXT,
  batch_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prospect activity log
CREATE TABLE public.insurance_prospect_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.insurance_prospects(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  performed_by TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_prospects_phone ON public.insurance_prospects(phone);
CREATE INDEX idx_prospects_status ON public.insurance_prospects(prospect_status);
CREATE INDEX idx_prospects_source ON public.insurance_prospects(data_source);
CREATE INDEX idx_prospects_callback ON public.insurance_prospects(next_callback_at) WHERE next_callback_at IS NOT NULL;
CREATE INDEX idx_prospect_activity_prospect ON public.insurance_prospect_activity(prospect_id);

-- Enable RLS
ALTER TABLE public.insurance_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_prospect_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin/authenticated access)
CREATE POLICY "Authenticated users can view prospects" ON public.insurance_prospects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert prospects" ON public.insurance_prospects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update prospects" ON public.insurance_prospects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete prospects" ON public.insurance_prospects FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view prospect activity" ON public.insurance_prospect_activity FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert prospect activity" ON public.insurance_prospect_activity FOR INSERT TO authenticated WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_insurance_prospects_updated_at
  BEFORE UPDATE ON public.insurance_prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
