-- WhatsApp PDF Automation rules + delivery logs
CREATE TABLE IF NOT EXISTS public.wa_pdf_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical TEXT NOT NULL,
  event_name TEXT NOT NULL,
  pdf_type TEXT NOT NULL,
  template_name TEXT,
  caption_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  cooldown_hours INTEGER NOT NULL DEFAULT 24,
  max_sends_per_record INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  total_sent INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vertical, event_name, pdf_type)
);

CREATE INDEX IF NOT EXISTS idx_wa_pdf_rules_event ON public.wa_pdf_automation_rules (event_name, is_active);
CREATE INDEX IF NOT EXISTS idx_wa_pdf_rules_vertical ON public.wa_pdf_automation_rules (vertical, is_active);

CREATE TABLE IF NOT EXISTS public.wa_pdf_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.wa_pdf_automation_rules(id) ON DELETE SET NULL,
  vertical TEXT NOT NULL,
  event_name TEXT NOT NULL,
  pdf_type TEXT NOT NULL,
  record_id TEXT,
  phone TEXT NOT NULL,
  customer_name TEXT,
  pdf_url TEXT,
  pdf_storage_path TEXT,
  caption TEXT,
  template_name TEXT,
  message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  meta JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_pdf_logs_rule ON public.wa_pdf_delivery_logs (rule_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_pdf_logs_phone ON public.wa_pdf_delivery_logs (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_pdf_logs_record ON public.wa_pdf_delivery_logs (record_id, pdf_type);
CREATE INDEX IF NOT EXISTS idx_wa_pdf_logs_status ON public.wa_pdf_delivery_logs (status, created_at DESC);

ALTER TABLE public.wa_pdf_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_pdf_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Admins manage rules; service role does sends.
CREATE POLICY "Admins manage WA PDF rules"
  ON public.wa_pdf_automation_rules FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users read WA PDF rules"
  ON public.wa_pdf_automation_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins read WA PDF logs"
  ON public.wa_pdf_delivery_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role writes WA PDF logs"
  ON public.wa_pdf_delivery_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role updates WA PDF logs"
  ON public.wa_pdf_delivery_logs FOR UPDATE
  USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_wa_pdf_rules_updated_at
  BEFORE UPDATE ON public.wa_pdf_automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed sensible defaults across verticals (idempotent)
INSERT INTO public.wa_pdf_automation_rules (vertical, event_name, pdf_type, caption_template, description) VALUES
  ('sales',     'deal_won',           'invoice',         'Hi {name}, your invoice for {car_model} is attached. Thank you!',                  'Send branded invoice when a sales deal is won'),
  ('sales',     'quote_shared',       'quote',           'Hi {name}, here is your personalized quote for {car_model}.',                      'Send branded quote PDF on share'),
  ('insurance', 'policy_issued',      'policy',          'Hi {name}, your insurance policy document is attached. Drive safe!',               'Auto-deliver policy PDF on issuance'),
  ('insurance', 'quote_shared',       'quote',           'Hi {name}, here are your insurance quote options.',                                'Auto-deliver insurance quote PDF'),
  ('hsrp',      'order_confirmed',    'receipt',         'Hi {name}, your HSRP booking is confirmed. Receipt attached.',                     'Send HSRP payment receipt'),
  ('hsrp',      'order_dispatched',   'invoice',         'Hi {name}, your HSRP plate is dispatched. Invoice attached.',                      'Send HSRP invoice on dispatch'),
  ('self-drive','booking_confirmed',  'agreement',       'Hi {name}, your rental agreement is attached. Have a great trip!',                 'Send self-drive rental agreement'),
  ('self-drive','booking_confirmed',  'invoice',         'Hi {name}, your rental invoice is attached.',                                      'Send self-drive invoice'),
  ('loans',     'sanction_approved',  'sanction_letter', 'Hi {name}, your loan sanction letter is attached. Congratulations!',               'Auto-deliver loan sanction letter'),
  ('loans',     'disbursed',          'invoice',         'Hi {name}, your loan has been disbursed. Disbursement confirmation attached.',     'Send disbursement confirmation'),
  ('accessories','order_confirmed',   'invoice',         'Hi {name}, thank you for your order! Invoice attached.',                           'Send accessories invoice on confirmation'),
  ('fastag',    'order_confirmed',    'receipt',         'Hi {name}, your FASTag order is confirmed. Receipt attached.',                     'Send FASTag receipt')
ON CONFLICT (vertical, event_name, pdf_type) DO NOTHING;