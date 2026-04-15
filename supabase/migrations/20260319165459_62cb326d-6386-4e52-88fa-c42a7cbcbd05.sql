-- Fix: Allow anonymous/public users to insert leads from website forms
CREATE POLICY "Anyone can insert leads from website"
ON public.leads FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Add journey tracking columns to insurance_clients if not exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_clients' AND column_name = 'journey_drop_off_page') THEN
    ALTER TABLE public.insurance_clients ADD COLUMN journey_drop_off_page text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_clients' AND column_name = 'journey_last_event') THEN
    ALTER TABLE public.insurance_clients ADD COLUMN journey_last_event text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_clients' AND column_name = 'journey_last_event_at') THEN
    ALTER TABLE public.insurance_clients ADD COLUMN journey_last_event_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_clients' AND column_name = 'retarget_status') THEN
    ALTER TABLE public.insurance_clients ADD COLUMN retarget_status text DEFAULT 'none';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_clients' AND column_name = 'retarget_sent_at') THEN
    ALTER TABLE public.insurance_clients ADD COLUMN retarget_sent_at timestamptz;
  END IF;
END $$;

-- Add source_label to insurance_policies if missing (for Rollover tracking)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'insurance_policies' AND column_name = 'renewal_count') THEN
    ALTER TABLE public.insurance_policies ADD COLUMN renewal_count integer DEFAULT 0;
  END IF;
END $$;

-- Also allow anonymous insert on analytics_events for journey tracking
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'Anyone can insert analytics events') THEN
    CREATE POLICY "Anyone can insert analytics events"
    ON public.analytics_events FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END $$;