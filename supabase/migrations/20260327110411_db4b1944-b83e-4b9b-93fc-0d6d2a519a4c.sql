
-- Update the policy book trigger with vehicle-level dedup
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

  IF NOT v_should_sync THEN RETURN NEW; END IF;

  v_booking_date := COALESCE(NEW.booking_date, NEW.policy_start_date,
    CASE WHEN NEW.updated_at IS NOT NULL THEN NEW.updated_at::date ELSE NULL END,
    CASE WHEN NEW.created_at IS NOT NULL THEN NEW.created_at::date ELSE NULL END, CURRENT_DATE);
  v_start_date := COALESCE(NEW.policy_start_date, v_booking_date, CURRENT_DATE);
  v_expiry_date := COALESCE(NEW.policy_expiry_date, (v_start_date + INTERVAL '1 year' - INTERVAL '1 day')::date);
  v_policy_number := NULLIF(btrim(COALESCE(NEW.current_policy_number, '')), '');

  -- Cross-client vehicle dedup: skip if another client already has an active policy for this vehicle
  IF NEW.vehicle_number IS NOT NULL AND btrim(NEW.vehicle_number) <> '' THEN
    PERFORM 1
    FROM public.insurance_policies ip
    JOIN public.insurance_clients ic ON ic.id = ip.client_id
    WHERE upper(regexp_replace(ic.vehicle_number, '\s+', '', 'g')) = upper(regexp_replace(NEW.vehicle_number, '\s+', '', 'g'))
      AND ip.status = 'active'
      AND ip.client_id <> NEW.id;
    IF FOUND THEN RETURN NEW; END IF;
  END IF;

  -- Same-client dedup
  SELECT ARRAY_AGG(ip.id ORDER BY ip.updated_at DESC NULLS LAST, ip.created_at DESC NULLS LAST)
  INTO v_existing_duplicate_ids
  FROM public.insurance_policies ip
  WHERE ip.client_id = NEW.id
    AND ((v_policy_number IS NOT NULL AND ip.policy_number = v_policy_number) OR (v_policy_number IS NULL AND ip.status = 'active'));

  IF v_existing_duplicate_ids IS NOT NULL AND array_length(v_existing_duplicate_ids, 1) > 0 THEN
    v_existing_policy_id := v_existing_duplicate_ids[1];
    UPDATE public.insurance_policies SET
      policy_number = COALESCE(v_policy_number, policy_number),
      policy_type = COALESCE(NULLIF(btrim(COALESCE(NEW.current_policy_type, '')), ''), policy_type, 'comprehensive'),
      insurer = COALESCE(NULLIF(btrim(COALESCE(NEW.current_insurer, '')), ''), NULLIF(btrim(COALESCE(NEW.quote_insurer, '')), ''), insurer, 'Unknown'),
      premium_amount = COALESCE(NEW.current_premium, NEW.quote_amount, premium_amount),
      start_date = COALESCE(NEW.policy_start_date, start_date, v_start_date),
      expiry_date = COALESCE(NEW.policy_expiry_date, expiry_date, v_expiry_date),
      issued_date = COALESCE(issued_date, v_booking_date),
      booking_date = COALESCE(NEW.booking_date, NEW.policy_start_date, booking_date, v_booking_date),
      status = 'active', updated_at = now()
    WHERE id = v_existing_policy_id;

    IF array_length(v_existing_duplicate_ids, 1) > 1 THEN
      UPDATE public.insurance_policies SET previous_policy_id = NULL
      WHERE previous_policy_id = ANY(v_existing_duplicate_ids[2:]);
      DELETE FROM public.insurance_policies WHERE id = ANY(v_existing_duplicate_ids[2:]);
    END IF;

    UPDATE public.insurance_policies SET status = 'renewed', renewal_status = 'renewed', updated_at = now()
    WHERE client_id = NEW.id AND id <> v_existing_policy_id AND status = 'active';
  ELSE
    UPDATE public.insurance_policies SET status = 'renewed', renewal_status = 'renewed', updated_at = now()
    WHERE client_id = NEW.id AND status = 'active';

    INSERT INTO public.insurance_policies (
      client_id, policy_number, policy_type, insurer, premium_amount,
      start_date, expiry_date, issued_date, booking_date, status, is_renewal, source_label
    ) VALUES (
      NEW.id, v_policy_number,
      COALESCE(NULLIF(btrim(COALESCE(NEW.current_policy_type, '')), ''), 'comprehensive'),
      COALESCE(NULLIF(btrim(COALESCE(NEW.current_insurer, '')), ''), NULLIF(btrim(COALESCE(NEW.quote_insurer, '')), ''), 'Unknown'),
      COALESCE(NEW.current_premium, NEW.quote_amount),
      v_start_date, v_expiry_date, v_booking_date,
      COALESCE(NEW.booking_date, NEW.policy_start_date, v_booking_date),
      'active', false, 'Auto Won Sync'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Update legacy lead sync to track duplicate count
CREATE OR REPLACE FUNCTION public.sync_legacy_insurance_lead_to_client()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id uuid;
  v_clean_phone text;
  v_clean_vehicle text;
BEGIN
  v_clean_phone := NULLIF(regexp_replace(COALESCE(NEW.phone, ''), '\D', '', 'g'), '');
  v_clean_vehicle := NULLIF(upper(regexp_replace(COALESCE(NEW.vehicle_number, ''), '\s+', '', 'g')), '');

  IF v_clean_phone IS NULL THEN RETURN NEW; END IF;

  SELECT ic.id INTO v_existing_id
  FROM public.insurance_clients ic
  WHERE regexp_replace(COALESCE(ic.phone, ''), '\D', '', 'g') = v_clean_phone
    AND (v_clean_vehicle IS NULL
      OR NULLIF(upper(regexp_replace(COALESCE(ic.vehicle_number, ''), '\s+', '', 'g')), '') = v_clean_vehicle
      OR ic.vehicle_number IS NULL)
  ORDER BY ic.created_at DESC LIMIT 1;

  IF v_existing_id IS NULL AND v_clean_vehicle IS NOT NULL THEN
    SELECT ic.id INTO v_existing_id
    FROM public.insurance_clients ic
    WHERE NULLIF(upper(regexp_replace(COALESCE(ic.vehicle_number, ''), '\s+', '', 'g')), '') = v_clean_vehicle
    ORDER BY ic.created_at DESC LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.insurance_clients SET
      duplicate_count = COALESCE(duplicate_count, 0) + 1,
      is_duplicate = true,
      customer_name = COALESCE(insurance_clients.customer_name, NEW.customer_name, 'Insurance Lead'),
      email = COALESCE(insurance_clients.email, NEW.email),
      vehicle_number = COALESCE(insurance_clients.vehicle_number, NEW.vehicle_number),
      vehicle_make = COALESCE(insurance_clients.vehicle_make, NEW.vehicle_make),
      vehicle_model = COALESCE(insurance_clients.vehicle_model, NEW.vehicle_model),
      vehicle_year = COALESCE(insurance_clients.vehicle_year, NEW.vehicle_year),
      current_insurer = COALESCE(insurance_clients.current_insurer, NEW.current_insurer),
      current_policy_type = COALESCE(insurance_clients.current_policy_type, NEW.policy_type),
      policy_expiry_date = COALESCE(insurance_clients.policy_expiry_date, NEW.policy_expiry),
      lead_source = COALESCE(insurance_clients.lead_source, NEW.source),
      lead_status = COALESCE(insurance_clients.lead_status, NEW.status, 'new'),
      pipeline_stage = COALESCE(insurance_clients.pipeline_stage, NEW.pipeline_stage, 'new_lead'),
      priority = COALESCE(insurance_clients.priority, NEW.priority, 'medium'),
      assigned_executive = COALESCE(insurance_clients.assigned_executive, NEW.assigned_executive),
      follow_up_date = COALESCE(insurance_clients.follow_up_date, NEW.follow_up_date),
      contact_attempts = GREATEST(COALESCE(insurance_clients.contact_attempts, 0), COALESCE(NEW.contact_attempts, 0)),
      quote_amount = COALESCE(insurance_clients.quote_amount, NEW.quote_amount),
      quote_insurer = COALESCE(insurance_clients.quote_insurer, NEW.quote_insurer),
      lost_reason = COALESCE(insurance_clients.lost_reason, NEW.lost_reason),
      ncb_percentage = COALESCE(insurance_clients.ncb_percentage, NEW.ncb_percentage),
      previous_claim = COALESCE(insurance_clients.previous_claim, NEW.previous_claim),
      notes = COALESCE(insurance_clients.notes, NEW.notes),
      updated_at = now()
    WHERE insurance_clients.id = v_existing_id;
  ELSE
    INSERT INTO public.insurance_clients (
      phone, customer_name, email, vehicle_number, vehicle_make, vehicle_model,
      vehicle_year, current_insurer, current_policy_type, policy_expiry_date,
      lead_source, lead_status, pipeline_stage, priority, assigned_executive,
      follow_up_date, contact_attempts, quote_amount, quote_insurer, lost_reason,
      ncb_percentage, previous_claim, notes, created_at, updated_at, duplicate_count, is_duplicate
    ) VALUES (
      NEW.phone, COALESCE(NEW.customer_name, 'Insurance Lead'), NEW.email,
      NEW.vehicle_number, NEW.vehicle_make, NEW.vehicle_model, NEW.vehicle_year,
      NEW.current_insurer, NEW.policy_type, NEW.policy_expiry,
      COALESCE(NEW.source, 'legacy_insurance_lead'),
      COALESCE(NEW.status, 'new'), COALESCE(NEW.pipeline_stage, 'new_lead'),
      COALESCE(NEW.priority, 'medium'), NEW.assigned_executive, NEW.follow_up_date,
      COALESCE(NEW.contact_attempts, 0), NEW.quote_amount, NEW.quote_insurer,
      NEW.lost_reason, NEW.ncb_percentage, NEW.previous_claim, NEW.notes,
      COALESCE(NEW.created_at, now()), now(), 0, false
    );
  END IF;

  RETURN NEW;
END;
$function$;
