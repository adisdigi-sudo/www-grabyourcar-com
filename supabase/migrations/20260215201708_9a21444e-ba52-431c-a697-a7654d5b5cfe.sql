
-- Car Loan Leads table (OTP-verified leads only)
CREATE TABLE public.car_loan_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  name TEXT,
  pan_number TEXT,
  employment_type TEXT,
  monthly_income NUMERIC,
  age INTEGER,
  existing_emi NUMERIC DEFAULT 0,
  loan_amount_requested NUMERIC,
  tenure_months INTEGER,
  down_payment NUMERIC,
  city TEXT,
  
  -- Eligibility results
  eligibility_status TEXT DEFAULT 'pending',
  max_loan_eligible NUMERIC,
  max_emi_capacity NUMERIC,
  credit_score INTEGER,
  credit_check_provider TEXT,
  credit_check_response JSONB,
  
  -- Lead tracking
  source TEXT DEFAULT 'car_loan_page',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  lead_score INTEGER DEFAULT 0,
  lead_priority TEXT DEFAULT 'normal',
  buying_timeline TEXT,
  preferred_car TEXT,
  
  -- Status
  status TEXT DEFAULT 'new',
  assigned_to TEXT,
  notes TEXT,
  whatsapp_alert_sent BOOLEAN DEFAULT false,
  
  -- Timestamps
  otp_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.car_loan_leads ENABLE ROW LEVEL SECURITY;

-- Public can insert (verified leads from frontend)
CREATE POLICY "Anyone can create loan leads"
  ON public.car_loan_leads FOR INSERT
  WITH CHECK (true);

-- Only admins can read/update/delete
CREATE POLICY "Admins can manage loan leads"
  ON public.car_loan_leads FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Loan page settings (admin-controlled content)
CREATE TABLE public.loan_page_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_page_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read loan page settings"
  ON public.loan_page_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage loan page settings"
  ON public.loan_page_settings FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Loan partners table (bank/NBFC data managed by admin)
CREATE TABLE public.loan_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  interest_rate_min NUMERIC NOT NULL DEFAULT 8.5,
  interest_rate_max NUMERIC NOT NULL DEFAULT 12,
  processing_fee TEXT DEFAULT '0.50%',
  max_tenure_years INTEGER DEFAULT 7,
  max_amount NUMERIC DEFAULT 5000000,
  rating NUMERIC DEFAULT 4.5,
  features TEXT[] DEFAULT '{}',
  highlight TEXT,
  partner_type TEXT DEFAULT 'bank',
  apply_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loan_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active loan partners"
  ON public.loan_partners FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage loan partners"
  ON public.loan_partners FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_car_loan_leads_updated_at
  BEFORE UPDATE ON public.car_loan_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loan_page_settings_updated_at
  BEFORE UPDATE ON public.loan_page_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loan_partners_updated_at
  BEFORE UPDATE ON public.loan_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default loan partners
INSERT INTO public.loan_partners (name, interest_rate_min, interest_rate_max, processing_fee, max_tenure_years, max_amount, rating, features, highlight, sort_order) VALUES
('HDFC Bank', 8.50, 9.50, '0.50%', 7, 5000000, 4.8, ARRAY['Quick Approval', 'Minimal Docs', 'Doorstep Service'], 'Most Popular', 1),
('SBI Car Loan', 8.65, 9.80, '0.40%', 7, 10000000, 4.7, ARRAY['Lowest Processing Fee', 'High Loan Amount', 'Special Rates for Women'], 'Lowest Fees', 2),
('ICICI Bank', 8.75, 10.00, '0.50%', 7, 7500000, 4.6, ARRAY['Pre-approved Offers', 'Instant Disbursal', 'Flexible EMI'], 'Fastest Approval', 3),
('Axis Bank', 8.99, 10.25, '0.50%', 7, 5000000, 4.5, ARRAY['Zero Foreclosure', 'Top-up Loan', 'Online Application'], NULL, 4),
('Kotak Mahindra', 8.85, 9.75, '0.50%', 5, 4000000, 4.4, ARRAY['Quick Processing', 'Easy Documentation', 'Part-payment'], NULL, 5),
('Bank of Baroda', 8.45, 9.25, '0.25%', 7, 5000000, 4.3, ARRAY['Lowest Interest', 'Minimal Processing Fee', 'Govt. Bank Trust'], 'Best Rate', 6);

-- Seed default page settings
INSERT INTO public.loan_page_settings (setting_key, setting_value) VALUES
('hero', '{"title": "Car Loan at Best Rates", "subtitle": "Get instant approval from 15+ banks starting 8.45% p.a.", "badge": "Lowest Interest Rates", "stats": [{"label": "Starting Rate", "value": "8.45%"}, {"label": "Approval Time", "value": "30 mins"}, {"label": "Max Amount", "value": "₹1 Crore"}]}'),
('trust_badges', '["RBI Registered Partners", "256-bit SSL Encrypted", "50+ Bank Tie-ups", "1 Lakh+ Loans Disbursed"]'),
('cta_text', '{"primary": "Check Your Eligibility", "secondary": "Get Pre-Approved Now", "whatsapp": "Talk to Loan Expert"}'),
('seo', '{"title": "Car Loan Online | Instant Approval from 8.45% | GrabYourCar", "description": "Apply for car loan online. Compare rates from 15+ banks, get instant eligibility check, and same-day approval. Starting 8.45% p.a. with zero processing fee.", "keywords": ["car loan", "car loan online", "instant car loan approval", "car loan eligibility", "new car finance"]}');
