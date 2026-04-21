-- Universal Approvals Queue
CREATE TABLE IF NOT EXISTS public.approvals_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type TEXT NOT NULL CHECK (request_type IN ('discount', 'cancellation', 'refund', 'manual_override', 'policy_change', 'other')),
  vertical_name TEXT,
  source_table TEXT,
  source_record_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  amount NUMERIC,
  title TEXT NOT NULL,
  description TEXT,
  reason TEXT,
  request_payload JSONB DEFAULT '{}'::jsonb,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  requested_by UUID,
  requested_by_name TEXT,
  reviewed_by UUID,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_queue_status ON public.approvals_queue(status);
CREATE INDEX IF NOT EXISTS idx_approvals_queue_vertical ON public.approvals_queue(vertical_name);
CREATE INDEX IF NOT EXISTS idx_approvals_queue_created ON public.approvals_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approvals_queue_requested_by ON public.approvals_queue(requested_by);

ALTER TABLE public.approvals_queue ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage approvals queue"
ON public.approvals_queue
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Authenticated users can create requests
CREATE POLICY "Authenticated users create approval requests"
ON public.approvals_queue
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Requesters can view their own requests
CREATE POLICY "Users view own approval requests"
ON public.approvals_queue
FOR SELECT
TO authenticated
USING (requested_by = auth.uid() OR public.is_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER trg_approvals_queue_updated_at
BEFORE UPDATE ON public.approvals_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.approvals_queue;