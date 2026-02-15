
-- Insurance page content management table
CREATE TABLE public.insurance_page_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.insurance_page_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read insurance content"
  ON public.insurance_page_content FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage insurance content"
  ON public.insurance_page_content FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Insurance leads tracking table
CREATE TABLE public.insurance_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  vehicle_number TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  policy_type TEXT DEFAULT 'comprehensive',
  ownership_type TEXT DEFAULT 'individual',
  current_insurer TEXT,
  policy_expiry DATE,
  source TEXT DEFAULT 'insurance_page',
  status TEXT DEFAULT 'new',
  assigned_to UUID,
  notes TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage insurance leads"
  ON public.insurance_leads FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Anon can insert insurance leads"
  ON public.insurance_leads FOR INSERT
  WITH CHECK (true);

CREATE TRIGGER update_insurance_leads_updated_at
  BEFORE UPDATE ON public.insurance_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insurance_page_content_updated_at
  BEFORE UPDATE ON public.insurance_page_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default insurance page content
INSERT INTO public.insurance_page_content (section_key, content, sort_order) VALUES
('hero', '{
  "badge_text": "Save Up to 80%",
  "heading": "Get the Best Car Insurance in Minutes",
  "heading_highlight": "Car Insurance",
  "subheading": "Compare quotes from India''s top insurers, enjoy instant policy issuance, and get hassle-free claims with 10,000+ cashless garages.",
  "trust_count": "50 Lakh+",
  "features": [
    {"icon": "CheckCircle2", "text": "20+ Insurers"},
    {"icon": "Shield", "text": "98% Claim Settlement"},
    {"icon": "Car", "text": "10,000+ Garages"}
  ]
}'::jsonb, 1),
('stats', '{
  "items": [
    {"value": 50, "suffix": "L+", "label": "Customers Insured", "icon": "Users"},
    {"value": 20, "suffix": "+", "label": "Insurance Partners", "icon": "Building2"},
    {"value": 98, "suffix": "%", "label": "Claim Settlement", "icon": "Star"},
    {"value": 2, "suffix": " min", "label": "Quick Quotes", "icon": "Clock"}
  ]
}'::jsonb, 2),
('claims_assistance', '{
  "heading": "Claims — We Handle It For You",
  "subheading": "Our dedicated team ensures your claim is processed quickly and hassle-free",
  "features": [
    {"title": "Dedicated Claims Manager", "description": "A personal manager assigned to guide you through the entire claim process", "icon": "UserCheck"},
    {"title": "Assisted Processing", "description": "We handle all paperwork, follow-ups, and coordination with the insurer", "icon": "FileCheck"},
    {"title": "Faster Resolution", "description": "Average claim settlement in 7 working days — 3x faster than industry average", "icon": "Zap"},
    {"title": "Cashless Network", "description": "10,000+ network garages for zero out-of-pocket repairs", "icon": "Building2"}
  ]
}'::jsonb, 6),
('trust', '{
  "heading": "Why India Trusts Grabyourcar for Insurance",
  "badges": [
    {"title": "Authorised Insurance Partner Network", "description": "Licensed aggregator working with IRDAI-approved insurers", "icon": "Shield"},
    {"title": "Trusted by Leading Corporates", "description": "Fleet insurance partner for 100+ businesses across India", "icon": "Building2"},
    {"title": "Dedicated Support Team", "description": "Expert advisors available Mon-Sat, 9 AM to 8 PM", "icon": "Headphones"},
    {"title": "Secure & Compliant", "description": "Bank-grade encryption and full regulatory compliance", "icon": "Lock"}
  ],
  "disclosure": "Grabyourcar is an authorised insurance marketing partner. All policies are issued by respective IRDAI-licensed insurers. We facilitate comparison and issuance — we do not underwrite policies."
}'::jsonb, 7),
('cta', '{
  "heading": "Ready to Protect Your Car?",
  "subheading": "Get the best car insurance quotes in just 2 minutes. Compare, choose, and buy online with instant policy issuance.",
  "primary_cta": "Get Free Quote",
  "secondary_cta": "Talk to Expert",
  "phone": "+919855924442"
}'::jsonb, 10);
