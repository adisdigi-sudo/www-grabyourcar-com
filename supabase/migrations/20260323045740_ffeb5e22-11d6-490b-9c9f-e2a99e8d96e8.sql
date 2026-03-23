ALTER TABLE public.hsrp_abandoned_carts 
ADD COLUMN IF NOT EXISTS retarget_remarks text,
ADD COLUMN IF NOT EXISTS retarget_date timestamptz;