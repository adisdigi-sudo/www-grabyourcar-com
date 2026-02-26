
-- Drop old leads table and all dependents
DROP TABLE IF EXISTS public.leads CASCADE;

-- Create clean leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT,
  source TEXT,
  vertical_id UUID REFERENCES public.verticals(id),
  assigned_to UUID REFERENCES public.crm_users(id),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','followup','converted','lost')),
  next_followup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_leads_phone ON public.leads (phone);
CREATE INDEX idx_leads_vertical_id ON public.leads (vertical_id);
CREATE INDEX idx_leads_assigned_to ON public.leads (assigned_to);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- All authenticated can read
CREATE POLICY "Authenticated users can read leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (true);

-- Admins full access
CREATE POLICY "Admins full access on leads"
  ON public.leads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_users cu
      WHERE cu.auth_user_id = auth.uid() AND cu.role = 'admin'
    )
  );

-- Managers can insert/update
CREATE POLICY "Managers can insert and update leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.crm_users cu
      WHERE cu.auth_user_id = auth.uid() AND cu.role IN ('admin','manager')
    )
  );

CREATE POLICY "Managers can update leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_users cu
      WHERE cu.auth_user_id = auth.uid() AND cu.role IN ('admin','manager')
    )
  );

-- Executives can update their assigned leads
CREATE POLICY "Executives can update assigned leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    assigned_to IN (
      SELECT cu.id FROM public.crm_users cu
      WHERE cu.auth_user_id = auth.uid() AND cu.role = 'executive'
    )
  );

-- Insert test lead
INSERT INTO public.leads (name, phone, email, city, source, status)
VALUES ('Test Lead', '9876543210', 'test@example.com', 'Mumbai', 'website', 'new');
