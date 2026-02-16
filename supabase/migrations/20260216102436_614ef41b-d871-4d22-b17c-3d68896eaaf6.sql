
-- Add anniversary_date and vehicle document validity fields to insurance_clients
ALTER TABLE public.insurance_clients 
  ADD COLUMN IF NOT EXISTS anniversary_date date,
  ADD COLUMN IF NOT EXISTS relationship text,
  ADD COLUMN IF NOT EXISTS state_permit_expiry date,
  ADD COLUMN IF NOT EXISTS national_permit_expiry date,
  ADD COLUMN IF NOT EXISTS fitness_expiry date,
  ADD COLUMN IF NOT EXISTS puc_expiry date,
  ADD COLUMN IF NOT EXISTS rc_expiry date,
  ADD COLUMN IF NOT EXISTS rto_tax_expiry date;
