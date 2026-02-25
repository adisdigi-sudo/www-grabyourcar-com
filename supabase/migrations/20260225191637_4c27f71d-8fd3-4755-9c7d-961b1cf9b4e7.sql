
-- Create customer_call_logs table
CREATE TABLE public.customer_call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.master_customers(id) ON DELETE CASCADE,
  call_status TEXT NOT NULL CHECK (call_status IN ('connected', 'not_connected', 'switched_off', 'busy', 'wrong_number')),
  call_notes TEXT,
  call_duration INTEGER,
  called_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  called_by UUID NOT NULL
);

ALTER TABLE public.customer_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read call logs"
  ON public.customer_call_logs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert call logs"
  ON public.customer_call_logs FOR INSERT TO authenticated
  WITH CHECK (called_by = auth.uid());

CREATE INDEX idx_customer_call_logs_customer ON public.customer_call_logs(customer_id);
CREATE INDEX idx_customer_call_logs_called_at ON public.customer_call_logs(called_at DESC);
