
-- Create car-assets storage bucket for locally hosted car images
INSERT INTO storage.buckets (id, name, public) VALUES ('car-assets', 'car-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Car assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'car-assets');

-- Allow service role to upload
CREATE POLICY "Service role can upload car assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'car-assets');

CREATE POLICY "Service role can update car assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'car-assets');
