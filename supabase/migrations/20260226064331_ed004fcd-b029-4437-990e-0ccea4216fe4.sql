
CREATE TABLE public.verticals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage verticals"
  ON public.verticals FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can read verticals"
  ON public.verticals FOR SELECT
  USING (auth.role() = 'authenticated');
