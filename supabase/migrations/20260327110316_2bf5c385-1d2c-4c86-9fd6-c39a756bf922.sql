
-- Add duplicate tracking columns
ALTER TABLE public.insurance_clients ADD COLUMN IF NOT EXISTS duplicate_count integer DEFAULT 0;
ALTER TABLE public.insurance_clients ADD COLUMN IF NOT EXISTS is_duplicate boolean DEFAULT false;
