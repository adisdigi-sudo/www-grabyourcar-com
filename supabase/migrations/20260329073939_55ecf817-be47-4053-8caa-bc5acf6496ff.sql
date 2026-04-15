CREATE OR REPLACE FUNCTION public.ensure_policy_book_entry_for_client()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_policy_id uuid;
  v_booking_date date;
  v_start_date date;
  v_expiry_date date;
  v_policy_number text;
  v_should_sync boolean;
  v_is_stage_change boolean;
  v_stage_changed_to_won boolean;
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

  v_is_stage_change := (
    OLD IS NULL
    OR (lower(coalesce(OLD.lead_status, '')) IS DISTINCT FROM lower(coalesce(NEW.lead_status, '')))
    OR (lower(coalesce(OLD.pipeline_stage, '')) IS DISTINCT FROM lower(coalesce(NEW.pipeline_stage, '')))
  );

  v_stage_changed_to_won := (
    OLD IS NULL
    OR (
      lower(coalesce(OLD.lead_status, '')) <> 'won'
      AND lower(coalesce(NEW.lead_status, '')) = 'won'
    )
    OR (
      lower(coalesce(OLD.pipeline_stage, '')) <> 'policy_issued'
      AND lower(coalesce(NEW.pipeline_stage, '')) = 'policy_issued'
    )
  );

  IF v_stage_changed_to_won THEN
    v_booking_date := COALESCE(
      NEW.booking_date,
      CASE WHEN NEW.updated_at IS NOT NULL THEN NEW.updated_at::date ELSE NULL END,
      CURRENT_DATE
    );
  ELSE
    v_booking_date := COALESCE(
      NEW.booking_date,
      CASE 
        WHEN NEW.policy_start_date IS NOT NULL 
             AND NEW.policy_start_date >= (CURRENT_DATE - INTERVAL '60 days')::date 
        THEN NEW.policy_start_date
        ELSE NULL
      END,
      CASE WHEN NEW.updated_at IS NOT NULL THEN NEW.updated_at::date ELSE NULL END,
      CURRENT_DATE
    );
  END IF;

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

  SELECT id INTO v_existing_policy_id
  FROM public.insurance_policies
  WHERE client_id = NEW.id
    AND status = 'active'
    AND (
      (v_policy_number IS NOT NULL AND policy_number = v_policy_number)
      OR (v_policy_number IS NULL)
    )
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_existing_policy_id IS NOT NULL THEN
    UPDATE public.insurance_policies
    SET
      policy_number = COALESCE(v_policy_number, policy_number),
      policy_type = COALESCE(NULLIF(btrim(COALESCE(NEW.current_policy_type, '')), ''), policy_type, 'comprehensive'),
      insurer = COALESCE(NULLIF(btrim(COALESCE(NEW.current_insurer, '')), ''), NULLIF(btrim(COALESCE(NEW.quote_insurer, '')), ''), insurer, 'Unknown'),
      premium_amount = COALESCE(NEW.current_premium, NEW.quote_amount, premium_amount),
      start_date = COALESCE(NEW.policy_start_date, start_date, v_start_date),
      expiry_date = COALESCE(NEW.policy_expiry_date, expiry_date, v_expiry_date),
      issued_date = COALESCE(NEW.booking_date, v_booking_date, issued_date, CURRENT_DATE),
      booking_date = COALESCE(NEW.booking_date, v_booking_date, booking_date, CURRENT_DATE),
      status = 'active',
      updated_at = now()
    WHERE id = v_existing_policy_id;

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
      COALESCE(NEW.booking_date, v_booking_date, CURRENT_DATE),
      COALESCE(NEW.booking_date, v_booking_date, CURRENT_DATE),
      'active',
      true,
      'Auto Won Sync'
    )
    ON CONFLICT (client_id, policy_number) WHERE status = 'active' AND policy_number IS NOT NULL
    DO UPDATE SET
      policy_type = COALESCE(EXCLUDED.policy_type, insurance_policies.policy_type),
      insurer = COALESCE(EXCLUDED.insurer, insurance_policies.insurer),
      premium_amount = COALESCE(EXCLUDED.premium_amount, insurance_policies.premium_amount),
      start_date = COALESCE(EXCLUDED.start_date, insurance_policies.start_date),
      expiry_date = COALESCE(EXCLUDED.expiry_date, insurance_policies.expiry_date),
      issued_date = COALESCE(EXCLUDED.issued_date, insurance_policies.issued_date),
      booking_date = COALESCE(EXCLUDED.booking_date, insurance_policies.booking_date),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$function$;