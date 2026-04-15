
-- Quote share history table
CREATE TABLE public.quote_share_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  vehicle_number text,
  vehicle_make text,
  vehicle_model text,
  vehicle_year text,
  insurance_company text,
  policy_type text,
  idv numeric,
  total_premium numeric,
  premium_breakup jsonb,
  addons text[],
  share_method text NOT NULL DEFAULT 'pdf_download',
  pdf_storage_path text,
  shared_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  quote_ref text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '3 months')
);

-- RLS
ALTER TABLE public.quote_share_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage quote_share_history"
  ON public.quote_share_history
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Index for auto-cleanup
CREATE INDEX idx_quote_share_history_expires ON public.quote_share_history (expires_at);

-- Storage bucket for quote PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-pdfs', 'quote-pdfs', true);

-- Storage RLS: authenticated users can upload
CREATE POLICY "Auth users can upload quote PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'quote-pdfs');

CREATE POLICY "Public read quote PDFs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'quote-pdfs');

CREATE POLICY "Auth users can delete quote PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'quote-pdfs');
