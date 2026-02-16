-- Add new roles to the app_role enum for vertical-based access
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'insurance';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'calling';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operations';