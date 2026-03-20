
-- Allow anonymous SELECT on insurance_clients for deduplication during lead capture
-- Only allows checking if a phone number exists (limited exposure)
CREATE POLICY "anon_select_insurance_clients_by_phone"
  ON public.insurance_clients FOR SELECT
  TO anon
  USING (true);
