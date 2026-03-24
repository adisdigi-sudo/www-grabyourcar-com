CREATE TABLE IF NOT EXISTS public.logistics_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  api_base_url text,
  auth_type text NOT NULL DEFAULT 'token',
  api_email text,
  api_password_encrypted text,
  api_token text,
  api_key text,
  token_expires_at timestamptz,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  supported_services text[] DEFAULT '{}',
  webhook_url text,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.logistics_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage logistics partners" ON public.logistics_partners
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Read logistics partners" ON public.logistics_partners
  FOR SELECT TO authenticated
  USING (true);