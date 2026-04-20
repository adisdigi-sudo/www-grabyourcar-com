-- Allow anonymous Riya chat widget uploads to wa-media under riya-uploads/* prefix only
CREATE POLICY "Public can upload riya chat attachments"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'wa-media'
  AND (storage.foldername(name))[1] = 'riya-uploads'
);