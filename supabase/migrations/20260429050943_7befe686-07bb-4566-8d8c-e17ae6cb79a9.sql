
-- riya_settings table
CREATE TABLE IF NOT EXISTS public.riya_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.riya_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage riya_settings" ON public.riya_settings;
CREATE POLICY "Admins manage riya_settings"
  ON public.riya_settings
  FOR ALL
  USING (public.is_admin(auth.uid()) OR public.is_super_admin_user(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_super_admin_user(auth.uid()));

-- policy-docs bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('policy-docs', 'policy-docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins read policy-docs" ON storage.objects;
CREATE POLICY "Admins read policy-docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'policy-docs' AND (public.is_admin(auth.uid()) OR public.is_super_admin_user(auth.uid())));

DROP POLICY IF EXISTS "Admins write policy-docs" ON storage.objects;
CREATE POLICY "Admins write policy-docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'policy-docs' AND (public.is_admin(auth.uid()) OR public.is_super_admin_user(auth.uid())));

DROP POLICY IF EXISTS "Admins update policy-docs" ON storage.objects;
CREATE POLICY "Admins update policy-docs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'policy-docs' AND (public.is_admin(auth.uid()) OR public.is_super_admin_user(auth.uid())));

DROP POLICY IF EXISTS "Admins delete policy-docs" ON storage.objects;
CREATE POLICY "Admins delete policy-docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'policy-docs' AND (public.is_admin(auth.uid()) OR public.is_super_admin_user(auth.uid())));

-- Brochures admin write policies (public read assumed already on bucket)
DROP POLICY IF EXISTS "Admins write brochures" ON storage.objects;
CREATE POLICY "Admins write brochures"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'brochures' AND (public.is_admin(auth.uid()) OR public.is_super_admin_user(auth.uid())));

DROP POLICY IF EXISTS "Admins update brochures" ON storage.objects;
CREATE POLICY "Admins update brochures"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'brochures' AND (public.is_admin(auth.uid()) OR public.is_super_admin_user(auth.uid())));

DROP POLICY IF EXISTS "Admins delete brochures" ON storage.objects;
CREATE POLICY "Admins delete brochures"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'brochures' AND (public.is_admin(auth.uid()) OR public.is_super_admin_user(auth.uid())));
