-- ============================================
-- WHATSAPP FLOW ENGINE (DB-DRIVEN, NO AI)
-- ============================================

-- 1. FLOWS: Visual conversation flow definitions
CREATE TABLE IF NOT EXISTS public.whatsapp_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  trigger_keywords TEXT[] DEFAULT '{}',
  start_node_id TEXT NOT NULL DEFAULT 'start',
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  variables JSONB DEFAULT '{}'::jsonb,
  total_runs INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wf_vertical ON public.whatsapp_flows(vertical_slug, is_active);

-- 2. SESSIONS: Active customer conversation state
CREATE TABLE IF NOT EXISTS public.whatsapp_flow_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL,
  flow_id UUID REFERENCES public.whatsapp_flows(id) ON DELETE SET NULL,
  vertical_slug TEXT,
  current_node_id TEXT,
  collected_variables JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active', -- active | completed | abandoned | handoff
  identity_verified BOOLEAN DEFAULT false,
  verification_data JSONB DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  handoff_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wfs_phone ON public.whatsapp_flow_sessions(customer_phone, status);
CREATE INDEX IF NOT EXISTS idx_wfs_active ON public.whatsapp_flow_sessions(status, last_message_at);

-- 3. TRIGGERS: Keyword → action mapping (fixed replies, doc sends, branches)
CREATE TABLE IF NOT EXISTS public.whatsapp_flow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_slug TEXT, -- null = global
  trigger_name TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  intent_type TEXT NOT NULL, -- 'document' | 'fixed_reply' | 'redirect' | 'sales_info' | 'payment_info'
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- For documents: { source_table, document_type, required_fields, pdf_template }
  -- For fixed_reply: { reply_text, attachments[] }
  -- For redirect: { redirect_message }
  -- For sales_info: { source_table, lookup_field, fields_to_send }
  -- For payment_info: { account_name, account_number, ifsc, bank, upi_id, upi_number }
  required_identity_fields TEXT[] DEFAULT '{}', -- ['phone', 'vehicle_number', 'policy_number']
  fallback_message TEXT,
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  total_triggered INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wft_vertical ON public.whatsapp_flow_triggers(vertical_slug, is_active, priority);
CREATE INDEX IF NOT EXISTS idx_wft_keywords ON public.whatsapp_flow_triggers USING GIN(keywords);

-- 4. LOGS: Audit trail
CREATE TABLE IF NOT EXISTS public.whatsapp_flow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.whatsapp_flow_sessions(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,
  inbound_message TEXT,
  matched_trigger_id UUID REFERENCES public.whatsapp_flow_triggers(id) ON DELETE SET NULL,
  matched_flow_id UUID REFERENCES public.whatsapp_flows(id) ON DELETE SET NULL,
  matched_node_id TEXT,
  outbound_message TEXT,
  outbound_attachments JSONB DEFAULT '[]'::jsonb,
  action_taken TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wfl_phone ON public.whatsapp_flow_logs(customer_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wfl_session ON public.whatsapp_flow_logs(session_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.whatsapp_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_flow_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_flow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_flow_logs ENABLE ROW LEVEL SECURITY;

-- Admins/managers full access
CREATE POLICY "Admins manage flows" ON public.whatsapp_flows
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins manage triggers" ON public.whatsapp_flow_triggers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins view sessions" ON public.whatsapp_flow_sessions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins view logs" ON public.whatsapp_flow_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Updated_at triggers
CREATE TRIGGER trg_wf_updated BEFORE UPDATE ON public.whatsapp_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wfs_updated BEFORE UPDATE ON public.whatsapp_flow_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wft_updated BEFORE UPDATE ON public.whatsapp_flow_triggers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SEED: Payment / Bank / UPI Trigger (GLOBAL)
-- ============================================
INSERT INTO public.whatsapp_flow_triggers (
  vertical_slug, trigger_name, keywords, intent_type, action_config, priority
) VALUES (
  NULL,
  'Bank & UPI Payment Details',
  ARRAY['account', 'account number', 'bank', 'bank details', 'payment', 'pay', 'upi', 'upi id', 'transfer', 'neft', 'imps', 'rtgs', 'how to pay', 'kaha pay karu', 'paisa', 'kha bheju', 'kahan bheju', 'account do', 'bank do'],
  'payment_info',
  jsonb_build_object(
    'account_name', 'WAKHRA SWAG LIFESTYLE PRIVATE LIMITED',
    'account_number', '10147461686',
    'ifsc', 'IDFB0020129',
    'swift', 'IDFBINBBMUM',
    'bank', 'IDFC FIRST',
    'branch', 'Gurgaon Sohna Road Branch',
    'upi_id', 'Wakhra.l@ptaxis',
    'upi_number', '9855924442',
    'reply_template', E'🏦 *Payment Details — GrabYourCar*\n\n*Bank Transfer:*\nAccount Name: WAKHRA SWAG LIFESTYLE PRIVATE LIMITED\nAccount No: 10147461686\nIFSC: IDFB0020129\nBank: IDFC FIRST (Gurgaon Sohna Road Branch)\nSWIFT: IDFBINBBMUM\n\n*UPI:*\nUPI ID: Wakhra.l@ptaxis\nUPI Number: 9855924442\n\n✅ After payment, please share the screenshot here. We will confirm within 5 minutes.'
  ),
  10
)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED: Document triggers per vertical
-- ============================================
INSERT INTO public.whatsapp_flow_triggers (vertical_slug, trigger_name, keywords, intent_type, action_config, required_identity_fields, fallback_message, priority) VALUES
('insurance', 'Send Insurance Policy', 
  ARRAY['policy', 'policy copy', 'insurance', 'insurance copy', 'soft copy', 'pdf', 'policy bhejo', 'policy do'],
  'document',
  jsonb_build_object('source_table', 'insurance_policies', 'document_type', 'policy_pdf', 'lookup_field', 'vehicle_number', 'pdf_url_field', 'policy_pdf_url'),
  ARRAY['vehicle_number'],
  'Please share your vehicle number to fetch your policy. Example: HR26AB1234',
  20),
('loans', 'Send Sanction Letter',
  ARRAY['sanction', 'sanction letter', 'loan letter', 'approval letter', 'loan document'],
  'document',
  jsonb_build_object('source_table', 'loan_applications', 'document_type', 'sanction_letter', 'lookup_field', 'phone', 'pdf_url_field', 'sanction_letter_url'),
  ARRAY['phone'],
  'Please share the phone number used for your loan application.',
  20),
('hsrp', 'HSRP Order Status',
  ARRAY['hsrp', 'order status', 'plate', 'number plate', 'where is my plate', 'hsrp status'],
  'sales_info',
  jsonb_build_object('source_table', 'hsrp_orders', 'lookup_field', 'vehicle_number', 'fields_to_send', ARRAY['order_status', 'tracking_number', 'estimated_delivery', 'courier_name']),
  ARRAY['vehicle_number'],
  'Please share your vehicle number to track your HSRP order.',
  20),
('self-drive', 'Booking / Invoice',
  ARRAY['booking', 'my booking', 'invoice', 'receipt', 'rental invoice'],
  'document',
  jsonb_build_object('source_table', 'rental_bookings', 'document_type', 'invoice', 'lookup_field', 'phone', 'pdf_url_field', 'invoice_url'),
  ARRAY['phone'],
  'Please share the phone number used for your booking.',
  20),
('accessories', 'Order Invoice',
  ARRAY['invoice', 'bill', 'receipt', 'accessory order', 'order'],
  'document',
  jsonb_build_object('source_table', 'accessory_orders', 'document_type', 'invoice', 'lookup_field', 'shipping_phone', 'pdf_url_field', 'invoice_url'),
  ARRAY['phone'],
  'Please share your registered phone number to fetch your order.',
  20),
-- Sales info: Car details (no AI, direct DB)
(NULL, 'Car Details from Database',
  ARRAY['fortuner', 'creta', 'thar', 'scorpio', 'nexon', 'brezza', 'baleno', 'swift', 'i20', 'venue', 'seltos', 'xuv', 'safari', 'harrier', 'innova', 'ertiga', 'car details', 'price', 'on road', 'features'],
  'sales_info',
  jsonb_build_object('source_table', 'cars', 'lookup_field', 'name', 'fields_to_send', ARRAY['name', 'brand', 'price_min', 'price_max', 'fuel_types', 'transmission', 'mileage', 'seating'], 'reply_prefix', 'Yes ji sir 🙏 Here are the details from our website:'),
  ARRAY[]::TEXT[],
  'Please mention the exact car model name (example: Fortuner, Creta, Thar) and I''ll send you the on-road price and features.',
  30),
-- Redirect for off-topic / abusive
(NULL, 'Redirect Off-Topic',
  ARRAY['hi', 'hello', 'hey', 'hii', 'hlo', 'help', 'support'],
  'redirect',
  jsonb_build_object('redirect_message', E'Hello ji 🙏 Welcome to GrabYourCar!\n\nPlease tell me what you need and I''ll help you instantly:\n\n📄 *Send "policy"* — for insurance policy copy\n💰 *Send "sanction"* — for loan sanction letter\n🚘 *Send "hsrp"* — for number plate status\n📋 *Send "invoice"* — for any invoice/receipt\n🏦 *Send "account"* — for bank/UPI payment details\n🚗 *Send car name* (Fortuner, Creta, etc.) — for price & features\n\nOr type your question and I''ll guide you.'),
  ARRAY[]::TEXT[],
  NULL,
  90)
ON CONFLICT DO NOTHING;