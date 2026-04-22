-- CFO Board: Spend Plans table
CREATE TABLE IF NOT EXISTS public.spend_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_name TEXT NOT NULL,
  vertical TEXT,
  base_amount NUMERIC NOT NULL DEFAULT 0,
  base_period TEXT NOT NULL DEFAULT 'monthly' CHECK (base_period IN ('daily','weekly','monthly','quarterly','half_yearly','yearly')),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.spend_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage spend plans"
ON public.spend_plans FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read spend plans"
ON public.spend_plans FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_spend_plans_updated_at
BEFORE UPDATE ON public.spend_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_spend_plans_active ON public.spend_plans(is_active, vertical, category_name);