
-- Trigger function: fire wa-pdf-dispatcher when insurance_policies is inserted (status=active)
CREATE OR REPLACE FUNCTION public.dispatch_policy_pdf_on_issuance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client RECORD;
  v_phone TEXT;
  v_name TEXT;
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Only fire on new active policies
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  -- Lookup client
  SELECT customer_name, phone, email, vehicle_number, vehicle_make, vehicle_model
    INTO v_client
  FROM public.insurance_clients
  WHERE id = NEW.client_id
  LIMIT 1;

  IF v_client IS NULL OR v_client.phone IS NULL OR length(btrim(v_client.phone)) < 10 THEN
    RETURN NEW;
  END IF;

  v_phone := regexp_replace(v_client.phone, '\D', '', 'g');
  v_name := COALESCE(v_client.customer_name, 'Customer');

  -- Read project config from vault (already used by other dispatchers)
  BEGIN
    SELECT decrypted_secret INTO v_supabase_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
    SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_supabase_url := 'https://ynoiwioypxpurwdbjvyt.supabase.co';
    v_service_key := NULL;
  END;

  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://ynoiwioypxpurwdbjvyt.supabase.co';
  END IF;

  -- Fire dispatcher async (no PDF passed — dispatcher will resolve from existing logic / will skip if rule not satisfied)
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/wa-pdf-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service_key, '')
    ),
    body := jsonb_build_object(
      'vertical', 'insurance',
      'event', 'policy_issued',
      'phone', v_phone,
      'name', v_name,
      'recordId', NEW.id::text,
      'pdfTypeFilter', 'policy',
      'variables', jsonb_build_object(
        'name', v_name,
        'policy_number', COALESCE(NEW.policy_number, ''),
        'insurer', COALESCE(NEW.insurer, ''),
        'vehicle_number', COALESCE(v_client.vehicle_number, '')
      )
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block policy creation on dispatch failure
  RAISE NOTICE 'dispatch_policy_pdf_on_issuance failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_policy_pdf_on_issuance ON public.insurance_policies;
CREATE TRIGGER trg_dispatch_policy_pdf_on_issuance
AFTER INSERT ON public.insurance_policies
FOR EACH ROW
EXECUTE FUNCTION public.dispatch_policy_pdf_on_issuance();
