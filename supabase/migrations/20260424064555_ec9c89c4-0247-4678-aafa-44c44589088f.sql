-- Add bulk-job tracking fields
ALTER TABLE public.car_scrape_jobs
  ADD COLUMN IF NOT EXISTS job_batch_id uuid,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_car_scrape_jobs_status_batch
  ON public.car_scrape_jobs(status, job_batch_id);

CREATE INDEX IF NOT EXISTS idx_car_scrape_jobs_brand_status
  ON public.car_scrape_jobs(brand, status);

-- Realtime for live admin status page
ALTER TABLE public.car_scrape_jobs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'car_scrape_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.car_scrape_jobs;
  END IF;
END $$;