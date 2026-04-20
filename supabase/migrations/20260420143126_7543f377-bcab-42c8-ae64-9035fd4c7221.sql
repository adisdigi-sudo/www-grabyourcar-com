CREATE TABLE public.auto_pilot_pending_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL,
  recipient_phone text NOT NULL,
  recipient_name text,
  message_body text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  template_name text,
  template_variables jsonb,
  context_snapshot jsonb,
  status text NOT NULL DEFAULT 'pending',
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,
  approved_at timestamptz,
  sent_at timestamptz,
  skipped_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_apm_status_scheduled ON public.auto_pilot_pending_messages(status, scheduled_for DESC);
CREATE INDEX idx_apm_agent_type ON public.auto_pilot_pending_messages(agent_type);

ALTER TABLE public.auto_pilot_pending_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view pending auto-pilot messages"
ON public.auto_pilot_pending_messages FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins update pending auto-pilot messages"
ON public.auto_pilot_pending_messages FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete pending auto-pilot messages"
ON public.auto_pilot_pending_messages FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_apm_updated_at
BEFORE UPDATE ON public.auto_pilot_pending_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();