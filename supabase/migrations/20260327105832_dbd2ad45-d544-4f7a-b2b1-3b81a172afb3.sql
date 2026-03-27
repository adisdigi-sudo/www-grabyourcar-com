DROP TRIGGER IF EXISTS sync_insurance_client_on_policy_change ON public.insurance_policies;
CREATE TRIGGER sync_insurance_client_on_policy_change
AFTER INSERT OR UPDATE ON public.insurance_policies
FOR EACH ROW
EXECUTE FUNCTION public.sync_insurance_client_from_policy();