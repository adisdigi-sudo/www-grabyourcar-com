
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

  -- Step 1: If new lead has a vehicle, try exact phone+vehicle match first
  IF v_clean_vehicle IS NOT NULL THEN
    SELECT ic.id INTO v_existing_id
    FROM public.insurance_clients ic
    WHERE regexp_replace(COALESCE(ic.phone, ''), '\D', '', 'g') = v_clean_phone
      AND NULLIF(upper(regexp_replace(COALESCE(ic.vehicle_number, ''), '\s+', '', 'g')), '') = v_clean_vehicle
    ORDER BY ic.created_at DESC LIMIT 1;

    -- Step 2: If no exact match, try phone match with NULL vehicle (fill in)
    IF v_existing_id IS NULL THEN
      SELECT ic.id INTO v_existing_id
      FROM public.insurance_clients ic
      WHERE regexp_replace(COALESCE(ic.phone, ''), '\D', '', 'g') = v_clean_phone
        AND ic.vehicle_number IS NULL
      ORDER BY ic.created_at DESC LIMIT 1;
    END IF;

    -- Step 3: If all phone matches have DIFFERENT vehicles, v_existing_id stays NULL → insert new
  ELSE
    -- No vehicle on new lead: match by phone only
    SELECT ic.id INTO v_existing_id
    FROM public.insurance_clients ic
    WHERE regexp_replace(COALESCE(ic.phone, ''), '\D', '', 'g') = v_clean_phone
    ORDER BY ic.created_at DESC LIMIT 1;
  END IF;

  -- Also try vehicle-only match if still no match and vehicle exists
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
      vehicle_number = COALESCE(NULLIF(NEW.vehicle_number, ''), insurance_clients.vehicle_number),
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
