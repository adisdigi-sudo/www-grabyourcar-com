
-- Fix search_path on update_car_city_pricing_updated_at function
CREATE OR REPLACE FUNCTION public.update_car_city_pricing_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Tighten whatsapp_templates RLS: restrict INSERT/UPDATE/DELETE to admin only
DROP POLICY IF EXISTS "Admin can create templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Admin can update templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Admin can delete templates" ON public.whatsapp_templates;

CREATE POLICY "Only admins can create templates"
ON public.whatsapp_templates
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update templates"
ON public.whatsapp_templates
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete templates"
ON public.whatsapp_templates
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
