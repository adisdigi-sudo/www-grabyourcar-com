
-- =====================================================
-- FIX ALL OVERLY PERMISSIVE RLS POLICIES
-- Replace true/authenticated with is_admin(auth.uid())
-- =====================================================

-- 1. email_campaigns: ALL with true → admin only
DROP POLICY "Admins can manage campaigns" ON public.email_campaigns;
CREATE POLICY "Admins can manage campaigns"
ON public.email_campaigns FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 2. wa_event_triggers: ALL with true → admin only
DROP POLICY "Admins manage wa_event_triggers" ON public.wa_event_triggers;
CREATE POLICY "Admins manage wa_event_triggers"
ON public.wa_event_triggers FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 3. wa_message_logs: ALL with true → admin only
DROP POLICY "Service role full access on wa_message_logs" ON public.wa_message_logs;
CREATE POLICY "Admins can manage wa_message_logs"
ON public.wa_message_logs FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 4. wa_provider_config: ALL with true → admin only
DROP POLICY "Service role full access on wa_provider_config" ON public.wa_provider_config;
CREATE POLICY "Admins can manage wa_provider_config"
ON public.wa_provider_config FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 5. wa_template_catalog: ALL with true → admin only
DROP POLICY "Admins manage wa_template_catalog" ON public.wa_template_catalog;
CREATE POLICY "Admins manage wa_template_catalog"
ON public.wa_template_catalog FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 6. whatsapp_conversations: ALL with true → admin only
DROP POLICY "Service role can manage all conversations" ON public.whatsapp_conversations;
CREATE POLICY "Admins can manage whatsapp_conversations"
ON public.whatsapp_conversations FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 7. broadcast_recipients: authenticated → admin only
DROP POLICY "Authenticated users can manage broadcast_recipients" ON public.broadcast_recipients;
CREATE POLICY "Admins can manage broadcast_recipients"
ON public.broadcast_recipients FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 8. campaign_conversions: authenticated → admin only
DROP POLICY "Authenticated users can manage campaign_conversions" ON public.campaign_conversions;
CREATE POLICY "Admins can manage campaign_conversions"
ON public.campaign_conversions FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 9. car_brands: remove duplicate permissive policy
DROP POLICY "Authenticated users can manage brands" ON public.car_brands;

-- 10. journey_automations: authenticated → admin only
DROP POLICY "Authenticated users can manage journey_automations" ON public.journey_automations;
CREATE POLICY "Admins can manage journey_automations"
ON public.journey_automations FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 11. journey_enrollments: authenticated → admin only
DROP POLICY "Authenticated users can manage journey_enrollments" ON public.journey_enrollments;
CREATE POLICY "Admins can manage journey_enrollments"
ON public.journey_enrollments FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 12. journey_steps: authenticated → admin only
DROP POLICY "Authenticated users can manage journey_steps" ON public.journey_steps;
CREATE POLICY "Admins can manage journey_steps"
ON public.journey_steps FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 13. lead_scores: authenticated → admin only
DROP POLICY "Authenticated users can manage lead_scores" ON public.lead_scores;
CREATE POLICY "Admins can manage lead_scores"
ON public.lead_scores FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 14. marketing_alerts: authenticated → admin only
DROP POLICY "Authenticated users can manage marketing_alerts" ON public.marketing_alerts;
CREATE POLICY "Admins can manage marketing_alerts"
ON public.marketing_alerts FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 15. marketing_campaigns: authenticated → admin only
DROP POLICY "Authenticated users can manage marketing_campaigns" ON public.marketing_campaigns;
CREATE POLICY "Admins can manage marketing_campaigns"
ON public.marketing_campaigns FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 16. vehicle_body_types: authenticated → admin only
DROP POLICY "Admins can manage body types" ON public.vehicle_body_types;
CREATE POLICY "Admins can manage body types"
ON public.vehicle_body_types FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 17. vehicle_brands: authenticated → admin only
DROP POLICY "Admins can manage brands" ON public.vehicle_brands;
CREATE POLICY "Admins can manage brands"
ON public.vehicle_brands FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 18. vehicle_fuel_types: authenticated → admin only
DROP POLICY "Admins can manage fuel types" ON public.vehicle_fuel_types;
CREATE POLICY "Admins can manage fuel types"
ON public.vehicle_fuel_types FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 19. vehicle_price_ranges: authenticated → admin only
DROP POLICY "Admins can manage price ranges" ON public.vehicle_price_ranges;
CREATE POLICY "Admins can manage price ranges"
ON public.vehicle_price_ranges FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 20. vehicle_transmissions: authenticated → admin only
DROP POLICY "Admins can manage transmissions" ON public.vehicle_transmissions;
CREATE POLICY "Admins can manage transmissions"
ON public.vehicle_transmissions FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 21. whatsapp_broadcasts: authenticated → admin only
DROP POLICY "Authenticated users can manage whatsapp_broadcasts" ON public.whatsapp_broadcasts;
CREATE POLICY "Admins can manage whatsapp_broadcasts"
ON public.whatsapp_broadcasts FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
