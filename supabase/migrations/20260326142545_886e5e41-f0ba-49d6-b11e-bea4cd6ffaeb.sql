-- Fix sensitive public data exposure
DROP POLICY IF EXISTS "Anyone can read settings" ON public.admin_settings;

CREATE POLICY "Authenticated admins can read admin settings"
ON public.admin_settings
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Anyone can view active business verticals" ON public.business_verticals;
DROP POLICY IF EXISTS "Authenticated users can view active verticals" ON public.business_verticals;

CREATE POLICY "Authenticated users can view active business verticals"
ON public.business_verticals
FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Anon view agreement history" ON public.rental_agreement_history;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rental_agreement_history'
      AND policyname = 'Authenticated admins can read rental agreement history'
  ) THEN
    CREATE POLICY "Authenticated admins can read rental agreement history"
    ON public.rental_agreement_history
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));
  END IF;
END $$;