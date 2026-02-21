
-- Fix: Remove the overly permissive service role policy and replace with proper auth check
DROP POLICY IF EXISTS "Service role full access on automation leads" ON public.automation_lead_tracking;
