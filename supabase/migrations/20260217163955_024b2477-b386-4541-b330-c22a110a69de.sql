-- Allow anyone to read active business verticals (needed on login page before auth)
CREATE POLICY "Anyone can view active business verticals"
ON public.business_verticals
FOR SELECT
USING (is_active = true);