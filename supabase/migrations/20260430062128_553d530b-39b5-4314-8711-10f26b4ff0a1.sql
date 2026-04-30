-- Normalize insurance vehicle/policy identities for strict dedupe
CREATE OR REPLACE FUNCTION public.normalize_vehicle_key(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT NULLIF(upper(regexp_replace(coalesce(_value, ''), '[^A-Za-z0-9]', '', 'g')), '')
$$;

CREATE OR REPLACE FUNCTION public.normalize_policy_key(_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT NULLIF(upper(regexp_replace(coalesce(_value, ''), '[^A-Za-z0-9]', '', 'g')), '')
$$;

ALTER TABLE public.insurance_clients
  ADD COLUMN IF NOT EXISTS vehicle_key text GENERATED ALWAYS AS (public.normalize_vehicle_key(vehicle_number)) STORED;

ALTER TABLE public.insurance_policies
  ADD COLUMN IF NOT EXISTS policy_key text GENERATED ALWAYS AS (public.normalize_policy_key(policy_number)) STORED;

CREATE INDEX IF NOT EXISTS idx_insurance_clients_vehicle_key ON public.insurance_clients(vehicle_key) WHERE vehicle_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insurance_policies_policy_key ON public.insurance_policies(policy_key) WHERE policy_key IS NOT NULL;

-- Merge duplicate insurance leads by same vehicle number before a new duplicate row is inserted.
CREATE OR REPLACE FUNCTION public.merge_duplicate_insurance_client_by_vehicle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_id uuid;
  v_vehicle_key text;
BEGIN
  v_vehicle_key := public.normalize_vehicle_key(NEW.vehicle_number);

  IF v_vehicle_key IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing_id
  FROM public.insurance_clients
  WHERE vehicle_key = v_vehicle_key
  ORDER BY
    CASE WHEN lower(coalesce(pipeline_stage, '')) IN ('policy_issued', 'won') OR lower(coalesce(lead_status, '')) IN ('won', 'policy_issued') THEN 0 ELSE 1 END,
    updated_at DESC NULLS LAST,
    created_at DESC
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.insurance_clients
  SET
    duplicate_count = coalesce(duplicate_count, 0) + 1,
    is_duplicate = true,
    customer_name = coalesce(NULLIF(NEW.customer_name, ''), insurance_clients.customer_name),
    phone = coalesce(NULLIF(NEW.phone, ''), insurance_clients.phone),
    email = coalesce(NULLIF(NEW.email, ''), insurance_clients.email),
    city = coalesce(NULLIF(NEW.city, ''), insurance_clients.city),
    vehicle_number = coalesce(NULLIF(NEW.vehicle_number, ''), insurance_clients.vehicle_number),
    vehicle_make = coalesce(NULLIF(NEW.vehicle_make, ''), insurance_clients.vehicle_make),
    vehicle_model = coalesce(NULLIF(NEW.vehicle_model, ''), insurance_clients.vehicle_model),
    vehicle_year = coalesce(NEW.vehicle_year, insurance_clients.vehicle_year),
    current_insurer = coalesce(NULLIF(NEW.current_insurer, ''), insurance_clients.current_insurer),
    current_policy_type = coalesce(NULLIF(NEW.current_policy_type, ''), insurance_clients.current_policy_type),
    current_policy_number = coalesce(NULLIF(NEW.current_policy_number, ''), insurance_clients.current_policy_number),
    current_premium = coalesce(NEW.current_premium, insurance_clients.current_premium),
    policy_start_date = coalesce(NEW.policy_start_date, insurance_clients.policy_start_date),
    policy_expiry_date = coalesce(NEW.policy_expiry_date, insurance_clients.policy_expiry_date),
    lead_source = coalesce(NULLIF(NEW.lead_source, ''), insurance_clients.lead_source),
    priority = coalesce(NULLIF(NEW.priority, ''), insurance_clients.priority),
    assigned_executive = coalesce(NULLIF(NEW.assigned_executive, ''), insurance_clients.assigned_executive),
    follow_up_date = coalesce(NEW.follow_up_date, insurance_clients.follow_up_date),
    follow_up_time = coalesce(NULLIF(NEW.follow_up_time, ''), insurance_clients.follow_up_time),
    quote_amount = coalesce(NEW.quote_amount, insurance_clients.quote_amount),
    quote_insurer = coalesce(NULLIF(NEW.quote_insurer, ''), insurance_clients.quote_insurer),
    lost_reason = coalesce(NULLIF(NEW.lost_reason, ''), insurance_clients.lost_reason),
    notes = coalesce(NULLIF(NEW.notes, ''), insurance_clients.notes),
    updated_at = now()
  WHERE id = v_existing_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS merge_duplicate_insurance_client_by_vehicle_trg ON public.insurance_clients;
CREATE TRIGGER merge_duplicate_insurance_client_by_vehicle_trg
BEFORE INSERT ON public.insurance_clients
FOR EACH ROW
EXECUTE FUNCTION public.merge_duplicate_insurance_client_by_vehicle();

-- Clean duplicate active policies by policy number and by vehicle; keep the newest useful row active.
WITH ranked_by_policy AS (
  SELECT id, row_number() OVER (
    PARTITION BY policy_key
    ORDER BY updated_at DESC NULLS LAST, created_at DESC, id DESC
  ) AS rn
  FROM public.insurance_policies
  WHERE status = 'active' AND policy_key IS NOT NULL
)
UPDATE public.insurance_policies ip
SET status = CASE WHEN ip.expiry_date IS NOT NULL AND ip.expiry_date < current_date THEN 'lapsed' ELSE 'renewed' END,
    renewal_status = CASE WHEN ip.expiry_date IS NOT NULL AND ip.expiry_date < current_date THEN 'lapsed' ELSE 'renewed' END,
    updated_at = now()
FROM ranked_by_policy r
WHERE ip.id = r.id AND r.rn > 1;

WITH ranked_by_vehicle AS (
  SELECT ip.id, row_number() OVER (
    PARTITION BY ic.vehicle_key
    ORDER BY ip.updated_at DESC NULLS LAST, ip.created_at DESC, ip.id DESC
  ) AS rn
  FROM public.insurance_policies ip
  JOIN public.insurance_clients ic ON ic.id = ip.client_id
  WHERE ip.status = 'active' AND ic.vehicle_key IS NOT NULL
)
UPDATE public.insurance_policies ip
SET status = CASE WHEN ip.expiry_date IS NOT NULL AND ip.expiry_date < current_date THEN 'lapsed' ELSE 'renewed' END,
    renewal_status = CASE WHEN ip.expiry_date IS NOT NULL AND ip.expiry_date < current_date THEN 'lapsed' ELSE 'renewed' END,
    updated_at = now()
FROM ranked_by_vehicle r
WHERE ip.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_insurance_active_policy_key_unique
  ON public.insurance_policies(policy_key)
  WHERE status = 'active' AND policy_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_insurance_active_vehicle_policy_unique
  ON public.insurance_policies(client_id)
  WHERE status = 'active' AND client_id IS NOT NULL;

-- Keep insurance client won state synced from active policies.
UPDATE public.insurance_clients ic
SET
  pipeline_stage = 'policy_issued',
  lead_status = 'won',
  current_policy_number = coalesce(ic.current_policy_number, ip.policy_number),
  current_insurer = coalesce(ic.current_insurer, ip.insurer),
  current_premium = coalesce(ic.current_premium, ip.premium_amount),
  policy_start_date = coalesce(ic.policy_start_date, ip.start_date),
  policy_expiry_date = coalesce(ic.policy_expiry_date, ip.expiry_date),
  booking_date = coalesce(ic.booking_date, ip.booking_date, ip.issued_date, ip.start_date),
  journey_last_event = coalesce(ic.journey_last_event, 'policy_issued'),
  journey_last_event_at = coalesce(ic.journey_last_event_at, ip.updated_at, ip.created_at),
  updated_at = now()
FROM public.insurance_policies ip
WHERE ip.client_id = ic.id
  AND ip.status = 'active';

-- Sales won-stage guard: when a sales lead enters won, persist status_outcome and incentive fields automatically.
CREATE OR REPLACE FUNCTION public.sync_sales_won_outcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF lower(coalesce(NEW.pipeline_stage, '')) IN ('won', 'delivery', 'delivered', 'after_sales', 'converted') THEN
    NEW.pipeline_stage := 'won';
    NEW.status_outcome := 'won';
    NEW.incentive_eligible := coalesce(NEW.incentive_eligible, true);
    NEW.last_activity_at := coalesce(NEW.last_activity_at, now());
  ELSIF lower(coalesce(NEW.pipeline_stage, '')) = 'lost' THEN
    NEW.status_outcome := 'lost';
  ELSIF OLD.status_outcome IN ('won', 'lost') AND NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
    NEW.status_outcome := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_sales_won_outcome_trg ON public.sales_pipeline;
CREATE TRIGGER sync_sales_won_outcome_trg
BEFORE UPDATE ON public.sales_pipeline
FOR EACH ROW
EXECUTE FUNCTION public.sync_sales_won_outcome();

UPDATE public.sales_pipeline
SET status_outcome = 'won', incentive_eligible = coalesce(incentive_eligible, true), updated_at = now()
WHERE lower(coalesce(pipeline_stage, '')) IN ('won', 'delivery', 'delivered', 'after_sales', 'converted')
  AND coalesce(status_outcome, '') <> 'won';