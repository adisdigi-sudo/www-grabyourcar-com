
-- Create public bucket for WhatsApp template media (header images, videos, documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wa-template-media',
  'wa-template-media',
  true,
  16777216, -- 16MB
  ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/3gpp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 16777216,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/3gpp','application/pdf'];

-- Public read policy
DROP POLICY IF EXISTS "wa_template_media_public_read" ON storage.objects;
CREATE POLICY "wa_template_media_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'wa-template-media');

-- Authenticated users can upload
DROP POLICY IF EXISTS "wa_template_media_auth_upload" ON storage.objects;
CREATE POLICY "wa_template_media_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wa-template-media');

-- Authenticated users can update/delete (admin tools)
DROP POLICY IF EXISTS "wa_template_media_auth_update" ON storage.objects;
CREATE POLICY "wa_template_media_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'wa-template-media');

DROP POLICY IF EXISTS "wa_template_media_auth_delete" ON storage.objects;
CREATE POLICY "wa_template_media_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'wa-template-media');
