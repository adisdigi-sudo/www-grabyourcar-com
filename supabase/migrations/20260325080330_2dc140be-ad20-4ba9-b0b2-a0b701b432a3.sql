-- Secure insurance client visibility and allow assigned team members/managers to work their queue
ALTER TABLE public.insurance_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_insurance_clients_by_phone" ON public.insurance_clients;
DROP POLICY IF EXISTS "anon_update_insurance_clients" ON public.insurance_clients;
DROP POLICY IF EXISTS "Insurance members can view assigned clients" ON public.insurance_clients;
DROP POLICY IF EXISTS "Insurance members can update assigned clients" ON public.insurance_clients;

CREATE POLICY "Insurance members can view assigned clients"
ON public.insurance_clients
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR assigned_advisor_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.user_vertical_access uva
    JOIN public.business_verticals bv ON bv.id = uva.vertical_id
    WHERE uva.user_id = auth.uid()
      AND bv.slug = 'insurance'
      AND uva.access_level = 'manager'
  )
);

CREATE POLICY "Insurance members can update assigned clients"
ON public.insurance_clients
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid())
  OR assigned_advisor_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.user_vertical_access uva
    JOIN public.business_verticals bv ON bv.id = uva.vertical_id
    WHERE uva.user_id = auth.uid()
      AND bv.slug = 'insurance'
      AND uva.access_level = 'manager'
  )
)
WITH CHECK (
  is_admin(auth.uid())
  OR assigned_advisor_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.user_vertical_access uva
    JOIN public.business_verticals bv ON bv.id = uva.vertical_id
    WHERE uva.user_id = auth.uid()
      AND bv.slug = 'insurance'
      AND uva.access_level = 'manager'
  )
);