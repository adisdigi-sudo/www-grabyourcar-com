ALTER TABLE public.insurance_policies 
ADD COLUMN IF NOT EXISTS renewal_quote_premium numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS renewal_frequency text DEFAULT 'annual';