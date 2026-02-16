
-- Client profiles for full lifecycle management
CREATE TABLE public.client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT,
  state TEXT,
  address TEXT,
  date_of_birth DATE,
  -- Car purchase info
  car_brand TEXT,
  car_model TEXT,
  car_variant TEXT,
  purchase_date DATE,
  delivery_date DATE,
  vehicle_number TEXT,
  chassis_number TEXT,
  -- Insurance info (InsureBook sync)
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  insurance_expiry DATE,
  insurance_premium NUMERIC,
  insurebook_ref_id TEXT,
  -- Lifecycle
  lifecycle_stage TEXT NOT NULL DEFAULT 'inquiry',
  -- inquiry, test_drive, negotiation, booking, delivery, post_delivery, service, renewal
  total_spend NUMERIC DEFAULT 0,
  lifetime_value NUMERIC DEFAULT 0,
  satisfaction_score INTEGER,
  tags TEXT[],
  notes TEXT,
  source TEXT,
  assigned_to TEXT,
  -- External portal links
  external_portal TEXT,
  external_portal_id TEXT,
  external_portal_url TEXT,
  -- Timestamps
  last_interaction_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage client profiles"
ON public.client_profiles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_client_profiles_phone ON public.client_profiles(phone);
CREATE INDEX idx_client_profiles_lifecycle ON public.client_profiles(lifecycle_stage);
CREATE INDEX idx_client_profiles_next_followup ON public.client_profiles(next_follow_up_at);

CREATE TRIGGER update_client_profiles_updated_at
BEFORE UPDATE ON public.client_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Client interactions log
CREATE TABLE public.client_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.client_profiles(id) ON DELETE CASCADE NOT NULL,
  interaction_type TEXT NOT NULL,
  -- call, whatsapp, email, visit, test_drive, document, payment, note
  summary TEXT,
  details JSONB,
  performed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage client interactions"
ON public.client_interactions FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_client_interactions_client ON public.client_interactions(client_id);

-- Lead imports tracking
CREATE TABLE public.lead_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type TEXT NOT NULL, -- csv, api, webhook, portal
  source_name TEXT,
  file_name TEXT,
  total_rows INTEGER DEFAULT 0,
  imported INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  errors JSONB,
  field_mapping JSONB,
  imported_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending, processing, completed, failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.lead_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lead imports"
ON public.lead_imports FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Follow-up reminders
CREATE TABLE public.follow_up_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  lead_id UUID,
  reminder_type TEXT NOT NULL, -- call, whatsapp, email, visit
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  assigned_to TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending, completed, missed, cancelled
  auto_send BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage follow up reminders"
ON public.follow_up_reminders FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_followup_scheduled ON public.follow_up_reminders(scheduled_at) WHERE status = 'pending';
