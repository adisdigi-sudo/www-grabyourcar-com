
-- Add admin management policies for car_images
CREATE POLICY "Admins can manage car images"
ON public.car_images FOR ALL
USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
);

-- Add admin management policies for car_brochures
CREATE POLICY "Admins can manage car brochures"
ON public.car_brochures FOR ALL
USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
);

-- Add admin management policies for car_features
CREATE POLICY "Admins can manage car features"
ON public.car_features FOR ALL
USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
);

-- Add admin management policies for car_specifications
CREATE POLICY "Admins can manage car specifications"
ON public.car_specifications FOR ALL
USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
);

-- Add admin management policies for car_variants
CREATE POLICY "Admins can manage car variants"
ON public.car_variants FOR ALL
USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
);

-- Add admin management policies for car_offers
CREATE POLICY "Admins can manage car offers"
ON public.car_offers FOR ALL
USING (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id)
);
