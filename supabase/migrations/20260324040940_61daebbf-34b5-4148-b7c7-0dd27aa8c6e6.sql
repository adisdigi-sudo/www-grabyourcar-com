
-- Contacts table for omnichannel CRM
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage contacts" ON public.contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Conversations (omnichannel inbox)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  subject TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  tags TEXT[] DEFAULT '{}',
  unread_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage conversations" ON public.conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID,
  contact_id UUID,
  direction TEXT NOT NULL DEFAULT 'inbound',
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  attachments JSONB DEFAULT '[]',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage messages" ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Orders (ecommerce)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id),
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'cod',
  subtotal NUMERIC DEFAULT 0,
  shipping_fee NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  shipping_address JSONB,
  items JSONB DEFAULT '[]',
  tracking_number TEXT,
  courier_partner TEXT,
  risk_score INT DEFAULT 0,
  risk_level TEXT DEFAULT 'low',
  risk_factors TEXT[] DEFAULT '{}',
  is_flagged BOOLEAN DEFAULT false,
  c2p_attempted BOOLEAN DEFAULT false,
  c2p_converted BOOLEAN DEFAULT false,
  ndr_status TEXT,
  ndr_attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Return Requests
CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id),
  contact_id UUID REFERENCES public.contacts(id),
  type TEXT DEFAULT 'return',
  reason TEXT,
  reason_category TEXT,
  status TEXT DEFAULT 'pending',
  resolution TEXT,
  qc_status TEXT,
  refund_amount NUMERIC DEFAULT 0,
  rejected_reason TEXT,
  media_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage returns" ON public.return_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Return Rules
CREATE TABLE IF NOT EXISTS public.return_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  return_window_days INT DEFAULT 7,
  applicable_to TEXT DEFAULT 'all',
  require_media BOOLEAN DEFAULT false,
  auto_approve BOOLEAN DEFAULT false,
  exchange_allowed BOOLEAN DEFAULT true,
  refund_allowed BOOLEAN DEFAULT true,
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.return_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage return rules" ON public.return_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customer Risk Profiles
CREATE TABLE IF NOT EXISTS public.customer_risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  total_orders INT DEFAULT 0,
  delivered_orders INT DEFAULT 0,
  rto_orders INT DEFAULT 0,
  cancelled_orders INT DEFAULT 0,
  returned_orders INT DEFAULT 0,
  cod_orders INT DEFAULT 0,
  prepaid_orders INT DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  avg_order_value NUMERIC DEFAULT 0,
  rto_rate NUMERIC DEFAULT 0,
  cancel_rate NUMERIC DEFAULT 0,
  return_rate NUMERIC DEFAULT 0,
  risk_score INT DEFAULT 0,
  risk_level TEXT DEFAULT 'low',
  cod_enabled BOOLEAN DEFAULT true,
  partial_payment_required BOOLEAN DEFAULT false,
  partial_payment_percent INT DEFAULT 30,
  ndr_count INT DEFAULT 0,
  last_order_at TIMESTAMPTZ,
  risk_factors TEXT[] DEFAULT '{}',
  computed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.customer_risk_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage risk profiles" ON public.customer_risk_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Campaigns (WhatsApp)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'bulk',
  channel TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'draft',
  message_template TEXT,
  total_recipients INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  read_count INT DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage campaigns" ON public.campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WhatsApp Templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'marketing',
  language TEXT DEFAULT 'en',
  body_text TEXT NOT NULL,
  header_type TEXT,
  header_content TEXT,
  footer_text TEXT,
  buttons JSONB DEFAULT '[]',
  variables JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage wa templates" ON public.whatsapp_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Chatbot Flows
CREATE TABLE IF NOT EXISTS public.chatbot_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT DEFAULT 'keyword',
  trigger_value TEXT,
  flow_data JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chatbot_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage chatbot flows" ON public.chatbot_flows FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Quick Replies
CREATE TABLE IF NOT EXISTS public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcut TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage quick replies" ON public.quick_replies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Email Lists
CREATE TABLE IF NOT EXISTS public.email_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  subscriber_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage email lists" ON public.email_lists FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Email Subscribers
CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES public.email_lists(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'subscribed',
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage email subscribers" ON public.email_subscribers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Email Templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT,
  html_content TEXT,
  json_content JSONB,
  category TEXT DEFAULT 'custom',
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage email templates" ON public.email_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Email Campaigns
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT,
  from_name TEXT,
  from_email TEXT,
  reply_to TEXT,
  template_id UUID REFERENCES public.email_templates(id),
  list_id UUID REFERENCES public.email_lists(id),
  html_content TEXT,
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  opened_count INT DEFAULT 0,
  clicked_count INT DEFAULT 0,
  bounced_count INT DEFAULT 0,
  unsubscribed_count INT DEFAULT 0,
  complained_count INT DEFAULT 0,
  open_rate NUMERIC DEFAULT 0,
  click_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage email campaigns" ON public.email_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Checkout Settings
CREATE TABLE IF NOT EXISTS public.checkout_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partial_payment_enabled BOOLEAN DEFAULT false,
  partial_payment_default_percent INT DEFAULT 30,
  auto_disable_cod_threshold INT DEFAULT 70,
  cod_order_limit NUMERIC DEFAULT 5000,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.checkout_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage checkout settings" ON public.checkout_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
