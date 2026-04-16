INSERT INTO storage.buckets (id, name, public) VALUES ('wa-media', 'wa-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "WA media is publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'wa-media');

CREATE POLICY "Authenticated users can upload wa media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'wa-media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update wa media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'wa-media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete wa media"
ON storage.objects FOR DELETE
USING (bucket_id = 'wa-media' AND auth.role() = 'authenticated');