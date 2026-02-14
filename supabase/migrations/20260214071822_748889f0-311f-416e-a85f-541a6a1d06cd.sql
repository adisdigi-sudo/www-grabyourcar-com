-- Allow anonymous lead submissions from website (inserts only)
CREATE POLICY "Anyone can submit a lead" 
ON public.leads 
FOR INSERT 
WITH CHECK (true);
