
-- Create car-images storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('car-images', 'car-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to car-images bucket
CREATE POLICY "Public can view car images"
ON storage.objects FOR SELECT
USING (bucket_id = 'car-images');

-- Allow service role to upload car images
CREATE POLICY "Service can upload car images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'car-images');

-- Allow service role to update car images
CREATE POLICY "Service can update car images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'car-images');
