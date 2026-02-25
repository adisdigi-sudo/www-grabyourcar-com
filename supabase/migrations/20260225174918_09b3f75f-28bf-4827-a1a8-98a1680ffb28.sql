
-- Step 1: Add new roles to existing enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vertical_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'executive';

-- Step 2: Create clean crm_users profile table
CREATE TABLE IF NOT EXISTS public.crm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  vertical_access TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own profile"
  ON public.crm_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all profiles"
  ON public.crm_users FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert profiles"
  ON public.crm_users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update profiles"
  ON public.crm_users FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete profiles"
  ON public.crm_users FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Auto-update updated_at
CREATE TRIGGER update_crm_users_updated_at
  BEFORE UPDATE ON public.crm_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX idx_crm_users_user_id ON public.crm_users(user_id);
CREATE INDEX idx_crm_users_email ON public.crm_users(email);
