
-- Fix security definer view by setting it as SECURITY INVOKER
ALTER VIEW public.tenant_financial_summary SET (security_invoker = on);
