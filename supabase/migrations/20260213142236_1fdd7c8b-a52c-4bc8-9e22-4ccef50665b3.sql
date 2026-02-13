
DROP POLICY "Admins can manage hero slides" ON public.hero_slides;

CREATE POLICY "Admins can manage hero slides"
ON public.hero_slides
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
