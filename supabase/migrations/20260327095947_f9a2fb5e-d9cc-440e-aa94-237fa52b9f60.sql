CREATE OR REPLACE FUNCTION public.ensure_policy_book_entry_for_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_policy_id uuid;
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
    CASE WHEN NEW.updated_at IS NOT NULL THEN NEW.updated_at::date ELSE NULL END,
    CASE WHEN NEW.created_at IS NOT NULL THEN NEW.created_at::date ELSE NULL END,
    CURRENT_DATE
  );
  v_start_date := COALESCE(NEW.policy_start_date, v_booking_date, CURRENT_DATE);
  v_expiry_date := COALESCE(NEW.policy_expiry_date, (v_start_date + INTERVAL '1 year' - INTERVAL '1 day')::date);
  v_policy_number := NULLIF(btrim(COALESCE(NEW.current_policy_number, '')), '');

  SELECT ip.id
  INTO v_existing_policy_id
  FROM public.insurance_policies ip
  WHERE ip.client_id = NEW.id
    AND (
      (v_policy_number IS NOT NULL AND ip.policy_number = v_policy_number)
      OR ip.status = 'active'
      OR (ip.booking_date IS NOT NULL AND ip.booking_date = v_booking_date)
    )
  ORDER BY
    CASE WHEN v_policy_number IS NOT NULL AND ip.policy_number = v_policy_number THEN 0 ELSE 1 END,
    CASE WHEN ip.status = 'active' THEN 0 ELSE 1 END,
    ip.created_at DESC
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
      issued_date = COALESCE(issued_date, v_booking_date),
      booking_date = COALESCE(NEW.booking_date, booking_date, v_booking_date),
      status = CASE WHEN status = 'renewed' THEN status ELSE 'active' END,
      updated_at = now()
    WHERE id = v_existing_policy_id;
  ELSE
    UPDATE public.insurance_policies
    SET status = 'renewed', renewal_status = 'renewed', updated_at = now()
    WHERE client_id = NEW.id
      AND status = 'active'
      AND (
        v_policy_number IS NULL
        OR policy_number IS DISTINCT FROM v_policy_number
      );

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
      v_booking_date,
      'active',
      false,
      'Auto Won Sync'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_policy_book_entry_on_client_sync ON public.insurance_clients;

CREATE TRIGGER ensure_policy_book_entry_on_client_sync
AFTER INSERT OR UPDATE OF lead_status, pipeline_stage, booking_date, current_policy_number, current_policy_type, current_insurer, current_premium, quote_amount, quote_insurer, policy_start_date, policy_expiry_date
ON public.insurance_clients
FOR EACH ROW
EXECUTE FUNCTION public.ensure_policy_book_entry_for_client();