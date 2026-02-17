
-- Loan pipeline stages tracking
CREATE TABLE public.loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.car_loan_leads(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  loan_amount NUMERIC,
  tenure_months INT,
  interest_rate NUMERIC,
  emi_amount NUMERIC,
  bank_partner_id UUID,
  stage TEXT NOT NULL DEFAULT 'new',
  stage_updated_at TIMESTAMPTZ DEFAULT now(),
  car_model TEXT,
  car_variant TEXT,
  dealer_name TEXT,
  down_payment NUMERIC,
  processing_fee NUMERIC,
  sanction_amount NUMERIC,
  sanction_date DATE,
  disbursement_amount NUMERIC,
  disbursement_date DATE,
  disbursement_reference TEXT,
  rejection_reason TEXT,
  documents_collected TEXT[] DEFAULT '{}',
  assigned_to UUID,
  priority TEXT DEFAULT 'medium',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bank/NBFC partner details for loan CRM
CREATE TABLE public.loan_bank_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT,
  logo_url TEXT,
  partner_type TEXT NOT NULL DEFAULT 'bank',
  interest_rate_min NUMERIC,
  interest_rate_max NUMERIC,
  max_tenure_months INT DEFAULT 84,
  max_loan_amount NUMERIC,
  processing_fee_percent NUMERIC,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  commission_percent NUMERIC,
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Loan application activity log
CREATE TABLE public.loan_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.loan_applications(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  performed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK from loan_applications to loan_bank_partners
ALTER TABLE public.loan_applications
  ADD CONSTRAINT loan_applications_bank_partner_fk
  FOREIGN KEY (bank_partner_id) REFERENCES public.loan_bank_partners(id);

-- Enable RLS
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_bank_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS: loan_applications
CREATE POLICY "Authenticated can view loan applications"
ON public.loan_applications FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage loan applications"
ON public.loan_applications FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'finance') OR public.has_role(auth.uid(), 'sales'));

CREATE POLICY "Admins can update loan applications"
ON public.loan_applications FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'finance') OR public.has_role(auth.uid(), 'sales'));

CREATE POLICY "Admins can delete loan applications"
ON public.loan_applications FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS: loan_bank_partners
CREATE POLICY "Authenticated can view bank partners"
ON public.loan_bank_partners FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage bank partners"
ON public.loan_bank_partners FOR ALL TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS: loan_activity_log
CREATE POLICY "Authenticated can view loan activity"
ON public.loan_activity_log FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert loan activity"
ON public.loan_activity_log FOR INSERT TO authenticated
WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_loan_applications_updated_at
BEFORE UPDATE ON public.loan_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loan_bank_partners_updated_at
BEFORE UPDATE ON public.loan_bank_partners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for loan applications
ALTER PUBLICATION supabase_realtime ADD TABLE public.loan_applications;
