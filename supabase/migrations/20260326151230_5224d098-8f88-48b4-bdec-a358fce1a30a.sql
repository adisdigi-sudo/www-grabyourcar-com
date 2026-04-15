
-- ============================================================
-- DEEP SECURITY FIX: Remove all overly-permissive public-role policies
-- ============================================================

-- 1. rental_kyc_documents: remove anon insert policy (KYC uploads should go through authenticated flow)
DROP POLICY IF EXISTS "Anon upload kyc" ON public.rental_kyc_documents;
-- Keep only the admin policies that already exist

-- 2. dealer_follow_up_alerts: remove the public USING(true) policy
DROP POLICY IF EXISTS "Admin full access follow up alerts" ON public.dealer_follow_up_alerts;
-- "Admins manage dealer follow up alerts" (authenticated + is_admin) remains

-- 3. dealer_discount_history: remove the public USING(true) policy
DROP POLICY IF EXISTS "Admin full access discount history" ON public.dealer_discount_history;
-- "Admins manage dealer discount history" (authenticated + is_admin) remains

-- 4. dealer_automation_schedules: remove the public USING(true) policy
DROP POLICY IF EXISTS "Admin full access schedules" ON public.dealer_automation_schedules;
-- "Admins manage dealer automation schedules" (authenticated + is_admin) remains

-- 5. lead_routing_rules: remove the public USING(true) policy
DROP POLICY IF EXISTS "Admins can manage routing rules" ON public.lead_routing_rules;
-- "Admins manage lead routing rules" (authenticated + is_admin) remains

-- 6. leads table: remove the overly-broad admin ALL policy that uses crm_users check
-- The existing "Leads visible to assigned user or admin" SELECT policy is correct
-- But we need to tighten the ALL policy
DROP POLICY IF EXISTS "Admins full access on leads" ON public.leads;

-- Create proper admin ALL policy using is_admin() for INSERT/UPDATE/DELETE
CREATE POLICY "Admins full crud on leads"
ON public.leads FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 7. whatsapp_otps: RLS enabled but no policies - add proper policy
ALTER TABLE IF EXISTS public.whatsapp_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only for whatsapp_otps"
ON public.whatsapp_otps FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
