
-- Fix the calling_queue view to use security_invoker
DROP VIEW IF EXISTS public.calling_queue;
CREATE OR REPLACE VIEW public.calling_queue
WITH (security_invoker=on) AS
SELECT 
  cl.id as last_call_id,
  cl.lead_phone,
  cl.lead_name,
  cl.lead_type,
  cl.lead_id,
  cl.disposition as last_disposition,
  cl.follow_up_at,
  cl.follow_up_priority,
  cl.vertical_id,
  cl.agent_id,
  cl.created_at as last_called_at,
  cl.notes as last_notes,
  CASE
    WHEN cl.follow_up_priority = 'hot' THEN 1
    WHEN cl.follow_up_priority = 'high' THEN 2
    WHEN cl.follow_up_at <= now() THEN 3
    WHEN cl.follow_up_priority = 'normal' THEN 4
    ELSE 5
  END as queue_priority
FROM public.call_logs cl
INNER JOIN (
  SELECT lead_phone, MAX(created_at) as max_created
  FROM public.call_logs
  GROUP BY lead_phone
) latest ON cl.lead_phone = latest.lead_phone AND cl.created_at = latest.max_created
WHERE cl.follow_up_at IS NOT NULL
ORDER BY queue_priority, cl.follow_up_at ASC;
