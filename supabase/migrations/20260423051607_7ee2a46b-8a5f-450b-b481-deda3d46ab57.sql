-- 1. Heal the broken client record: restore Hemant Singh (00c8e5d0) to policy_issued
-- since they have an active policy
UPDATE public.insurance_clients ic
SET
  pipeline_stage = 'policy_issued',
  lead_status = 'won',
  current_policy_number = COALESCE(ic.current_policy_number, ip.policy_number),
  current_insurer = COALESCE(ic.current_insurer, ip.insurer),
  current_premium = COALESCE(ic.current_premium, ip.premium_amount),
  policy_start_date = COALESCE(ic.policy_start_date, ip.start_date),
  policy_expiry_date = COALESCE(ic.policy_expiry_date, ip.expiry_date),
  booking_date = COALESCE(ic.booking_date, ip.booking_date, ip.issued_date),
  journey_last_event = COALESCE(ic.journey_last_event, 'policy_issued'),
  journey_last_event_at = COALESCE(ic.journey_last_event_at, ip.created_at),
  updated_at = now()
FROM public.insurance_policies ip
WHERE ip.client_id = ic.id
  AND ip.status = 'active'
  AND lower(coalesce(ic.pipeline_stage, '')) NOT IN ('policy_issued')
  AND lower(coalesce(ic.lead_status, '')) NOT IN ('won', 'policy_issued', 'lost');

-- 2. Add a guard trigger: prevent downgrading a client out of policy_issued
-- when there is an active policy linked to them
CREATE OR REPLACE FUNCTION public.prevent_active_policy_client_downgrade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_has_active_policy boolean;
  v_policy RECORD;
BEGIN
  -- Skip if nothing relevant changed
  IF NEW.pipeline_stage IS NOT DISTINCT FROM OLD.pipeline_stage
     AND NEW.lead_status IS NOT DISTINCT FROM OLD.lead_status THEN
    RETURN NEW;
  END IF;

  -- Only intervene when the new state would NOT be terminal
  IF lower(coalesce(NEW.pipeline_stage, '')) IN ('policy_issued', 'lost')
     OR lower(coalesce(NEW.lead_status, '')) IN ('won', 'lost', 'policy_issued') THEN
    RETURN NEW;
  END IF;

  -- Was the client previously policy_issued / won?
  IF lower(coalesce(OLD.pipeline_stage, '')) <> 'policy_issued'
     AND lower(coalesce(OLD.lead_status, '')) NOT IN ('won', 'policy_issued') THEN
    RETURN NEW;
  END IF;

  -- Does an active policy exist for this client?
  SELECT id, policy_number, insurer, premium_amount, start_date, expiry_date,
         booking_date, issued_date, created_at
    INTO v_policy
  FROM public.insurance_policies
  WHERE client_id = NEW.id AND status = 'active'
  ORDER BY updated_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_policy.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Force-keep terminal stage and re-sync key policy fields if missing
  NEW.pipeline_stage := 'policy_issued';
  NEW.lead_status := 'won';
  NEW.current_policy_number := COALESCE(NEW.current_policy_number, v_policy.policy_number);
  NEW.current_insurer := COALESCE(NEW.current_insurer, v_policy.insurer);
  NEW.current_premium := COALESCE(NEW.current_premium, v_policy.premium_amount);
  NEW.policy_start_date := COALESCE(NEW.policy_start_date, v_policy.start_date);
  NEW.policy_expiry_date := COALESCE(NEW.policy_expiry_date, v_policy.expiry_date);
  NEW.booking_date := COALESCE(NEW.booking_date, v_policy.booking_date, v_policy.issued_date);
  NEW.journey_last_event := COALESCE(NEW.journey_last_event, 'policy_issued');
  NEW.journey_last_event_at := COALESCE(NEW.journey_last_event_at, v_policy.created_at);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_active_policy_client_downgrade_trg ON public.insurance_clients;
CREATE TRIGGER prevent_active_policy_client_downgrade_trg
BEFORE UPDATE ON public.insurance_clients
FOR EACH ROW
EXECUTE FUNCTION public.prevent_active_policy_client_downgrade();