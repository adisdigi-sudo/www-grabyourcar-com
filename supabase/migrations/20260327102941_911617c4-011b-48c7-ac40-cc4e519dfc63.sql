DROP TRIGGER IF EXISTS ensure_policy_book_entry_on_client_sync ON public.insurance_clients;
CREATE TRIGGER ensure_policy_book_entry_on_client_sync
AFTER INSERT OR UPDATE OF lead_status, pipeline_stage, booking_date, policy_start_date, policy_expiry_date, current_policy_number, current_policy_type, current_insurer, current_premium, quote_amount, quote_insurer, updated_at
ON public.insurance_clients
FOR EACH ROW
EXECUTE FUNCTION public.ensure_policy_book_entry_for_client();

DROP TRIGGER IF EXISTS sync_insurance_client_on_policy_sync ON public.insurance_policies;
CREATE TRIGGER sync_insurance_client_on_policy_sync
AFTER INSERT OR UPDATE OF status, policy_number, policy_type, insurer, premium_amount, start_date, expiry_date, is_renewal
ON public.insurance_policies
FOR EACH ROW
EXECUTE FUNCTION public.sync_insurance_client_from_policy();

DROP TRIGGER IF EXISTS upsert_renewal_tracking_on_policy_sync ON public.insurance_policies;
CREATE TRIGGER upsert_renewal_tracking_on_policy_sync
AFTER INSERT OR UPDATE OF status, expiry_date, client_id
ON public.insurance_policies
FOR EACH ROW
EXECUTE FUNCTION public.upsert_insurance_renewal_tracking_from_policy();