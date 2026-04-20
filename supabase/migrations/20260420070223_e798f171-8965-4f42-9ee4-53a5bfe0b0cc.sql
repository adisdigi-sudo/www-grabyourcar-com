-- Track auto follow-ups for calling queue interested/hot contacts
CREATE TABLE IF NOT EXISTS public.calling_auto_followup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.auto_dialer_contacts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.auto_dialer_campaigns(id) ON DELETE CASCADE,
  vertical_slug TEXT NOT NULL,
  phone TEXT NOT NULL,
  customer_name TEXT,
  disposition TEXT NOT NULL,
  message_sent TEXT,
  channel TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  send_slot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calling_auto_followup_contact ON public.calling_auto_followup_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_calling_auto_followup_phone_date ON public.calling_auto_followup_log(phone, sent_at);
CREATE INDEX IF NOT EXISTS idx_calling_auto_followup_slot ON public.calling_auto_followup_log(send_slot, sent_at);

ALTER TABLE public.calling_auto_followup_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read calling auto followup" ON public.calling_auto_followup_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role manage calling auto followup" ON public.calling_auto_followup_log
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Add a flag to opt in/out per contact
ALTER TABLE public.auto_dialer_contacts
  ADD COLUMN IF NOT EXISTS auto_followup_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_followup_paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_auto_followup_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_followup_count INTEGER DEFAULT 0;