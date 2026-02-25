
-- 1) Create tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subscription_plan TEXT NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'enterprise')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Only super_admins can manage tenants
CREATE POLICY "Super admins can manage tenants"
  ON public.tenants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Authenticated users can read their own tenant (needed for session context)
CREATE POLICY "Authenticated users can read tenants"
  ON public.tenants FOR SELECT TO authenticated
  USING (true);

-- 2) Add tenant_id to crm_users
ALTER TABLE public.crm_users
  ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

-- 3) Add tenant_id to master_customers
ALTER TABLE public.master_customers
  ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

-- 4) Add tenant_id to customer_vertical_status
ALTER TABLE public.customer_vertical_status
  ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

-- 5) Add tenant_id to vertical_pipeline_history
ALTER TABLE public.vertical_pipeline_history
  ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

-- 6) Add tenant_id to customer_call_logs
ALTER TABLE public.customer_call_logs
  ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

-- Create indexes for tenant_id filtering
CREATE INDEX idx_crm_users_tenant ON public.crm_users(tenant_id);
CREATE INDEX idx_master_customers_tenant ON public.master_customers(tenant_id);
CREATE INDEX idx_customer_vertical_status_tenant ON public.customer_vertical_status(tenant_id);
CREATE INDEX idx_vertical_pipeline_history_tenant ON public.vertical_pipeline_history(tenant_id);
CREATE INDEX idx_customer_call_logs_tenant ON public.customer_call_logs(tenant_id);

-- Helper function to get tenant_id for a user
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.crm_users WHERE user_id = _user_id LIMIT 1
$$;
