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
    WHERE id = v_existing_policy_id;

    IF array_length(v_existing_duplicate_ids, 1) > 1 THEN
      DELETE FROM public.insurance_policies
      WHERE id = ANY(v_existing_duplicate_ids[2:array_length(v_existing_duplicate_ids, 1)]);
    END IF;

    UPDATE public.insurance_policies
    SET status = 'renewed', renewal_status = 'renewed', updated_at = now()
    WHERE client_id = NEW.id
      AND id <> v_existing_policy_id
      AND status = 'active';
  ELSE
    UPDATE public.insurance_policies
    SET status = 'renewed', renewal_status = 'renewed', updated_at = now()
    WHERE client_id = NEW.id
      AND status = 'active';

    INSERT INTO public.insurance_policies (
      client_id,
      policy_number,
      policy_type,
      insurer,
      premium_amount,
      start_date,
      expiry_date,
      issued_date,
      booking_date,
      status,
      is_renewal,
      source_label
    )
    VALUES (
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