
-- Master Customer table
CREATE TABLE public.master_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  city TEXT,
  source TEXT,
  primary_vertical TEXT,
  multi_vertical_tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'New',
  assigned_to UUID,
  lifecycle_stage TEXT DEFAULT 'lead',
  lead_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_contacted_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ
);

-- Activity logs table
CREATE TABLE public.customer_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.master_customers(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  notes TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_master_customers_phone ON public.master_customers(phone);
CREATE INDEX idx_master_customers_assigned_to ON public.master_customers(assigned_to);
CREATE INDEX idx_master_customers_status ON public.master_customers(status);
CREATE INDEX idx_master_customers_primary_vertical ON public.master_customers(primary_vertical);
CREATE INDEX idx_customer_activity_logs_customer_id ON public.customer_activity_logs(customer_id);

-- RLS
ALTER TABLE public.master_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for master_customers (authenticated users can CRUD)
CREATE POLICY "Authenticated users can view customers"
  ON public.master_customers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON public.master_customers FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON public.master_customers FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete customers"
  ON public.master_customers FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS policies for activity_logs
CREATE POLICY "Authenticated users can view activity logs"
  ON public.customer_activity_logs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert activity logs"
  ON public.customer_activity_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- Auto-update updated_at trigger
CREATE TRIGGER update_master_customers_updated_at
  BEFORE UPDATE ON public.master_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-log activity on customer update
CREATE OR REPLACE FUNCTION public.log_customer_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customer_activity_logs (customer_id, activity_type, notes, performed_by)
  VALUES (
    NEW.id,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' THEN 'updated'
      ELSE TG_OP
    END,
    CASE
      WHEN TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN 'Status changed from ' || OLD.status || ' to ' || NEW.status
      WHEN TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN 'Assignment changed'
      WHEN TG_OP = 'INSERT' THEN 'Customer created'
      ELSE 'Customer updated'
    END,
    auth.uid()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_customer_activity
  AFTER INSERT OR UPDATE ON public.master_customers
  FOR EACH ROW EXECUTE FUNCTION public.log_customer_activity();
