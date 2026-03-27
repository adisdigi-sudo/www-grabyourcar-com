-- Break recursive insurance client/policy sync loops and keep only one policy->client trigger
CREATE OR REPLACE FUNCTION public.ensure_policy_book_entry_for_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_policy_id uuid;
  v_existing_duplicate_ids uuid[];
  v_booking_date date;
  v_start_date date;
  v_expiry_date date;
  v_policy_number text;
  v_should_sync boolean;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  v_should_sync := (
    lower(coalesce(NEW.lead_status, '')) = 'won'
    OR lower(coalesce(NEW.pipeline_stage, '')) = 'policy_issued'
  );

  IF NOT v_should_sync THEN
    RETURN NEW;
  END IF;

  v_booking_date := COALESCE(
    NEW.booking_date,
    NEW.policy_start_date,
    CASE WHEN NEW.updated_at IS NOT NULL THEN NEW.updated_at::date ELSE NULL END,
    CASE WHEN NEW.created_at IS NOT NULL THEN NEW.created_at::date ELSE NULL END,
    CURRENT_DATE
  );
  v_start_date := COALESCE(NEW.policy_start_date, v_booking_date, CURRENT_DATE);
  v_expiry_date := COALESCE(NEW.policy_expiry_date, (v_start_date + INTERVAL '1 year' - INTERVAL '1 day')::date);
  v_policy_number := NULLIF(btrim(COALESCE(NEW.current_policy_number, '')), '');

  IF NEW.vehicle_number IS NOT NULL AND btrim(NEW.vehicle_number) <> '' THEN
    PERFORM 1
    FROM public.insurance_policies ip
    JOIN public.insurance_clients ic ON ic.id = ip.client_id
    WHERE upper(regexp_replace(ic.vehicle_number, '\s+', '', 'g')) = upper(regexp_replace(NEW.vehicle_number, '\s+', '', 'g'))
      AND ip.status = 'active'
      AND ip.client_id <> NEW.id;

    IF FOUND THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT ARRAY_AGG(ip.id ORDER BY ip.updated_at DESC NULLS LAST, ip.created_at DESC NULLS LAST)
  INTO v_existing_duplicate_ids
  FROM public.insurance_policies ip
  WHERE ip.client_id = NEW.id
    AND (
      (v_policy_number IS NOT NULL AND ip.policy_number = v_policy_number)
      OR (v_policy_number IS NULL AND ip.status = 'active')
    );

  IF v_existing_duplicate_ids IS NOT NULL AND array_length(v_existing_duplicate_ids, 1) > 0 THEN
    v_existing_policy_id := v_existing_duplicate_ids[1];

    UPDATE public.insurance_policies
    SET
      policy_number = COALESCE(v_policy_number, policy_number),
      policy_type = COALESCE(NULLIF(btrim(COALESCE(NEW.current_policy_type, '')), ''), policy_type, 'comprehensive'),
      insurer = COALESCE(NULLIF(btrim(COALESCE(NEW.current_insurer, '')), ''), NULLIF(btrim(COALESCE(NEW.quote_insurer, '')), ''), insurer, 'Unknown'),
      premium_amount = COALESCE(NEW.current_premium, NEW.quote_amount, premium_amount),
      start_date = COALESCE(NEW.policy_start_date, start_date, v_start_date),
      expiry_date = COALESCE(NEW.policy_expiry_date, expiry_date, v_expiry_date),
      issued_date = COALESCE(issued_date, v_booking_date),
      booking_date = COALESCE(NEW.booking_date, NEW.policy_start_date, booking_date, v_booking_date),
      status = 'active',
      updated_at = now()
    WHERE id = v_existing_policy_id
      AND (
        policy_number IS DISTINCT FROM COALESCE(v_policy_number, policy_number)
        OR policy_type IS DISTINCT FROM COALESCE(NULLIF(btrim(COALESCE(NEW.current_policy_type, '')), ''), policy_type, 'comprehensive')
        OR insurer IS DISTINCT FROM COALESCE(NULLIF(btrim(COALESCE(NEW.current_insurer, '')), ''), NULLIF(btrim(COALESCE(NEW.quote_insurer, '')), ''), insurer, 'Unknown')
        OR premium_amount IS DISTINCT FROM COALESCE(NEW.current_premium, NEW.quote_amount, premium_amount)
        OR start_date IS DISTINCT FROM COALESCE(NEW.policy_start_date, start_date, v_start_date)
        OR expiry_date IS DISTINCT FROM COALESCE(NEW.policy_expiry_date, expiry_date, v_expiry_date)
        OR issued_date IS DISTINCT FROM COALESCE(issued_date, v_booking_date)
        OR booking_date IS DISTINCT FROM COALESCE(NEW.booking_date, NEW.policy_start_date, booking_date, v_booking_date)
        OR status IS DISTINCT FROM 'active'
      );

    IF array_length(v_existing_duplicate_ids, 1) > 1 THEN
      UPDATE public.insurance_policies SET previous_policy_id = NULL
      WHERE previous_policy_id = ANY(v_existing_duplicate_ids[2:]);

      DELETE FROM public.insurance_policies
      WHERE id = ANY(v_existing_duplicate_ids[2:]);
    END IF;

    UPDATE public.insurance_policies
    SET status = 'renewed', renewal_status = 'renewed', updated_at = now()
    WHERE client_id = NEW.id AND id <> v_existing_policy_id AND status = 'active';
  ELSE
    UPDATE public.insurance_policies
    SET status = 'renewed', renewal_status = 'renewed', updated_at = now()
    WHERE client_id = NEW.id AND status = 'active';

    INSERT INTO public.insurance_policies (
      client_id, policy_number, policy_type, insurer, premium_amount,
      start_date, expiry_date, issued_date, booking_date, status, is_renewal, source_label
    ) VALUES (
      NEW.id,
      v_policy_number,
      COALESCE(NULLIF(btrim(COALESCE(NEW.current_policy_type, '')), ''), 'comprehensive'),
      COALESCE(NULLIF(btrim(COALESCE(NEW.current_insurer, '')), ''), NULLIF(btrim(COALESCE(NEW.quote_insurer, '')), ''), 'Unknown'),
      COALESCE(NEW.current_premium, NEW.quote_amount),
      v_start_date,
      v_expiry_date,
      v_booking_date,
      COALESCE(NEW.booking_date, NEW.policy_start_date, v_booking_date),
      'active',
      false,
      'Auto Won Sync'
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_insurance_client_from_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  UPDATE public.insurance_clients
  SET current_policy_number = COALESCE(NEW.policy_number, current_policy_number),
      current_policy_type = COALESCE(NEW.policy_type, current_policy_type),
      current_insurer = COALESCE(NEW.insurer, current_insurer),
      current_premium = COALESCE(NEW.premium_amount, current_premium),
      policy_start_date = COALESCE(NEW.start_date, policy_start_date),
      policy_expiry_date = COALESCE(NEW.expiry_date, policy_expiry_date),
      booking_date = COALESCE(NEW.booking_date, booking_date),
      lead_status = CASE
        WHEN lead_status IS NULL OR lower(lead_status) IN ('new', 'running', 'active', 'quoted', 'policy_issued', 'won') THEN 'won'
        ELSE lead_status
      END,
      pipeline_stage = 'policy_issued',
      journey_last_event = CASE WHEN NEW.is_renewal THEN 'renewal_policy_issued' ELSE 'policy_issued' END,
      journey_last_event_at = COALESCE(journey_last_event_at, now()),
      updated_at = now()
  WHERE id = NEW.client_id
    AND (
      current_policy_number IS DISTINCT FROM COALESCE(NEW.policy_number, current_policy_number)
      OR current_policy_type IS DISTINCT FROM COALESCE(NEW.policy_type, current_policy_type)
      OR current_insurer IS DISTINCT FROM COALESCE(NEW.insurer, current_insurer)
      OR current_premium IS DISTINCT FROM COALESCE(NEW.premium_amount, current_premium)
      OR policy_start_date IS DISTINCT FROM COALESCE(NEW.start_date, policy_start_date)
      OR policy_expiry_date IS DISTINCT FROM COALESCE(NEW.expiry_date, policy_expiry_date)
      OR booking_date IS DISTINCT FROM COALESCE(NEW.booking_date, booking_date)
      OR lower(coalesce(lead_status, '')) IS DISTINCT FROM 'won'
      OR lower(coalesce(pipeline_stage, '')) IS DISTINCT FROM 'policy_issued'
      OR journey_last_event IS DISTINCT FROM CASE WHEN NEW.is_renewal THEN 'renewal_policy_issued' ELSE 'policy_issued' END
    );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_insurance_client_on_policy_change ON public.insurance_policies;
DROP TRIGGER IF EXISTS sync_insurance_client_on_policy_sync ON public.insurance_policies;
DROP TRIGGER IF EXISTS trg_sync_insurance_client_from_policy ON public.insurance_policies;

CREATE TRIGGER sync_insurance_client_on_policy_change
AFTER INSERT OR UPDATE OF policy_number, policy_type, insurer, premium_amount, start_date, expiry_date, booking_date, status, is_renewal
ON public.insurance_policies
FOR EACH ROW
EXECUTE FUNCTION public.sync_insurance_client_from_policy();