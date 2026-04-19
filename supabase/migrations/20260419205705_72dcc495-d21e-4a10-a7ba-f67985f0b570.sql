CREATE TABLE IF NOT EXISTS public.lead_followup_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE,
  step_fired smallint NOT NULL DEFAULT 0,
  last_step_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_followup_state_lead ON public.lead_followup_state(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_followup_state_step ON public.lead_followup_state(step_fired);

ALTER TABLE public.lead_followup_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read followup state" ON public.lead_followup_state;
CREATE POLICY "Authenticated read followup state"
  ON public.lead_followup_state FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role manage followup state" ON public.lead_followup_state;
CREATE POLICY "Service role manage followup state"
  ON public.lead_followup_state FOR ALL
  TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_lead_followup_state_updated ON public.lead_followup_state;
CREATE TRIGGER trg_lead_followup_state_updated
  BEFORE UPDATE ON public.lead_followup_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();