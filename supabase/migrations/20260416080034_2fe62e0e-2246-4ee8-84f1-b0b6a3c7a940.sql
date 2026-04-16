
-- Payments Made table (vendor payments, currently only local state)
CREATE TABLE IF NOT EXISTS public.payments_made (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_number TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_mode TEXT,
  bill_number TEXT,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments_made ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage payments_made"
  ON public.payments_made FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_payments_made_updated_at
  BEFORE UPDATE ON public.payments_made FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add invoice_number to payment_received
ALTER TABLE public.payment_received ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- E-Way Bills table
CREATE TABLE IF NOT EXISTS public.eway_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  eway_bill_number TEXT,
  invoice_id TEXT,
  invoice_number TEXT,
  transporter_name TEXT,
  transporter_gstin TEXT,
  vehicle_number TEXT,
  from_place TEXT,
  from_state TEXT,
  to_place TEXT,
  to_state TEXT,
  distance_km NUMERIC,
  goods_value NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  hsn_code TEXT,
  transport_mode TEXT DEFAULT 'Road',
  document_date DATE DEFAULT CURRENT_DATE,
  validity_date DATE,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.eway_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage eway_bills"
  ON public.eway_bills FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_eway_bills_updated_at
  BEFORE UPDATE ON public.eway_bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
