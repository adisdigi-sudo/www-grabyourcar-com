
-- Allow anonymous UPDATE on insurance_clients for deduplication during lead capture
CREATE POLICY "anon_update_insurance_clients"
  ON public.insurance_clients FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
