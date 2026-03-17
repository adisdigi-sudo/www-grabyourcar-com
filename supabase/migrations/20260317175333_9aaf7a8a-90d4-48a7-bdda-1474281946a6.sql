
-- ══════════════════════════════════════════════════
-- Accounts & Finance: Double-Entry Bookkeeping System
-- ══════════════════════════════════════════════════

-- Chart of Accounts (Ledger)
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'asset', -- asset, liability, equity, revenue, expense
  parent_id UUID REFERENCES public.chart_of_accounts(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  opening_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Journal Entries (Double-entry debit/credit)
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  reference_number TEXT,
  reference_type TEXT, -- invoice, receipt, payment, adjustment
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, posted, void
  created_by TEXT,
  approved_by TEXT,
  posted_at TIMESTAMPTZ,
  fiscal_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  fiscal_month TEXT DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'),
  notes TEXT,
  attachments TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Journal Entry Lines (debit/credit lines)
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  client_address TEXT,
  gstin TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft, sent, paid, partial, overdue, cancelled
  payment_mode TEXT,
  vertical_name TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bank Reconciliation
CREATE TABLE IF NOT EXISTS public.bank_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  account_number TEXT,
  statement_date DATE NOT NULL,
  bank_balance NUMERIC DEFAULT 0,
  book_balance NUMERIC DEFAULT 0,
  reconciled_balance NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, reconciled, discrepancy
  items JSONB DEFAULT '[]'::jsonb, -- matched/unmatched transactions
  notes TEXT,
  reconciled_by TEXT,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════
-- HR: Payroll, Documents, Performance
-- ══════════════════════════════════════════════════

-- Payroll Records
CREATE TABLE IF NOT EXISTS public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name TEXT NOT NULL,
  employee_id TEXT,
  department TEXT,
  designation TEXT,
  payroll_month TEXT NOT NULL, -- YYYY-MM
  basic_salary NUMERIC DEFAULT 0,
  hra NUMERIC DEFAULT 0,
  da NUMERIC DEFAULT 0,
  special_allowance NUMERIC DEFAULT 0,
  other_allowances NUMERIC DEFAULT 0,
  gross_salary NUMERIC DEFAULT 0,
  pf_deduction NUMERIC DEFAULT 0,
  esi_deduction NUMERIC DEFAULT 0,
  tds NUMERIC DEFAULT 0,
  professional_tax NUMERIC DEFAULT 0,
  other_deductions NUMERIC DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  net_salary NUMERIC DEFAULT 0,
  payment_mode TEXT DEFAULT 'bank_transfer',
  payment_status TEXT DEFAULT 'pending', -- pending, processed, paid
  payment_date DATE,
  bank_account TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Employee Documents (KYC, Contracts)
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name TEXT NOT NULL,
  employee_id TEXT,
  document_type TEXT NOT NULL, -- aadhaar, pan, bank_passbook, offer_letter, contract, experience_letter, resume, photo, other
  document_name TEXT NOT NULL,
  document_number TEXT,
  document_url TEXT,
  expiry_date DATE,
  is_verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Reviews
CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name TEXT NOT NULL,
  employee_id TEXT,
  review_period TEXT NOT NULL, -- e.g. "Q1 2026", "Annual 2025"
  reviewer_name TEXT,
  overall_rating NUMERIC, -- 1-5
  kra_scores JSONB DEFAULT '[]'::jsonb, -- [{kra: "Sales Target", weight: 30, score: 4, remarks: "..."}]
  strengths TEXT,
  areas_of_improvement TEXT,
  goals_next_period TEXT,
  increment_percentage NUMERIC,
  increment_amount NUMERIC,
  status TEXT DEFAULT 'draft', -- draft, submitted, approved
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies — Admin-only access for all finance/HR tables
CREATE POLICY "Admin access chart_of_accounts" ON public.chart_of_accounts FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin access journal_entries" ON public.journal_entries FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin access journal_entry_lines" ON public.journal_entry_lines FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin access invoices" ON public.invoices FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin access bank_reconciliation" ON public.bank_reconciliation FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin access payroll_records" ON public.payroll_records FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin access employee_documents" ON public.employee_documents FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin access performance_reviews" ON public.performance_reviews FOR ALL USING (public.is_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_journal_entries_fiscal ON public.journal_entries(fiscal_month);
CREATE INDEX idx_journal_entries_status ON public.journal_entries(status);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_payroll_month ON public.payroll_records(payroll_month);
CREATE INDEX idx_performance_period ON public.performance_reviews(review_period);

-- Seed default Chart of Accounts
INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, description) VALUES
('1000', 'Cash', 'asset', 'Cash in hand'),
('1010', 'Bank Account - Primary', 'asset', 'Primary bank account'),
('1020', 'Bank Account - Secondary', 'asset', 'Secondary bank account'),
('1100', 'Accounts Receivable', 'asset', 'Money owed by customers'),
('1200', 'Inventory', 'asset', 'Stock and inventory'),
('2000', 'Accounts Payable', 'liability', 'Money owed to suppliers'),
('2100', 'GST Payable', 'liability', 'GST liability'),
('2200', 'TDS Payable', 'liability', 'TDS payable'),
('2300', 'Salaries Payable', 'liability', 'Salaries pending'),
('3000', 'Owner Equity', 'equity', 'Owner investment'),
('3100', 'Retained Earnings', 'equity', 'Accumulated profits'),
('4000', 'Car Sales Revenue', 'revenue', 'Income from car sales'),
('4010', 'Insurance Commission', 'revenue', 'Insurance commissions'),
('4020', 'Loan Commission', 'revenue', 'Loan disbursement commissions'),
('4030', 'HSRP Revenue', 'revenue', 'HSRP service income'),
('4040', 'Rental Income', 'revenue', 'Self-drive rental income'),
('4050', 'Accessories Revenue', 'revenue', 'Accessories sales'),
('4060', 'Other Income', 'revenue', 'Miscellaneous income'),
('5000', 'Salaries & Wages', 'expense', 'Employee salaries'),
('5010', 'Rent', 'expense', 'Office/showroom rent'),
('5020', 'Utilities', 'expense', 'Electricity, water, internet'),
('5030', 'Marketing & Ads', 'expense', 'Advertising expenses'),
('5040', 'Software & Tools', 'expense', 'SaaS subscriptions'),
('5050', 'Travel & Conveyance', 'expense', 'Travel expenses'),
('5060', 'Office Supplies', 'expense', 'Stationery and supplies'),
('5070', 'Professional Fees', 'expense', 'CA, Legal fees'),
('5080', 'Depreciation', 'expense', 'Asset depreciation'),
('5090', 'Miscellaneous', 'expense', 'Other expenses')
ON CONFLICT (account_code) DO NOTHING;
