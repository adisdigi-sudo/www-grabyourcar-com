
-- Cross-vertical service records linked to unified customer
CREATE TABLE public.customer_vertical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.unified_customers(id) ON DELETE CASCADE,
  vertical_slug TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT,
  status TEXT DEFAULT 'active',
  value NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cross-sell opportunities auto-detected
CREATE TABLE public.cross_sell_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.unified_customers(id) ON DELETE CASCADE,
  source_vertical TEXT NOT NULL,
  target_vertical TEXT NOT NULL,
  opportunity_type TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  suggested_action TEXT,
  estimated_value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.customer_vertical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_sell_opportunities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage vertical records"
  ON public.customer_vertical_records FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Team members can view vertical records"
  ON public.customer_vertical_records FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage cross-sell opportunities"
  ON public.cross_sell_opportunities FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Team members can view cross-sell opportunities"
  ON public.cross_sell_opportunities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

-- Triggers
CREATE TRIGGER update_customer_vertical_records_updated_at
  BEFORE UPDATE ON public.customer_vertical_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_customer_vertical_records_customer ON public.customer_vertical_records(customer_id);
CREATE INDEX idx_customer_vertical_records_vertical ON public.customer_vertical_records(vertical_slug);
CREATE INDEX idx_cross_sell_opportunities_customer ON public.cross_sell_opportunities(customer_id);
CREATE INDEX idx_cross_sell_opportunities_status ON public.cross_sell_opportunities(status);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.cross_sell_opportunities;
