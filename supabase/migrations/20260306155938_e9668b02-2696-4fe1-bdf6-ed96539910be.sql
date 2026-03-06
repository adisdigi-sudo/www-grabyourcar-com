
ALTER TABLE public.loan_applications 
  ADD COLUMN IF NOT EXISTS call_status text,
  ADD COLUMN IF NOT EXISTS call_remarks text,
  ADD COLUMN IF NOT EXISTS incentive_eligible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS disbursement_letter_url text;
