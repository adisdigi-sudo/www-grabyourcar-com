-- Create a public storage bucket for broadcast media (images, videos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'broadcast-media',
  'broadcast-media',
  true,
  52428800, -- 50MB limit for videos
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Admins can upload broadcast media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'broadcast-media');

-- Allow public read access
CREATE POLICY "Public can view broadcast media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'broadcast-media');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Admins can delete broadcast media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'broadcast-media');