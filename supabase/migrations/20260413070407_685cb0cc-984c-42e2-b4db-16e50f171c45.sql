-- Add hierarchy columns to team_members
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS reporting_to UUID REFERENCES public.team_members(id);
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS role_tier TEXT DEFAULT 'caller';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS max_reports INTEGER DEFAULT 10;

-- Add index for hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_team_members_reporting_to ON public.team_members(reporting_to);

-- Add new roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'team_leader';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

-- Validation trigger: enforce max_reports limit
CREATE OR REPLACE FUNCTION public.validate_team_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_current_count INTEGER;
  v_max INTEGER;
  v_supervisor_tier TEXT;
BEGIN
  -- Only validate if reporting_to is being set
  IF NEW.reporting_to IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prevent self-reporting
  IF NEW.reporting_to = NEW.id THEN
    RAISE EXCEPTION 'A team member cannot report to themselves';
  END IF;

  -- Get supervisor's tier and max_reports
  SELECT role_tier, max_reports INTO v_supervisor_tier, v_max
  FROM public.team_members
  WHERE id = NEW.reporting_to;

  IF v_supervisor_tier IS NULL THEN
    RAISE EXCEPTION 'Supervisor not found';
  END IF;

  -- Count current direct reports (excluding self if updating)
  SELECT COUNT(*) INTO v_current_count
  FROM public.team_members
  WHERE reporting_to = NEW.reporting_to
    AND id != NEW.id;

  IF v_current_count >= COALESCE(v_max, 10) THEN
    RAISE EXCEPTION 'Supervisor has reached maximum direct reports limit (%)', COALESCE(v_max, 10);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_team_hierarchy_trigger
BEFORE INSERT OR UPDATE OF reporting_to ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.validate_team_hierarchy();