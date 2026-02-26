
-- Step 1: Drop trigger and function
DROP TRIGGER IF EXISTS trg_validate_crm_user_role ON public.crm_users;
DROP FUNCTION IF EXISTS public.validate_crm_user_role();

-- Step 2: Drop and recreate crm_users with CHECK constraint
DROP TABLE IF EXISTS public.crm_users CASCADE;

CREATE TABLE public.crm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'executive')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_users ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access on crm_users"
  ON public.crm_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_users cu
      WHERE cu.auth_user_id = auth.uid() AND cu.role = 'admin'
    )
  );

-- All authenticated users can read
CREATE POLICY "Authenticated users can read crm_users"
  ON public.crm_users FOR SELECT
  TO authenticated
  USING (true);

-- Insert test admin
INSERT INTO public.crm_users (auth_user_id, name, email, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Admin', 'admin@grabyourcar.app', 'admin');
