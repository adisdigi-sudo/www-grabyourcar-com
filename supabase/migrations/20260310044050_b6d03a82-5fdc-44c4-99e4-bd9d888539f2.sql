
-- Update is_admin to also check crm_users for legacy admin accounts
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.crm_users
    WHERE auth_user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Update has_role to also check crm_users for legacy admin accounts
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
  OR (
    _role IN ('admin', 'super_admin')
    AND EXISTS (
      SELECT 1
      FROM public.crm_users
      WHERE auth_user_id = _user_id
        AND role = 'admin'
    )
  )
$$;

-- Also add RLS policies for the calling-system and lead-management tables
-- that may be missing for legacy admins. The above function fixes cover all
-- tables using is_admin() or has_role().
