-- ============================================
-- TURN 1: Unified PDF Branding Foundation
-- ============================================

-- 1. Global branding (single master row)
CREATE TABLE IF NOT EXISTS public.pdf_global_branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'Grabyourcar',
  company_tagline TEXT DEFAULT 'India''s Trusted Auto Partner',
  logo_url TEXT,
  watermark_url TEXT,
  signature_url TEXT,
  signature_name TEXT DEFAULT 'Authorised Signatory',

  -- Visual identity
  brand_primary_color TEXT NOT NULL DEFAULT '#0F172A',
  brand_accent_color TEXT NOT NULL DEFAULT '#3B82F6',
  brand_text_color TEXT NOT NULL DEFAULT '#1F2937',
  brand_muted_color TEXT NOT NULL DEFAULT '#6B7280',
  font_heading TEXT NOT NULL DEFAULT 'Helvetica-Bold',
  font_body TEXT NOT NULL DEFAULT 'Helvetica',

  -- Contact block
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  phone TEXT,
  alt_phone TEXT,
  email TEXT,
  website TEXT DEFAULT 'www.grabyourcar.com',

  -- Compliance
  gstin TEXT,
  pan TEXT,
  cin TEXT,
  irdai_license TEXT,

  -- Bank (default)
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_branch TEXT,
  upi_id TEXT,

  -- Footer/legal
  footer_text TEXT DEFAULT 'Thank you for choosing Grabyourcar.',
  default_terms TEXT,
  social_links JSONB DEFAULT '{"instagram":"","facebook":"","linkedin":"","youtube":"","twitter":""}'::jsonb,

  -- Layout knobs
  page_size TEXT NOT NULL DEFAULT 'a4',
  margin_top NUMERIC NOT NULL DEFAULT 14,
  margin_bottom NUMERIC NOT NULL DEFAULT 14,
  margin_left NUMERIC NOT NULL DEFAULT 12,
  margin_right NUMERIC NOT NULL DEFAULT 12,
  show_watermark BOOLEAN NOT NULL DEFAULT false,
  show_qr_footer BOOLEAN NOT NULL DEFAULT true,

  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_global_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read global branding"
  ON public.pdf_global_branding FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert global branding"
  ON public.pdf_global_branding FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update global branding"
  ON public.pdf_global_branding FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete global branding"
  ON public.pdf_global_branding FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_pdf_global_branding_updated_at
  BEFORE UPDATE ON public.pdf_global_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Per-vertical PDF settings + template sections
CREATE TABLE IF NOT EXISTS public.pdf_vertical_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vertical_slug TEXT NOT NULL UNIQUE,
  vertical_label TEXT NOT NULL,
  document_types JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Branding overrides (null = inherit from global)
  override_brand_color TEXT,
  override_accent_color TEXT,
  override_logo_url TEXT,
  override_signature_url TEXT,
  override_signature_name TEXT,
  override_footer_text TEXT,
  override_terms TEXT,

  -- Template sections (drag-drop ordering)
  -- [{id, type, label, enabled, order, config}]
  template_sections JSONB NOT NULL DEFAULT '[
    {"id":"header","type":"header","label":"Brand Header","enabled":true,"order":1},
    {"id":"doc_meta","type":"doc_meta","label":"Document Number & Date","enabled":true,"order":2},
    {"id":"customer","type":"customer","label":"Customer Details","enabled":true,"order":3},
    {"id":"vehicle","type":"vehicle","label":"Vehicle / Item Details","enabled":true,"order":4},
    {"id":"items","type":"items","label":"Line Items / Pricing Table","enabled":true,"order":5},
    {"id":"totals","type":"totals","label":"Totals & Tax","enabled":true,"order":6},
    {"id":"notes","type":"notes","label":"Notes","enabled":true,"order":7},
    {"id":"terms","type":"terms","label":"Terms & Conditions","enabled":true,"order":8},
    {"id":"bank","type":"bank","label":"Bank / Payment Details","enabled":false,"order":9},
    {"id":"signature","type":"signature","label":"Signature Block","enabled":true,"order":10},
    {"id":"footer","type":"footer","label":"Footer & Social","enabled":true,"order":11}
  ]'::jsonb,

  -- Custom fields injected into PDF: [{key, label, default_value, position}]
  custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb,

  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_vertical_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read vertical settings"
  ON public.pdf_vertical_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage vertical settings - insert"
  ON public.pdf_vertical_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage vertical settings - update"
  ON public.pdf_vertical_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage vertical settings - delete"
  ON public.pdf_vertical_settings FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_pdf_vertical_settings_updated_at
  BEFORE UPDATE ON public.pdf_vertical_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pdf_vertical_settings_slug ON public.pdf_vertical_settings(vertical_slug);

-- 3. Manual generation audit log
CREATE TABLE IF NOT EXISTS public.pdf_manual_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vertical_slug TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  related_record_id UUID,
  related_record_table TEXT,
  pdf_url TEXT,
  pdf_storage_path TEXT,
  payload JSONB,
  generated_by UUID,
  generated_by_name TEXT,
  delivery_channels TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_manual_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all manual generations"
  ON public.pdf_manual_generations FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR generated_by = auth.uid());

CREATE POLICY "Authenticated users can log their own generations"
  ON public.pdf_manual_generations FOR INSERT
  TO authenticated
  WITH CHECK (generated_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete manual generations"
  ON public.pdf_manual_generations FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_pdf_manual_generations_vertical ON public.pdf_manual_generations(vertical_slug);
CREATE INDEX idx_pdf_manual_generations_created ON public.pdf_manual_generations(created_at DESC);
CREATE INDEX idx_pdf_manual_generations_user ON public.pdf_manual_generations(generated_by);

-- 4. Storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-branding-assets', 'pdf-branding-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Branding assets are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pdf-branding-assets');

CREATE POLICY "Admins can upload branding assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pdf-branding-assets' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update branding assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pdf-branding-assets' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete branding assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pdf-branding-assets' AND public.is_admin(auth.uid()));

-- 5. Seed default global branding (only if empty)
INSERT INTO public.pdf_global_branding (
  company_name, company_tagline,
  brand_primary_color, brand_accent_color,
  city, state, phone, email, website,
  footer_text, default_terms,
  social_links
)
SELECT
  'Grabyourcar',
  'India''s Trusted Auto Partner',
  '#0F172A',
  '#3B82F6',
  'Chandigarh', 'Punjab',
  '+91 98559 24442',
  'support@grabyourcar.com',
  'www.grabyourcar.com',
  'Thank you for choosing Grabyourcar. For support: support@grabyourcar.com | +91 98559 24442',
  'All transactions are subject to Grabyourcar terms & conditions. Prices and offers are indicative and may change without notice. E&OE.',
  '{"instagram":"https://instagram.com/grabyourcar","facebook":"https://facebook.com/grabyourcar","linkedin":"https://linkedin.com/company/grabyourcar","youtube":"","twitter":""}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.pdf_global_branding);

-- 6. Seed per-vertical default settings
INSERT INTO public.pdf_vertical_settings (vertical_slug, vertical_label, document_types)
VALUES
  ('sales',           'Car Sales',       '["quote","booking_confirmation","delivery_note","invoice"]'::jsonb),
  ('loans',           'Car Loans',       '["loan_comparison","loan_offer","sanction_letter"]'::jsonb),
  ('insurance',       'Insurance',       '["quote","policy_schedule","renewal_notice","claim_intimation"]'::jsonb),
  ('hsrp',            'HSRP',            '["order_receipt","fitment_certificate","invoice"]'::jsonb),
  ('fastag',          'Fastag',          '["activation_receipt","invoice"]'::jsonb),
  ('self-drive',      'Self-Drive',      '["rental_agreement","vehicle_handover","return_invoice"]'::jsonb),
  ('accessories',     'Accessories',     '["order_invoice","shipping_label","return_note"]'::jsonb),
  ('dealer-network',  'Dealer Network',  '["stock_quote","daily_stock_report"]'::jsonb),
  ('hr',              'HR',              '["offer_letter","appointment_letter","payslip","experience_letter","relieving_letter"]'::jsonb),
  ('finance',         'Finance',         '["invoice","bill_receipt","payment_receipt","credit_note"]'::jsonb)
ON CONFLICT (vertical_slug) DO NOTHING;