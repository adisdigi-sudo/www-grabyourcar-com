ALTER TABLE public.car_scrape_jobs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.car_scrape_jobs;