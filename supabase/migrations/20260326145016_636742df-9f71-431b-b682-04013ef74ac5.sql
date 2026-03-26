
-- 1. Fix KYC documents: remove anon read-all, restrict to admins
DROP POLICY IF EXISTS "Anon view own kyc" ON public.rental_kyc_documents;
CREATE POLICY "Admins can view kyc documents"
ON public.rental_kyc_documents FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 2. Fix dealer_follow_up_alerts
DROP POLICY IF EXISTS "Allow all access to dealer_follow_up_alerts" ON public.dealer_follow_up_alerts;
DROP POLICY IF EXISTS "Public full access" ON public.dealer_follow_up_alerts;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.dealer_follow_up_alerts;
CREATE POLICY "Admins manage dealer follow up alerts"
ON public.dealer_follow_up_alerts FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 3. Fix dealer_discount_history
DROP POLICY IF EXISTS "Allow all access to dealer_discount_history" ON public.dealer_discount_history;
DROP POLICY IF EXISTS "Public full access" ON public.dealer_discount_history;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.dealer_discount_history;
CREATE POLICY "Admins manage dealer discount history"
ON public.dealer_discount_history FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 4. Fix dealer_automation_schedules
DROP POLICY IF EXISTS "Allow all access to dealer_automation_schedules" ON public.dealer_automation_schedules;
DROP POLICY IF EXISTS "Public full access" ON public.dealer_automation_schedules;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.dealer_automation_schedules;
CREATE POLICY "Admins manage dealer automation schedules"
ON public.dealer_automation_schedules FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 5. Fix leads table: restrict SELECT to assigned user or admin/manager
DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.leads;
CREATE POLICY "Leads visible to assigned user or admin"
ON public.leads FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.get_crm_role(auth.uid()) = 'manager'
);

-- 6. Fix lead_routing_rules
DROP POLICY IF EXISTS "Allow all access to lead_routing_rules" ON public.lead_routing_rules;
DROP POLICY IF EXISTS "Public full access" ON public.lead_routing_rules;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.lead_routing_rules;
CREATE POLICY "Admins manage lead routing rules"
ON public.lead_routing_rules FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
