-- 1) Add CFO Cockpit business vertical (separate from Founder Cockpit)
INSERT INTO public.business_verticals (slug, name, description, icon, color, is_active, sort_order)
VALUES (
  'cfo-cockpit',
  'CFO Cockpit',
  'CFO command center: budgets, P&L design, approvals, monthly snapshots',
  'BarChart3',
  '#1e40af',
  true,
  1
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  is_active = true,
  sort_order = EXCLUDED.sort_order;

-- 2) Augment monthly_financial_snapshots with explicit revenue & period bounds
ALTER TABLE public.monthly_financial_snapshots
  ADD COLUMN IF NOT EXISTS total_revenue numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_breakdown jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS expense_breakdown jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS computed_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS notes text;

-- 3) Allow NULL tenant_id for global (cross-tenant) snapshots and keep upsert working
ALTER TABLE public.monthly_financial_snapshots
  ALTER COLUMN tenant_id DROP NOT NULL;

-- 4) Drop old composite unique that requires tenant_id; replace with NULL-safe partial uniques
ALTER TABLE public.monthly_financial_snapshots
  DROP CONSTRAINT IF EXISTS monthly_financial_snapshots_tenant_id_vertical_name_month_y_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mfs_global
  ON public.monthly_financial_snapshots (vertical_name, month_year)
  WHERE tenant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mfs_per_tenant
  ON public.monthly_financial_snapshots (tenant_id, vertical_name, month_year)
  WHERE tenant_id IS NOT NULL;

-- 5) Enable RLS + permissive read for any authenticated admin user; writes via service role only via edge fn
ALTER TABLE public.monthly_financial_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read snapshots" ON public.monthly_financial_snapshots;
CREATE POLICY "Admins can read snapshots"
  ON public.monthly_financial_snapshots
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can upsert snapshots" ON public.monthly_financial_snapshots;
CREATE POLICY "Admins can upsert snapshots"
  ON public.monthly_financial_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update snapshots" ON public.monthly_financial_snapshots;
CREATE POLICY "Admins can update snapshots"
  ON public.monthly_financial_snapshots
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );