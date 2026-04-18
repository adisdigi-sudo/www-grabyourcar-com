-- Create branding-assets bucket for site logos, favicon, OG images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding-assets',
  'branding-assets',
  true,
  10485760,
  ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','image/svg+xml','image/x-icon','image/vnd.microsoft.icon']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/gif','image/svg+xml','image/x-icon','image/vnd.microsoft.icon'];

-- Public read access (logos/favicon need to be public)
DROP POLICY IF EXISTS "Branding assets are publicly viewable" ON storage.objects;
CREATE POLICY "Branding assets are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding-assets');

-- Authenticated users can upload (admin UI is gated by role on the app side)
DROP POLICY IF EXISTS "Authenticated can upload branding assets" ON storage.objects;
CREATE POLICY "Authenticated can upload branding assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding-assets');

DROP POLICY IF EXISTS "Authenticated can update branding assets" ON storage.objects;
CREATE POLICY "Authenticated can update branding assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'branding-assets');

DROP POLICY IF EXISTS "Authenticated can delete branding assets" ON storage.objects;
CREATE POLICY "Authenticated can delete branding assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'branding-assets');