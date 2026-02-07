
-- Create storage bucket for car brochures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('brochures', 'brochures', true, 52428800, ARRAY['application/pdf']);

-- Create policy for public read access
CREATE POLICY "Public can view brochures"
ON storage.objects FOR SELECT
USING (bucket_id = 'brochures');

-- Create policy for authenticated users to upload brochures
CREATE POLICY "Authenticated users can upload brochures"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'brochures' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to update brochures
CREATE POLICY "Authenticated users can update brochures"
ON storage.objects FOR UPDATE
USING (bucket_id = 'brochures' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to delete brochures
CREATE POLICY "Authenticated users can delete brochures"
ON storage.objects FOR DELETE
USING (bucket_id = 'brochures' AND auth.role() = 'authenticated');
