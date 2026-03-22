
ALTER TABLE public.insurance_clients
  ADD COLUMN IF NOT EXISTS overdue_reason text,
  ADD COLUMN IF NOT EXISTS overdue_custom_reason text,
  ADD COLUMN IF NOT EXISTS overdue_marked_at timestamptz;
