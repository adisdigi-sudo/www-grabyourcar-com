-- Phase 1 insurance lifecycle hardening for rollover, journey tracking, policy sync, and renewal automation

ALTER TABLE public.insurance_policies
ADD COLUMN IF NOT EXISTS source_label TEXT,
ADD COLUMN IF NOT EXISTS document_file_name TEXT;

ALTER TABLE public.insurance_clients
ADD COLUMN IF NOT EXISTS journey_last_event TEXT,
ADD COLUMN IF NOT EXISTS journey_last_event_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS retargeting_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_retargeted_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS public.insurance_client_journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.insurance_clients(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.insurance_policies(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_label TEXT,
  from_stage TEXT,
  to_stage TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_client_journey ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage insurance journey" ON public.insurance_client_journey;
CREATE POLICY "Admins can manage insurance journey"
ON public.insurance_client_journey
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public can insert insurance journey" ON public.insurance_client_journey;
CREATE POLICY "Public can insert insurance journey"
ON public.insurance_client_journey
FOR INSERT
TO public
WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_insurance_renewal_tracking_policy_id
ON public.insurance_renewal_tracking(policy_id);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_policy_number
ON public.insurance_policies(policy_number);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_issued_date
ON public.insurance_policies(issued_date);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_expiry_date
ON public.insurance_policies(expiry_date);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_source_label
ON public.insurance_policies(source_label);

CREATE INDEX IF NOT EXISTS idx_insurance_clients_phone_lookup
ON public.insurance_clients(phone);

CREATE INDEX IF NOT EXISTS idx_insurance_clients_vehicle_lookup
ON public.insurance_clients(vehicle_number);

CREATE INDEX IF NOT EXISTS idx_insurance_clients_name_lookup
ON public.insurance_clients(customer_name);

CREATE OR REPLACE FUNCTION public.sync_insurance_client_from_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE public.insurance_clients
    SET current_policy_number = COALESCE(NEW.policy_number, current_policy_number),
        current_policy_type = COALESCE(NEW.policy_type, current_policy_type),
        current_insurer = COALESCE(NEW.insurer, current_insurer),
        current_premium = COALESCE(NEW.premium_amount, current_premium),
        policy_start_date = COALESCE(NEW.start_date, policy_start_date),
        policy_expiry_date = COALESCE(NEW.expiry_date, policy_expiry_date),
        lead_status = CASE
          WHEN lead_status IS NULL OR lower(lead_status) IN ('new', 'running', 'active', 'quoted', 'policy_issued') THEN 'won'
          ELSE lead_status
        END,
        pipeline_stage = 'policy_issued',
        journey_last_event = CASE WHEN NEW.is_renewal THEN 'renewal_policy_issued' ELSE 'policy_issued' END,
        journey_last_event_at = now(),
        updated_at = now()
    WHERE id = NEW.client_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_insurance_renewal_tracking_from_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND NEW.expiry_date IS NOT NULL THEN
    INSERT INTO public.insurance_renewal_tracking (
      policy_id,
      client_id,
      expiry_date,
      days_until_expiry,
      renewed_policy_id,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.client_id,
      NEW.expiry_date,
      GREATEST((NEW.expiry_date - CURRENT_DATE), 0),
      NULL,
      now()
    )
    ON CONFLICT (policy_id)
    DO UPDATE SET
      client_id = EXCLUDED.client_id,
      expiry_date = EXCLUDED.expiry_date,
      days_until_expiry = EXCLUDED.days_until_expiry,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_insurance_client_from_policy ON public.insurance_policies;
CREATE TRIGGER trg_sync_insurance_client_from_policy
AFTER INSERT OR UPDATE OF policy_number, policy_type, insurer, premium_amount, start_date, expiry_date, status, issued_date, is_renewal
ON public.insurance_policies
FOR EACH ROW
EXECUTE FUNCTION public.sync_insurance_client_from_policy();

DROP TRIGGER IF EXISTS trg_upsert_insurance_renewal_tracking_from_policy ON public.insurance_policies;
CREATE TRIGGER trg_upsert_insurance_renewal_tracking_from_policy
AFTER INSERT OR UPDATE OF expiry_date, status, client_id
ON public.insurance_policies
FOR EACH ROW
EXECUTE FUNCTION public.upsert_insurance_renewal_tracking_from_policy();