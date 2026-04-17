
-- =====================================================
-- SECURITY HARDENING — multiple findings
-- =====================================================

-- 1) admin_otps: hash OTPs server-side & remove client SELECT policy
--    Remove the policy that lets users read their own OTPs.
DROP POLICY IF EXISTS "Users can view their own OTPs" ON public.admin_otps;
-- All OTP operations must go through the admin-otp edge function (service role).
COMMENT ON TABLE public.admin_otps IS
  'OTP storage. Access ONLY via service_role inside the admin-otp edge function. otp_code is stored as a SHA-256 hex hash, never plaintext. No client SELECT policy is allowed.';

-- 2) checkout_settings: restrict writes to admins; allow authenticated read only
DROP POLICY IF EXISTS "Authenticated users can manage checkout settings" ON public.checkout_settings;
CREATE POLICY "Authenticated can read checkout settings"
  ON public.checkout_settings FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Admins can manage checkout settings"
  ON public.checkout_settings FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 3) business_verticals.vertical_password — stop exposing plaintext password to all authenticated users
--    Strategy:
--      a) Add a `has_vertical_password` boolean column to business_verticals (safe to expose)
--      b) Keep an internal `vertical_password` column but REVOKE column-level SELECT/UPDATE
--         from anon/authenticated so only service_role (edge functions) can read/write it
--      c) Maintain `has_vertical_password` automatically via trigger
ALTER TABLE public.business_verticals
  ADD COLUMN IF NOT EXISTS has_vertical_password boolean NOT NULL DEFAULT false;

UPDATE public.business_verticals
   SET has_vertical_password = (vertical_password IS NOT NULL AND length(btrim(vertical_password)) > 0);

CREATE OR REPLACE FUNCTION public.sync_vertical_password_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.has_vertical_password := (NEW.vertical_password IS NOT NULL AND length(btrim(NEW.vertical_password)) > 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vertical_password_flag ON public.business_verticals;
CREATE TRIGGER trg_sync_vertical_password_flag
BEFORE INSERT OR UPDATE OF vertical_password ON public.business_verticals
FOR EACH ROW
EXECUTE FUNCTION public.sync_vertical_password_flag();

-- Revoke direct column access for client roles. Service role still bypasses.
REVOKE SELECT (vertical_password) ON public.business_verticals FROM anon, authenticated;
REVOKE UPDATE (vertical_password) ON public.business_verticals FROM anon, authenticated;
REVOKE INSERT (vertical_password) ON public.business_verticals FROM anon, authenticated;

-- 4) Fix get_user_tenant_id tenant isolation — add explicit tenant_id mapping on crm_users
ALTER TABLE public.crm_users
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Backfill: assign existing crm_users to the single existing tenant (single-tenant deployment)
UPDATE public.crm_users
   SET tenant_id = (SELECT id FROM public.tenants ORDER BY created_at ASC LIMIT 1)
 WHERE tenant_id IS NULL;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cu.tenant_id
  FROM public.crm_users cu
  WHERE cu.auth_user_id = _user_id
    AND cu.tenant_id IS NOT NULL
  LIMIT 1
$$;

-- 5) Fix mutable search_path on pgmq wrapper functions
ALTER FUNCTION public.enqueue_email(text, jsonb)        SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint)        SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
