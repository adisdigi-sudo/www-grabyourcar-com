
-- ============================================================
-- WA Feedback Auto-Dispatch Triggers
-- Fires wa-feedback-dispatcher edge function on Won events
-- across all 4 verticals. Uses pg_net for async HTTP calls
-- so the trigger never blocks the originating transaction.
-- ============================================================

-- Helper function: dispatch feedback request to edge function
CREATE OR REPLACE FUNCTION public.dispatch_wa_feedback(
  p_vertical TEXT,
  p_phone TEXT,
  p_name TEXT,
  p_record_id TEXT,
  p_variables JSONB DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
  v_body JSONB;
BEGIN
  IF p_phone IS NULL OR length(btrim(p_phone)) < 10 THEN RETURN; END IF;

  -- Read project secrets
  BEGIN
    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
    SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_url := 'https://ynoiwioypxpurwdbjvyt.supabase.co';
  END;
  IF v_url IS NULL THEN v_url := 'https://ynoiwioypxpurwdbjvyt.supabase.co'; END IF;

  v_body := jsonb_build_object(
    'vertical', p_vertical,
    'phone', regexp_replace(p_phone, '\D', '', 'g'),
    'name', COALESCE(p_name, 'Customer'),
    'recordId', p_record_id,
    'variables', p_variables
  );

  PERFORM net.http_post(
    url := v_url || '/functions/v1/wa-feedback-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_key, '')
    ),
    body := v_body
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'dispatch_wa_feedback failed: %', SQLERRM;
END;
$$;

-- ====================================================
-- INSURANCE: fire on insurance_policies INSERT (active)
-- ====================================================
CREATE OR REPLACE FUNCTION public.tg_feedback_insurance_won()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_client RECORD;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN RETURN NEW; END IF;

  SELECT customer_name, phone INTO v_client
  FROM public.insurance_clients WHERE id = NEW.client_id LIMIT 1;

  IF v_client.phone IS NULL THEN RETURN NEW; END IF;

  PERFORM public.dispatch_wa_feedback(
    'insurance',
    v_client.phone,
    v_client.customer_name,
    NEW.id::text,
    jsonb_build_object(
      'policy_number', COALESCE(NEW.policy_number, 'N/A'),
      'insurer', COALESCE(NEW.insurer, 'your insurer')
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedback_insurance_won ON public.insurance_policies;
CREATE TRIGGER trg_feedback_insurance_won
AFTER INSERT ON public.insurance_policies
FOR EACH ROW EXECUTE FUNCTION public.tg_feedback_insurance_won();

-- ====================================================
-- LOANS: fire on loan_applications stage -> 'disbursed'
-- ====================================================
CREATE OR REPLACE FUNCTION public.tg_feedback_loan_disbursed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(coalesce(NEW.stage, '')) <> 'disbursed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND lower(coalesce(OLD.stage, '')) = 'disbursed' THEN RETURN NEW; END IF;
  IF NEW.phone IS NULL THEN RETURN NEW; END IF;

  PERFORM public.dispatch_wa_feedback(
    'loans',
    NEW.phone,
    NEW.customer_name,
    NEW.id::text,
    jsonb_build_object(
      'bank_name', COALESCE(NEW.lender_name, 'your lender'),
      'loan_amount', COALESCE(NEW.disbursement_amount::text, NEW.loan_amount::text, 'N/A')
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedback_loan_disbursed ON public.loan_applications;
CREATE TRIGGER trg_feedback_loan_disbursed
AFTER INSERT OR UPDATE OF stage ON public.loan_applications
FOR EACH ROW EXECUTE FUNCTION public.tg_feedback_loan_disbursed();

-- ====================================================
-- HSRP: fire on hsrp_bookings order_status -> 'delivered'
-- ====================================================
CREATE OR REPLACE FUNCTION public.tg_feedback_hsrp_delivered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(coalesce(NEW.order_status, '')) <> 'delivered' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND lower(coalesce(OLD.order_status, '')) = 'delivered' THEN RETURN NEW; END IF;
  IF NEW.mobile IS NULL THEN RETURN NEW; END IF;

  PERFORM public.dispatch_wa_feedback(
    'hsrp',
    NEW.mobile,
    NEW.owner_name,
    NEW.id::text,
    jsonb_build_object(
      'vehicle_number', COALESCE(NEW.registration_number, 'N/A'),
      'service_type', COALESCE(NEW.service_type, 'HSRP')
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedback_hsrp_delivered ON public.hsrp_bookings;
CREATE TRIGGER trg_feedback_hsrp_delivered
AFTER INSERT OR UPDATE OF order_status ON public.hsrp_bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_feedback_hsrp_delivered();

-- ====================================================
-- SALES: fire on deals when deal_status closed + payment_status received
-- ====================================================
CREATE OR REPLACE FUNCTION public.tg_feedback_sales_delivered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_customer RECORD;
BEGIN
  -- Only fire when deal becomes closed AND payment received
  IF NEW.deal_status NOT IN ('closed') OR NEW.payment_status <> 'received' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.deal_status = 'closed' AND OLD.payment_status = 'received' THEN RETURN NEW; END IF;

  -- Only sales / car_sales vertical
  IF NEW.vertical_name IS NOT NULL AND lower(NEW.vertical_name) NOT IN ('sales','car sales','car_sales','cars') THEN
    RETURN NEW;
  END IF;

  SELECT name, phone INTO v_customer FROM public.customers WHERE id = NEW.customer_id LIMIT 1;
  IF v_customer.phone IS NULL THEN RETURN NEW; END IF;

  PERFORM public.dispatch_wa_feedback(
    'sales',
    v_customer.phone,
    v_customer.name,
    NEW.id::text,
    jsonb_build_object(
      'car_model', COALESCE(NEW.deal_number, 'your car')
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedback_sales_delivered ON public.deals;
CREATE TRIGGER trg_feedback_sales_delivered
AFTER INSERT OR UPDATE OF deal_status, payment_status ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.tg_feedback_sales_delivered();
