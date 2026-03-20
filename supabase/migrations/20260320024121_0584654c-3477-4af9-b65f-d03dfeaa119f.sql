
-- Allow anonymous inserts on insurance_activity_log for website lead capture
CREATE POLICY "anon_insert_insurance_activity_log"
  ON public.insurance_activity_log FOR INSERT
  TO anon
  WITH CHECK (true);
