ALTER TABLE public.insurance_clients ADD COLUMN IF NOT EXISTS booking_date date;
ALTER TABLE public.insurance_clients ADD COLUMN IF NOT EXISTS booked_by text;

ALTER TABLE public.insurance_policies ADD COLUMN IF NOT EXISTS booking_date date;