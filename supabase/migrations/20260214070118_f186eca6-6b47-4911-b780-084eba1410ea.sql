
CREATE TABLE public.whatsapp_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_otps_phone ON public.whatsapp_otps (phone);

-- Auto-cleanup expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_whatsapp_otps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.whatsapp_otps WHERE expires_at < now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_whatsapp_otps
  BEFORE INSERT ON public.whatsapp_otps
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_expired_whatsapp_otps();

-- RLS: only service role should access this table
ALTER TABLE public.whatsapp_otps ENABLE ROW LEVEL SECURITY;
