-- 1. Restrict business_verticals.vertical_password from client roles
REVOKE SELECT (vertical_password) ON public.business_verticals FROM anon, authenticated;

-- 2. Restrict meta_ads_config to super_admin only (not generic admin)
DROP POLICY IF EXISTS "Admins manage meta ads config" ON public.meta_ads_config;
CREATE POLICY "Super admins manage meta ads config"
  ON public.meta_ads_config
  FOR ALL
  TO authenticated
  USING (public.is_super_admin_user(auth.uid()))
  WITH CHECK (public.is_super_admin_user(auth.uid()));