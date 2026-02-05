-- Create admin_otps table for 2FA verification
CREATE TABLE public.admin_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_otps ENABLE ROW LEVEL SECURITY;

-- Only allow users to read their own OTPs (for verification status)
CREATE POLICY "Users can view their own OTPs"
ON public.admin_otps
FOR SELECT
USING (auth.uid() = user_id);

-- Allow insert for authenticated users (OTP creation is done by edge function with service role)
-- No insert policy needed as edge function uses service role key

-- Create index for faster lookups
CREATE INDEX idx_admin_otps_user_email ON public.admin_otps(user_id, email);
CREATE INDEX idx_admin_otps_expires ON public.admin_otps(expires_at);

-- Auto-cleanup expired OTPs (optional trigger)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.admin_otps WHERE expires_at < now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_otps_on_insert
AFTER INSERT ON public.admin_otps
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_expired_otps();