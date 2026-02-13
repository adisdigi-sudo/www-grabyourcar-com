
-- SECURITY: Tighten RLS write policies to admin-only
-- Currently USING (true) for INSERT/UPDATE/DELETE on car-related tables
-- Restrict to authenticated admins only

-- car_images: Drop permissive policies, add admin-only
DROP POLICY IF EXISTS "Authenticated users can manage car images" ON public.car_images;
DROP POLICY IF EXISTS "Admins can manage car images" ON public.car_images;
CREATE POLICY "Admins can manage car images"
  ON public.car_images FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- car_colors
DROP POLICY IF EXISTS "Authenticated users can manage car colors" ON public.car_colors;
DROP POLICY IF EXISTS "Admins can manage car colors" ON public.car_colors;
CREATE POLICY "Admins can manage car colors"
  ON public.car_colors FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- car_variants
DROP POLICY IF EXISTS "Authenticated users can manage car variants" ON public.car_variants;
DROP POLICY IF EXISTS "Admins can manage car variants" ON public.car_variants;
CREATE POLICY "Admins can manage car variants"
  ON public.car_variants FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- car_specifications
DROP POLICY IF EXISTS "Authenticated users can manage car specifications" ON public.car_specifications;
DROP POLICY IF EXISTS "Admins can manage car specifications" ON public.car_specifications;
CREATE POLICY "Admins can manage car specifications"
  ON public.car_specifications FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- car_features
DROP POLICY IF EXISTS "Authenticated users can manage car features" ON public.car_features;
DROP POLICY IF EXISTS "Admins can manage car features" ON public.car_features;
CREATE POLICY "Admins can manage car features"
  ON public.car_features FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- car_brochures
DROP POLICY IF EXISTS "Authenticated users can manage car brochures" ON public.car_brochures;
DROP POLICY IF EXISTS "Admins can manage car brochures" ON public.car_brochures;
CREATE POLICY "Admins can manage car brochures"
  ON public.car_brochures FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- car_offers
DROP POLICY IF EXISTS "Authenticated users can manage car offers" ON public.car_offers;
DROP POLICY IF EXISTS "Admins can manage car offers" ON public.car_offers;
CREATE POLICY "Admins can manage car offers"
  ON public.car_offers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- car_city_pricing
DROP POLICY IF EXISTS "Authenticated users can manage car city pricing" ON public.car_city_pricing;
DROP POLICY IF EXISTS "Admins can manage car city pricing" ON public.car_city_pricing;
CREATE POLICY "Admins can manage car city pricing"
  ON public.car_city_pricing FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- cars table write
DROP POLICY IF EXISTS "Authenticated users can manage cars" ON public.cars;
DROP POLICY IF EXISTS "Admins can manage cars" ON public.cars;
CREATE POLICY "Admins can manage cars"
  ON public.cars FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- car_brands
DROP POLICY IF EXISTS "Authenticated users can manage car brands" ON public.car_brands;
DROP POLICY IF EXISTS "Admins can manage car brands" ON public.car_brands;
CREATE POLICY "Admins can manage car brands"
  ON public.car_brands FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- banners
DROP POLICY IF EXISTS "Authenticated users can manage banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Admins can manage banners"
  ON public.banners FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- car_price_history
DROP POLICY IF EXISTS "Authenticated users can manage car price history" ON public.car_price_history;
DROP POLICY IF EXISTS "Admins can manage car price history" ON public.car_price_history;
CREATE POLICY "Admins can manage car price history"
  ON public.car_price_history FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
