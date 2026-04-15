
CREATE TABLE public.car_sales_quote_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  car_brand TEXT,
  car_model TEXT,
  car_variant TEXT,
  car_color TEXT,
  city TEXT,
  ex_showroom_price NUMERIC,
  on_road_price NUMERIC,
  final_price NUMERIC,
  discount_amount NUMERIC,
  discount_type TEXT,
  price_breakup JSONB,
  -- Loan offer fields
  include_loan_offer BOOLEAN DEFAULT false,
  bank_name TEXT,
  booking_amount NUMERIC,
  processing_fees NUMERIC,
  other_loan_expenses NUMERIC,
  loan_amount NUMERIC,
  interest_rate NUMERIC,
  tenure_months INTEGER,
  emi_amount NUMERIC,
  total_payment NUMERIC,
  total_interest NUMERIC,
  -- Meta
  share_method TEXT NOT NULL DEFAULT 'pdf_download',
  pdf_storage_path TEXT,
  quote_ref TEXT,
  notes TEXT,
  source TEXT DEFAULT 'manual_quote',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.car_sales_quote_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage car sales quotes"
  ON public.car_sales_quote_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
