-- Create storage bucket for car images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'car-images',
  'car-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for car-images bucket
CREATE POLICY "Car images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'car-images');

CREATE POLICY "Authenticated users can upload car images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'car-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update car images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'car-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete car images"
ON storage.objects FOR DELETE
USING (bucket_id = 'car-images' AND auth.role() = 'authenticated');

-- Add image_sync_status to car_colors for tracking
ALTER TABLE car_colors 
ADD COLUMN IF NOT EXISTS image_sync_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS image_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS image_source TEXT;

-- Add image tracking to cars table
ALTER TABLE cars
ADD COLUMN IF NOT EXISTS images_synced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS images_synced_at TIMESTAMPTZ;