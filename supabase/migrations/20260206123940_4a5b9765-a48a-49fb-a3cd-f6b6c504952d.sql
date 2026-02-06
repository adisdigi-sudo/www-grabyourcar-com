-- Create INSERT policy for cars table allowing admin users
CREATE POLICY "Admins can insert cars"
ON public.cars FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Create UPDATE policy for cars table allowing admin users
CREATE POLICY "Admins can update cars"
ON public.cars FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Create DELETE policy for cars table allowing admin users
CREATE POLICY "Admins can delete cars"
ON public.cars FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));