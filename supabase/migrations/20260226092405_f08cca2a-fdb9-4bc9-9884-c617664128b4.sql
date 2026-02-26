
-- Fix infinite recursion on crm_users RLS
-- The "Admins full access" policy queries crm_users itself, causing recursion

-- Create a security definer function to check CRM role
CREATE OR REPLACE FUNCTION public.get_crm_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.crm_users WHERE auth_user_id = _user_id LIMIT 1
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Admins full access on crm_users" ON public.crm_users;

-- Recreate using the security definer function
CREATE POLICY "Admins full access on crm_users"
  ON public.crm_users FOR ALL TO authenticated
  USING (public.get_crm_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_crm_role(auth.uid()) = 'admin');
