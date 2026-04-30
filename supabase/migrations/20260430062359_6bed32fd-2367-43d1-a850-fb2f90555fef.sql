CREATE OR REPLACE FUNCTION public.ensure_single_active_policy_per_vehicle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vehicle_key text;
BEGIN
  IF lower(coalesce(NEW.status, '')) <> 'active' OR NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT vehicle_key INTO v_vehicle_key
  FROM public.insurance_clients
  WHERE id = NEW.client_id;

  IF v_vehicle_key IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.insurance_policies ip
  SET status = CASE WHEN ip.expiry_date IS NOT NULL AND ip.expiry_date < current_date THEN 'lapsed' ELSE 'renewed' END,
      renewal_status = CASE WHEN ip.expiry_date IS NOT NULL AND ip.expiry_date < current_date THEN 'lapsed' ELSE 'renewed' END,
      updated_at = now()
  FROM public.insurance_clients ic
  WHERE ip.client_id = ic.id
    AND ic.vehicle_key = v_vehicle_key
    AND ip.status = 'active'
    AND ip.id IS DISTINCT FROM NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_single_active_policy_per_vehicle_trg ON public.insurance_policies;
CREATE TRIGGER ensure_single_active_policy_per_vehicle_trg
BEFORE INSERT OR UPDATE OF status, client_id ON public.insurance_policies
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_active_policy_per_vehicle();

DROP TRIGGER IF EXISTS sync_sales_won_outcome_trg ON public.sales_pipeline;
CREATE TRIGGER sync_sales_won_outcome_trg
BEFORE INSERT OR UPDATE ON public.sales_pipeline
FOR EACH ROW
EXECUTE FUNCTION public.sync_sales_won_outcome();