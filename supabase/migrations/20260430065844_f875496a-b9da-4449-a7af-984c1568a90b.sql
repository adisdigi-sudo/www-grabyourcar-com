-- Auto-followup sequences and logs for WhatsApp
CREATE TABLE IF NOT EXISTS public.wa_followup_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_event text NOT NULL CHECK (trigger_event IN ('no_reply','brochure_sent','lead_captured')),
  day_offset integer NOT NULL DEFAULT 1,
  message_text text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wa_followup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_phone text NOT NULL,
  sequence_id uuid REFERENCES public.wa_followup_sequences(id) ON DELETE SET NULL,
  message_text text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text DEFAULT 'sent',
  error text
);

CREATE INDEX IF NOT EXISTS idx_wa_followup_logs_phone_seq ON public.wa_followup_logs(lead_phone, sequence_id, sent_at DESC);

ALTER TABLE public.wa_followup_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_followup_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage followup sequences" ON public.wa_followup_sequences;
CREATE POLICY "Admins manage followup sequences" ON public.wa_followup_sequences
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read followup logs" ON public.wa_followup_logs;
CREATE POLICY "Admins read followup logs" ON public.wa_followup_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Service writes followup logs" ON public.wa_followup_logs;
CREATE POLICY "Service writes followup logs" ON public.wa_followup_logs
  FOR INSERT WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_wa_followup_sequences_updated ON public.wa_followup_sequences;
CREATE TRIGGER trg_wa_followup_sequences_updated
  BEFORE UPDATE ON public.wa_followup_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();