
-- Rental Agreements table
CREATE TABLE public.rental_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.rental_bookings(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  vehicle_name text,
  vehicle_number text,
  pickup_date text,
  dropoff_date text,
  pickup_location text,
  dropoff_location text,
  rental_amount numeric DEFAULT 0,
  security_deposit numeric DEFAULT 0,
  terms_html text NOT NULL,
  agreement_number text UNIQUE,
  status text NOT NULL DEFAULT 'draft',
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  shared_via_whatsapp boolean DEFAULT false,
  shared_at timestamptz,
  client_viewed_at timestamptz,
  client_signed_at timestamptz,
  client_signature_type text,
  client_signature_data text,
  client_signed_name text,
  client_ip_address text,
  client_user_agent text,
  admin_signed_at timestamptz,
  admin_signed_by text,
  created_by text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- KYC Documents table
CREATE TABLE public.rental_kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid REFERENCES public.rental_agreements(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  customer_name text,
  document_type text NOT NULL,
  document_number text,
  document_front_url text,
  document_back_url text,
  extracted_data jsonb DEFAULT '{}',
  verification_status text NOT NULL DEFAULT 'pending',
  verified_via text,
  verified_at timestamptz,
  verified_by text,
  rejection_reason text,
  surepass_response jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Agreement history/audit log
CREATE TABLE public.rental_agreement_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid REFERENCES public.rental_agreements(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  action_by text,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Auto-generate agreement numbers
CREATE OR REPLACE FUNCTION public.generate_agreement_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.agreement_number := 'GYC-AGR-' || to_char(now(), 'YYYYMMDD') || '-' || substring(NEW.id::text, 1, 6);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_agreement_number
  BEFORE INSERT ON public.rental_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_agreement_number();

-- Updated_at trigger
CREATE TRIGGER update_rental_agreements_updated_at
  BEFORE UPDATE ON public.rental_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_kyc_updated_at
  BEFORE UPDATE ON public.rental_kyc_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.rental_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_agreement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on rental_agreements" ON public.rental_agreements FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Public view via share token" ON public.rental_agreements FOR SELECT TO anon USING (share_token IS NOT NULL AND status != 'draft');

CREATE POLICY "Admins full access on rental_kyc_documents" ON public.rental_kyc_documents FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Anon upload kyc" ON public.rental_kyc_documents FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon view own kyc" ON public.rental_kyc_documents FOR SELECT TO anon USING (true);

CREATE POLICY "Admins full access on rental_agreement_history" ON public.rental_agreement_history FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Anon view agreement history" ON public.rental_agreement_history FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert agreement history" ON public.rental_agreement_history FOR INSERT TO anon WITH CHECK (true);

-- Anon can update agreements (for signing)
CREATE POLICY "Anon sign agreement" ON public.rental_agreements FOR UPDATE TO anon USING (share_token IS NOT NULL AND status = 'sent') WITH CHECK (share_token IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rental_agreements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rental_kyc_documents;

-- Storage bucket for KYC docs
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Admin access kyc storage" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'kyc-documents' AND public.is_admin(auth.uid()));
CREATE POLICY "Anon upload kyc storage" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'kyc-documents');
