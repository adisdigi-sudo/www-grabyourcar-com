
ALTER TABLE public.insurance_clients 
  ADD COLUMN IF NOT EXISTS picked_up_by text,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz;
