
-- Channel providers table for unified omni-channel messaging
CREATE TABLE public.channel_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'rcs')),
  provider_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  config_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel)
);

-- Enable RLS
ALTER TABLE public.channel_providers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read channel_providers"
  ON public.channel_providers FOR SELECT TO authenticated
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage channel_providers"
  ON public.channel_providers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Add channel column to wa_message_logs
ALTER TABLE public.wa_message_logs ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp';

-- Seed default providers
INSERT INTO public.channel_providers (channel, provider_name, is_active, config_json) VALUES
  ('whatsapp', 'Meta Cloud API', true, '{"phone_number_id": "998733619990657"}'::jsonb),
  ('email', 'Resend', false, '{}'::jsonb),
  ('rcs', 'Not Configured', false, '{}'::jsonb);

-- Updated_at trigger
CREATE TRIGGER update_channel_providers_updated_at
  BEFORE UPDATE ON public.channel_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
