
CREATE TABLE public.loan_quote_share_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  car_model text,
  car_variant text,
  loan_amount numeric,
  down_payment numeric,
  interest_rate numeric,
  tenure_months integer,
  emi_amount numeric,
  total_payment numeric,
  total_interest numeric,
  bank_name text,
  bank_comparison jsonb,
  share_method text NOT NULL DEFAULT 'download',
  pdf_storage_path text,
  quote_ref text,
  notes text,
  loan_application_id uuid REFERENCES public.loan_applications(id) ON DELETE SET NULL,
  source text DEFAULT 'website',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '90 days')
);

ALTER TABLE public.loan_quote_share_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read loan quote history"
  ON public.loan_quote_share_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert loan quote history"
  ON public.loan_quote_share_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Anon users can insert loan quote history"
  ON public.loan_quote_share_history FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX idx_loan_quote_share_phone ON public.loan_quote_share_history(customer_phone);
CREATE INDEX idx_loan_quote_share_app_id ON public.loan_quote_share_history(loan_application_id);
