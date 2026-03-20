-- Backfill legacy insurance leads into the main insurance CRM table and keep them in sync going forward

CREATE OR REPLACE FUNCTION public.sync_legacy_insurance_lead_to_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_clean_phone text;
  v_clean_vehicle text;
BEGIN
  v_clean_phone := NULLIF(regexp_replace(COALESCE(NEW.phone, ''), '\D', '', 'g'), '');
  v_clean_vehicle := NULLIF(upper(regexp_replace(COALESCE(NEW.vehicle_number, ''), '\s+', '', 'g')), '');

  IF v_clean_phone IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ic.id
  INTO v_existing_id
  FROM public.insurance_clients ic
  WHERE regexp_replace(COALESCE(ic.phone, ''), '\D', '', 'g') = v_clean_phone
    AND (
      v_clean_vehicle IS NULL
      OR NULLIF(upper(regexp_replace(COALESCE(ic.vehicle_number, ''), '\s+', '', 'g')), '') = v_clean_vehicle
      OR ic.vehicle_number IS NULL
    )
  ORDER BY ic.created_at DESC
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.insurance_clients (
      phone,
      customer_name,
      email,
      vehicle_number,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      current_insurer,
      current_policy_type,
      policy_expiry_date,
      lead_source,
      lead_status,
      pipeline_stage,
      priority,
      assigned_executive,
      follow_up_date,
      contact_attempts,
      quote_amount,
      quote_insurer,
      lost_reason,
      ncb_percentage,
      previous_claim,
      notes,
      created_at,
      updated_at
    )
    VALUES (
      NEW.phone,
      COALESCE(NEW.customer_name, 'Insurance Lead'),
      NEW.email,
      NEW.vehicle_number,
      NEW.vehicle_make,
      NEW.vehicle_model,
      NEW.vehicle_year,
      NEW.current_insurer,
      NEW.policy_type,
      NEW.policy_expiry,
      COALESCE(NEW.source, 'legacy_insurance_lead'),
      COALESCE(NEW.status, 'new'),
      COALESCE(NEW.pipeline_stage, 'new_lead'),
      COALESCE(NEW.priority, 'medium'),
      NEW.assigned_executive,
      NEW.follow_up_date,
      COALESCE(NEW.contact_attempts, 0),
      NEW.quote_amount,
      NEW.quote_insurer,
      NEW.lost_reason,
      NEW.ncb_percentage,
      NEW.previous_claim,
      NEW.notes,
      COALESCE(NEW.created_at, now()),
      now()
    );
  ELSE
    UPDATE public.insurance_clients
    SET
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
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_legacy_insurance_lead_to_client_trigger ON public.insurance_leads;

CREATE TRIGGER sync_legacy_insurance_lead_to_client_trigger
AFTER INSERT OR UPDATE ON public.insurance_leads
FOR EACH ROW
EXECUTE FUNCTION public.sync_legacy_insurance_lead_to_client();

INSERT INTO public.insurance_clients (
  phone,
  customer_name,
  email,
  vehicle_number,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  current_insurer,
  current_policy_type,
  policy_expiry_date,
  lead_source,
  lead_status,
  pipeline_stage,
  priority,
  assigned_executive,
  follow_up_date,
  contact_attempts,
  quote_amount,
  quote_insurer,
  lost_reason,
  ncb_percentage,
  previous_claim,
  notes,
  created_at,
  updated_at
)
SELECT
  il.phone,
  COALESCE(il.customer_name, 'Insurance Lead'),
  il.email,
  il.vehicle_number,
  il.vehicle_make,
  il.vehicle_model,
  il.vehicle_year,
  il.current_insurer,
  il.policy_type,
  il.policy_expiry,
  COALESCE(il.source, 'legacy_insurance_lead'),
  COALESCE(il.status, 'new'),
  COALESCE(il.pipeline_stage, 'new_lead'),
  COALESCE(il.priority, 'medium'),
  il.assigned_executive,
  il.follow_up_date,
  COALESCE(il.contact_attempts, 0),
  il.quote_amount,
  il.quote_insurer,
  il.lost_reason,
  il.ncb_percentage,
  il.previous_claim,
  il.notes,
  COALESCE(il.created_at, now()),
  now()
FROM public.insurance_leads il
WHERE NULLIF(regexp_replace(COALESCE(il.phone, ''), '\D', '', 'g'), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.insurance_clients ic
    WHERE regexp_replace(COALESCE(ic.phone, ''), '\D', '', 'g') = regexp_replace(COALESCE(il.phone, ''), '\D', '', 'g')
      AND (
        NULLIF(upper(regexp_replace(COALESCE(il.vehicle_number, ''), '\s+', '', 'g')), '') IS NULL
        OR NULLIF(upper(regexp_replace(COALESCE(ic.vehicle_number, ''), '\s+', '', 'g')), '') = NULLIF(upper(regexp_replace(COALESCE(il.vehicle_number, ''), '\s+', '', 'g')), '')
        OR ic.vehicle_number IS NULL
      )
  );