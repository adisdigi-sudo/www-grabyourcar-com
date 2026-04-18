-- Hourly cron sync for Meta Ads metrics
-- Calls the meta-ads-sync edge function every hour to refresh insights for all active configs
-- pg_cron and pg_net are already enabled platform-wide

-- Unschedule any prior version (idempotent)
DO $$
DECLARE
  job_id bigint;
BEGIN
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'meta-ads-hourly-sync';
  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule(job_id);
  END IF;
END $$;

-- Schedule hourly sync (every hour at minute 5)
SELECT cron.schedule(
  'meta-ads-hourly-sync',
  '5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ynoiwioypxpurwdbjvyt.supabase.co/functions/v1/meta-ads-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlub2l3aW95cHhwdXJ3ZGJqdnl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1ODAyNDUsImV4cCI6MjA4MjE1NjI0NX0.LzN8OsDp2g0eSQcRLsunUKgCaWuZ4LWImnrMR_2onTU'
    ),
    body := jsonb_build_object('source', 'cron', 'days', 7)
  ) AS request_id;
  $$
);