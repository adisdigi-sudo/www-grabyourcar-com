
CREATE TABLE public.wa_manual_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  amount NUMERIC NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'upi',
  reference_number TEXT,
  service TEXT NOT NULL DEFAULT 'other',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending_verification',
  source TEXT DEFAULT 'whatsapp_bot',
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  linked_invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_manual_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage manual payments"
  ON public.wa_manual_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anon can insert manual payments"
  ON public.wa_manual_payments FOR INSERT TO anon WITH CHECK (true);

CREATE INDEX idx_manual_payments_phone ON public.wa_manual_payments(customer_phone);
CREATE INDEX idx_manual_payments_status ON public.wa_manual_payments(status);

CREATE TABLE public.wa_retargeting_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  retarget_type TEXT NOT NULL DEFAULT 'payment_reminder',
  service TEXT,
  related_id TEXT,
  amount_due NUMERIC,
  message_template TEXT,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_retargeting_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage retargeting"
  ON public.wa_retargeting_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_retargeting_phone ON public.wa_retargeting_queue(customer_phone);
CREATE INDEX idx_retargeting_status ON public.wa_retargeting_queue(status);
CREATE INDEX idx_retargeting_next ON public.wa_retargeting_queue(next_attempt_at);
