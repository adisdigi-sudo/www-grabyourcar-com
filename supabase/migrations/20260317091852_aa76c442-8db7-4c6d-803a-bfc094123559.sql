
CREATE TABLE public.bulk_renewal_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT,
  city TEXT,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_number TEXT DEFAULT '',
  vehicle_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  fuel_type TEXT NOT NULL DEFAULT 'Petrol',
  insurance_company TEXT NOT NULL DEFAULT 'N/A',
  policy_type TEXT NOT NULL DEFAULT 'Comprehensive',
  idv NUMERIC NOT NULL DEFAULT 0,
  basic_od NUMERIC NOT NULL DEFAULT 0,
  od_discount NUMERIC NOT NULL DEFAULT 0,
  ncb_discount NUMERIC NOT NULL DEFAULT 0,
  third_party NUMERIC NOT NULL DEFAULT 0,
  secure_premium NUMERIC NOT NULL DEFAULT 0,
  addon_premium NUMERIC NOT NULL DEFAULT 0,
  addons TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  pdf_generated BOOLEAN NOT NULL DEFAULT false,
  pdf_generated_at TIMESTAMPTZ,
  whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  whatsapp_sent_at TIMESTAMPTZ,
  notes TEXT,
  batch_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.bulk_renewal_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage bulk quotes"
ON public.bulk_renewal_quotes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Auto update timestamp
CREATE TRIGGER set_bulk_renewal_quotes_updated_at
  BEFORE UPDATE ON public.bulk_renewal_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for status filtering
CREATE INDEX idx_bulk_renewal_quotes_status ON public.bulk_renewal_quotes(status);
CREATE INDEX idx_bulk_renewal_quotes_batch ON public.bulk_renewal_quotes(batch_label);
