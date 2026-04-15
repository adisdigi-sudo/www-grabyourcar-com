-- Update the renewal tracking trigger to recalculate days_until_expiry dynamically
CREATE OR REPLACE FUNCTION public.upsert_insurance_renewal_tracking_from_policy()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      days_until_expiry = GREATEST((EXCLUDED.expiry_date - CURRENT_DATE), 0),
      updated_at = now();
  END IF;

  -- If policy is renewed/cancelled/lapsed, update tracking accordingly
  IF NEW.status IN ('renewed', 'cancelled', 'lapsed') THEN
    UPDATE public.insurance_renewal_tracking
    SET outcome = CASE 
        WHEN NEW.status = 'renewed' THEN 'renewed'
        WHEN NEW.status = 'lapsed' THEN 'lapsed'
        ELSE 'cancelled'
      END,
      days_until_expiry = GREATEST((COALESCE(NEW.expiry_date, CURRENT_DATE) - CURRENT_DATE), 0),
      updated_at = now()
    WHERE policy_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;