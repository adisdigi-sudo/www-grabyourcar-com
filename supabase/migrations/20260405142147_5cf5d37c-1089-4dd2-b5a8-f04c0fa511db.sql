
-- Step 1: Allow any CRM user to read quote_share_history
CREATE POLICY "crm_users_select_quote_share_history"
ON public.quote_share_history FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.crm_users WHERE auth_user_id = auth.uid())
);

-- Step 2: Allow any CRM user to insert into quote_share_history
CREATE POLICY "crm_users_insert_quote_share_history"
ON public.quote_share_history FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.crm_users WHERE auth_user_id = auth.uid())
);

-- Step 3: Allow assigned advisors to view their clients' policies
CREATE POLICY "advisors_select_assigned_client_policies"
ON public.insurance_policies FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.insurance_clients ic
    WHERE ic.id = insurance_policies.client_id
    AND ic.assigned_advisor_id = auth.uid()
  )
);

-- Step 4: Allow assigned advisors to update their clients' policies
CREATE POLICY "advisors_update_assigned_client_policies"
ON public.insurance_policies FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.insurance_clients ic
    WHERE ic.id = insurance_policies.client_id
    AND ic.assigned_advisor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.insurance_clients ic
    WHERE ic.id = insurance_policies.client_id
    AND ic.assigned_advisor_id = auth.uid()
  )
);
