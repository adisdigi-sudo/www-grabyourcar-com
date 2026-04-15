
-- Create the missing increment_campaign_counter function
CREATE OR REPLACE FUNCTION public.increment_campaign_counter(p_campaign_id uuid, p_column text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_column = 'open_count' THEN
    UPDATE public.email_campaigns SET open_count = COALESCE(open_count, 0) + 1 WHERE id = p_campaign_id;
  ELSIF p_column = 'click_count' THEN
    UPDATE public.email_campaigns SET click_count = COALESCE(click_count, 0) + 1 WHERE id = p_campaign_id;
  END IF;
END;
$$;

-- Add delivered_at column to email_logs if missing
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Add reply tracking columns to email_logs
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS replied_at timestamptz;

-- Add bounce_type to email_events for detailed bounce tracking
ALTER TABLE public.email_events ADD COLUMN IF NOT EXISTS bounce_type text;
