
-- Create storage bucket for policy documents
INSERT INTO storage.buckets (id, name, public) VALUES ('policy-documents', 'policy-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload policy documents
CREATE POLICY "Authenticated users can upload policy documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'policy-documents');

-- Allow public read access to policy documents
CREATE POLICY "Public read access for policy documents"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'policy-documents');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update policy documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'policy-documents');

-- Allow authenticated users to delete policy documents
CREATE POLICY "Authenticated users can delete policy documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'policy-documents');
