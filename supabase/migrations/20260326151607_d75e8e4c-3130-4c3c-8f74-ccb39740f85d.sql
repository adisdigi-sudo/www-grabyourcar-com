
-- ============================================================
-- DEEP SECURITY FIX ROUND 2 (retry without calling_queue view)
-- ============================================================

-- 1. Fix get_user_tenant_id: actually use the _user_id parameter
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id
  FROM public.tenants t
  WHERE EXISTS (
    SELECT 1 FROM public.crm_users cu
    WHERE cu.auth_user_id = _user_id
  )
  ORDER BY t.created_at ASC
  LIMIT 1
$$;

-- 2. logistics_partners: remove broad SELECT, keep admin-only
DROP POLICY IF EXISTS "Read logistics partners" ON public.logistics_partners;

-- 3. email_subscribers: remove broad policy, keep admin-only
DROP POLICY IF EXISTS "Authenticated users can manage email subscribers" ON public.email_subscribers;
DROP POLICY IF EXISTS "Admins can manage email_subscribers" ON public.email_subscribers;
CREATE POLICY "Admins manage email subscribers"
ON public.email_subscribers FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
-- Allow anon to subscribe (INSERT only, for website signup forms)
CREATE POLICY "Anyone can subscribe"
ON public.email_subscribers FOR INSERT
TO anon
WITH CHECK (true);

-- 4. whatsapp_templates: fix public read + broad authenticated write
DROP POLICY IF EXISTS "Admin can view all templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Authenticated users can manage wa templates" ON public.whatsapp_templates;
CREATE POLICY "Authenticated can view templates"
ON public.whatsapp_templates FOR SELECT
TO authenticated
USING (true);
