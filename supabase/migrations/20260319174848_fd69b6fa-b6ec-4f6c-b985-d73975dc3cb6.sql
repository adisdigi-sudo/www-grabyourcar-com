-- Allow anonymous inserts on insurance_clients for website lead capture
CREATE POLICY "anon_insert_insurance_clients" 
  ON public.insurance_clients FOR INSERT 
  TO anon 
  WITH CHECK (true);

-- Allow service_role full access (already exists but ensure)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'insurance_clients' AND policyname = 'service_role_all_insurance_clients') THEN
    EXECUTE 'CREATE POLICY "service_role_all_insurance_clients" ON public.insurance_clients FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;