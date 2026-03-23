
-- HR Recruitment table
CREATE TABLE IF NOT EXISTS public.hr_recruitment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_title text NOT NULL,
  department text,
  experience_required text,
  job_type text DEFAULT 'full_time',
  location text,
  salary_range text,
  description text,
  requirements text,
  status text DEFAULT 'open',
  applicant_name text,
  applicant_phone text,
  applicant_email text,
  resume_url text,
  interview_date timestamptz,
  interview_notes text,
  interview_rating numeric,
  offered_salary numeric,
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- HR Assets table
CREATE TABLE IF NOT EXISTS public.hr_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name text NOT NULL,
  asset_type text NOT NULL,
  asset_tag text,
  serial_number text,
  purchase_date date,
  purchase_cost numeric DEFAULT 0,
  condition text DEFAULT 'good',
  assigned_to text,
  assigned_date date,
  return_date date,
  status text DEFAULT 'available',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- HR Expense Claims table 
CREATE TABLE IF NOT EXISTS public.hr_expense_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name text NOT NULL,
  employee_id text,
  claim_date date DEFAULT CURRENT_DATE,
  category text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  receipt_url text,
  status text DEFAULT 'pending',
  approved_by text,
  approved_at timestamptz,
  rejection_reason text,
  payment_date date,
  payment_mode text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- HR Helpdesk tickets
CREATE TABLE IF NOT EXISTS public.hr_helpdesk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text,
  employee_name text NOT NULL,
  category text NOT NULL,
  subject text NOT NULL,
  description text,
  priority text DEFAULT 'medium',
  status text DEFAULT 'open',
  assigned_to text,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- HR Engagement (announcements, polls, celebrations)
CREATE TABLE IF NOT EXISTS public.hr_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'announcement',
  title text NOT NULL,
  content text,
  category text,
  target_department text,
  is_active boolean DEFAULT true,
  reactions jsonb DEFAULT '{}',
  created_by text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Accounts: bank_accounts table for Zoho Books style banking
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name text NOT NULL,
  bank_name text,
  account_number text,
  ifsc_code text,
  account_type text DEFAULT 'savings',
  current_balance numeric DEFAULT 0,
  opening_balance numeric DEFAULT 0,
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  currency text DEFAULT 'INR',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Accounts: payment_received tracking
CREATE TABLE IF NOT EXISTS public.payment_received (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number text,
  payment_date date DEFAULT CURRENT_DATE,
  invoice_id uuid REFERENCES public.invoices(id),
  customer_name text,
  amount numeric NOT NULL DEFAULT 0,
  payment_mode text DEFAULT 'bank_transfer',
  reference_number text,
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Accounts: bills (vendor bills / payables)
CREATE TABLE IF NOT EXISTS public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number text,
  vendor_name text NOT NULL,
  vendor_phone text,
  vendor_email text,
  vendor_gstin text,
  bill_date date DEFAULT CURRENT_DATE,
  due_date date,
  items jsonb DEFAULT '[]',
  subtotal numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  balance_due numeric DEFAULT 0,
  status text DEFAULT 'pending',
  payment_mode text,
  vertical_name text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.hr_recruitment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_helpdesk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- RLS policies: admin-only access for all HR/finance tables
CREATE POLICY "Admin access hr_recruitment" ON public.hr_recruitment FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin access hr_assets" ON public.hr_assets FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin access hr_expense_claims" ON public.hr_expense_claims FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin access hr_helpdesk" ON public.hr_helpdesk FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin access hr_engagement" ON public.hr_engagement FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin access bank_accounts" ON public.bank_accounts FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin access payment_received" ON public.payment_received FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin access bills" ON public.bills FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
