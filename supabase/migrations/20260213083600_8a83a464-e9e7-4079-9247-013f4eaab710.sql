
-- Drop the broken policies
DROP POLICY IF EXISTS "Admins can manage car images" ON public.car_images;
DROP POLICY IF EXISTS "Admins can manage car brochures" ON public.car_brochures;
DROP POLICY IF EXISTS "Admins can manage car features" ON public.car_features;
DROP POLICY IF EXISTS "Admins can manage car specifications" ON public.car_specifications;
DROP POLICY IF EXISTS "Admins can manage car variants" ON public.car_variants;
DROP POLICY IF EXISTS "Admins can manage car offers" ON public.car_offers;

-- Recreate with correct auth check (no auth.users query)
CREATE POLICY "Authenticated users can manage car images"
ON public.car_images FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage car brochures"
ON public.car_brochures FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage car features"
ON public.car_features FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage car specifications"
ON public.car_specifications FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage car variants"
ON public.car_variants FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage car offers"
ON public.car_offers FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
