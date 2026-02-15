
-- Insurance Plans managed from admin
CREATE TABLE public.insurance_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insurer_name TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'comprehensive',
  premium_display TEXT NOT NULL,
  premium_value NUMERIC NOT NULL DEFAULT 0,
  idv TEXT,
  claim_settlement_ratio TEXT,
  features TEXT[] DEFAULT '{}',
  cashless_garages TEXT,
  rating NUMERIC DEFAULT 4.0,
  logo_url TEXT,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insurance page content sections (hero text, features, policy types etc)
CREATE TABLE public.insurance_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  section_title TEXT,
  section_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insurance FAQ managed from admin
CREATE TABLE public.insurance_faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insurance add-on services
CREATE TABLE public.insurance_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon_name TEXT DEFAULT 'Shield',
  tag TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scraped insurance data cache
CREATE TABLE public.insurance_scraped_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_name TEXT DEFAULT 'acko',
  scraped_content JSONB NOT NULL DEFAULT '{}',
  content_type TEXT DEFAULT 'page',
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_scraped_data ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public can read active insurance plans" ON public.insurance_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read active insurance content" ON public.insurance_content FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read active insurance faqs" ON public.insurance_faqs FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read active insurance addons" ON public.insurance_addons FOR SELECT USING (is_active = true);
CREATE POLICY "Public can read scraped data" ON public.insurance_scraped_data FOR SELECT USING (is_active = true);

-- Admin write policies
CREATE POLICY "Admins can manage insurance plans" ON public.insurance_plans FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage insurance content" ON public.insurance_content FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage insurance faqs" ON public.insurance_faqs FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage insurance addons" ON public.insurance_addons FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can manage scraped data" ON public.insurance_scraped_data FOR ALL USING (public.is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_insurance_plans_updated_at BEFORE UPDATE ON public.insurance_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_insurance_content_updated_at BEFORE UPDATE ON public.insurance_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_insurance_faqs_updated_at BEFORE UPDATE ON public.insurance_faqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_insurance_addons_updated_at BEFORE UPDATE ON public.insurance_addons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default content
INSERT INTO public.insurance_content (section_key, section_title, section_data) VALUES
('hero', 'Hero Section', '{"headline": "Car Insurance", "subheadline": "Starting at just ₹2,094*/year", "tagline": "Buy or Renew in 2 Minutes", "live_counter": "2,847 policies sold today"}'),
('key_features', 'Key Features', '{"features": [{"title": "Low Premiums", "desc": "Starting at ₹2,094* with up to 85% discount", "icon": "CreditCard"}, {"title": "Zero Paperwork", "desc": "100% online — buy or renew in 2 minutes", "icon": "FileText"}, {"title": "Instant Claims", "desc": "Minor claims settled instantly, majors within 7 days", "icon": "Zap"}, {"title": "No Claim Bonus", "desc": "Save up to 50% with consecutive claim-free years", "icon": "Star"}]}'),
('policy_types', 'Policy Types', '{"types": [{"title": "Third Party Insurance", "tag": "Mandatory", "desc": "Covers damages to others vehicle, property, or injuries. Required by law.", "color": "bg-blue-500"}, {"title": "Comprehensive Insurance", "tag": "Recommended", "desc": "Includes Third Party + own damage from accidents, theft, fire, natural disasters.", "color": "bg-primary"}, {"title": "Zero Depreciation", "tag": "Premium", "desc": "Full claim without depreciation deduction on parts. 100% cost coverage.", "color": "bg-amber-500"}, {"title": "Own Damage Cover", "tag": "Add-on", "desc": "Standalone cover for damage to your own car.", "color": "bg-emerald-500"}]}'),
('trust_badges', 'Trust Badges', '{"badges": [{"title": "Authorised Insurance Partner", "description": "Licensed aggregator working with IRDAI-approved insurers", "icon": "Shield"}, {"title": "Trusted by Corporates", "description": "Fleet insurance partner for 100+ businesses", "icon": "Building2"}, {"title": "Dedicated Support", "description": "Expert advisors Mon-Sat, 9 AM to 8 PM", "icon": "Headphones"}, {"title": "Secure & Compliant", "description": "Bank-grade encryption and regulatory compliance", "icon": "Lock"}]}'),
('claims', 'Claims Assistance', '{"features": [{"title": "Dedicated Claims Manager", "description": "Personal manager for entire claim process", "icon": "UserCheck"}, {"title": "Assisted Processing", "description": "We handle all paperwork and follow-ups", "icon": "FileCheck"}, {"title": "Faster Resolution", "description": "Average settlement in 7 working days", "icon": "Zap"}, {"title": "Cashless Network", "description": "10,000+ network garages", "icon": "Building2"}]}');

-- Seed default plans
INSERT INTO public.insurance_plans (insurer_name, plan_type, premium_display, premium_value, idv, claim_settlement_ratio, features, cashless_garages, rating, is_popular, sort_order) VALUES
('HDFC ERGO', 'Comprehensive', '₹4,999', 4999, '₹6,50,000', '98.3%', ARRAY['Zero Depreciation', '24/7 RSA', 'NCB Protection', 'Engine Cover'], '7,500+', 4.5, true, 1),
('ICICI Lombard', 'Comprehensive', '₹5,199', 5199, '₹6,45,000', '97.8%', ARRAY['Personal Accident', 'Engine Protection', 'Key Replacement'], '6,800+', 4.4, false, 2),
('Bajaj Allianz', 'Comprehensive', '₹4,799', 4799, '₹6,40,000', '98.1%', ARRAY['Consumables Cover', 'Return to Invoice', 'Tyre Cover'], '6,500+', 4.3, false, 3),
('Tata AIG', 'Third Party + OD', '₹5,399', 5399, '₹6,55,000', '95.0%', ARRAY['Tyre Protection', 'EMI Protection', 'Daily Allowance'], '5,500+', 4.2, false, 4);

-- Seed default FAQs
INSERT INTO public.insurance_faqs (question, answer, sort_order) VALUES
('What is the difference between Third Party and Comprehensive?', 'Third Party covers damages to others. Comprehensive includes Third Party + protection for your own car against accidents, theft, fire, etc.', 1),
('What is IDV (Insured Declared Value)?', 'IDV is the current market value of your car — the maximum you can claim if stolen or totally damaged.', 2),
('What is No Claim Bonus (NCB)?', 'NCB is a discount earned for claim-free years. Starts at 20% and goes up to 50% for 5+ years.', 3),
('What are add-on covers?', 'Extra protection beyond basic policy — Zero Depreciation, Engine Protection, RSA, Key Replacement etc.', 4),
('How do I file a claim?', 'Cashless: Visit network garage with policy. Reimbursement: Pay, collect bills, submit online. Inform insurer within 24 hours.', 5),
('Can I transfer insurance to new owner?', 'Yes, within 14 days of sale with transfer application and RC documents. NCB stays with original owner.', 6),
('What documents are needed?', 'New: RC, Invoice, PAN/Aadhaar. Renewal: Previous policy, RC. Everything is 100% online.', 7);

-- Seed default add-ons
INSERT INTO public.insurance_addons (title, description, icon_name, tag, sort_order) VALUES
('Extended Warranty', 'Protect beyond manufacturer warranty', 'Shield', 'Popular', 1),
('Roadside Assistance', '24/7 breakdown & towing support', 'Car', NULL, 2),
('Engine Protection', 'Cover engine & gearbox damage', 'Cog', 'Recommended', 3),
('Tyre Cover', 'Tyre damage & replacement cover', 'CircleDot', NULL, 4),
('Accessories Protection', 'Safeguard aftermarket additions', 'Package', NULL, 5),
('Maintenance Package', 'Scheduled service & parts coverage', 'Wrench', 'Coming Soon', 6);
