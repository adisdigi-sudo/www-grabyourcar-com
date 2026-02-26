
-- Drop existing crm_users table
DROP TABLE IF EXISTS public.crm_users CASCADE;

-- Create new crm_users table
CREATE TABLE public.crm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create validation trigger for role constraint
CREATE OR REPLACE FUNCTION public.validate_crm_user_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.role NOT IN ('admin', 'manager', 'executive') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be admin, manager, or executive.', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_crm_user_role
  BEFORE INSERT OR UPDATE ON public.crm_users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_crm_user_role();

-- Enable RLS
ALTER TABLE public.crm_users ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage crm_users"
  ON public.crm_users
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can read own profile"
  ON public.crm_users
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());
