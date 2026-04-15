
-- 1. Fix the trigger to add a time-based guard against duplicate inserts
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
  v_vehicle_key text;
  v_has_prior_policy boolean := false;
  v_recent_policy_exists boolean := false;
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

  -- GUARD: If a policy was created for this client in the last 10 seconds, skip insert
  -- This prevents the UI + trigger from both creating a policy
  IF v_stage_changed_to_won THEN
    SELECT EXISTS (
      SELECT 1 FROM public.insurance_policies
      WHERE client_id = NEW.id
        AND status = 'active'
        AND created_at >= (now() - INTERVAL '10 seconds')
    ) INTO v_recent_policy_exists;

    IF v_recent_policy_exists THEN
      -- A policy was just created by the UI, just update it instead
      UPDATE public.insurance_policies
      SET
        policy_number = COALESCE(NULLIF(btrim(COALESCE(NEW.current_policy_number, '')), ''), policy_number),
        policy_type = COALESCE(NULLIF(btrim(COALESCE(NEW.current_policy_type, '')), ''), policy_type),
        insurer = COALESCE(NULLIF(btrim(COALESCE(NEW.current_insurer, '')), ''), NULLIF(btrim(COALESCE(NEW.quote_insurer, '')), ''), insurer),
        premium_amount = COALESCE(NEW.current_premium, NEW.quote_amount, premium_amount),
        booking_date = COALESCE(NEW.booking_date, booking_date),
        updated_at = now()
      WHERE client_id = NEW.id
        AND status = 'active'
        AND created_at >= (now() - INTERVAL '10 seconds');
      RETURN NEW;
    END IF;
  END IF;

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
  v_vehicle_key := NULLIF(upper(regexp_replace(COALESCE(NEW.vehicle_number, ''), '\s+', '', 'g')), '');

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

  -- Broadened lookup: find ANY active policy for this client (not just matching policy_number)
  SELECT id INTO v_existing_policy_id
  FROM public.insurance_policies
  WHERE client_id = NEW.id
    AND status = 'active'
  ORDER BY
    CASE WHEN v_policy_number IS NOT NULL AND policy_number = v_policy_number THEN 0 ELSE 1 END,
    updated_at DESC NULLS LAST
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM public.insurance_policies ip
    LEFT JOIN public.insurance_clients ic ON ic.id = ip.client_id
    WHERE (
      ip.client_id = NEW.id
      OR (
        v_vehicle_key IS NOT NULL
        AND NULLIF(upper(regexp_replace(COALESCE(ic.vehicle_number, ''), '\s+', '', 'g')), '') = v_vehicle_key
      )
    )
      AND (v_existing_policy_id IS NULL OR ip.id <> v_existing_policy_id)
      AND (
        v_policy_number IS NULL
        OR ip.policy_number IS DISTINCT FROM v_policy_number
        OR ip.client_id IS DISTINCT FROM NEW.id
      )
  ) INTO v_has_prior_policy;

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
      is_renewal = COALESCE(is_renewal, false) OR v_has_prior_policy,
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
      v_has_prior_policy,
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
      is_renewal = COALESCE(insurance_policies.is_renewal, false) OR COALESCE(EXCLUDED.is_renewal, false),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Cleanup existing duplicate active policies per client (keep best one)
WITH ranked AS (
  SELECT id, client_id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id 
      ORDER BY 
        CASE WHEN policy_number IS NOT NULL AND btrim(policy_number) <> '' THEN 0 ELSE 1 END,
        premium_amount DESC NULLS LAST,
        updated_at DESC
    ) as rn
  FROM insurance_policies
  WHERE status = 'active'
    AND client_id IS NOT NULL
)
UPDATE insurance_policies SET status = 'renewed', updated_at = now()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
