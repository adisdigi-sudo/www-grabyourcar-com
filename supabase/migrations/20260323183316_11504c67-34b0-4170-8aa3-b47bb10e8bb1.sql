
-- D2C E-Commerce: Orders with RTO fields (extends existing accessory_orders concept)
CREATE TABLE public.ecommerce_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL DEFAULT ('ORD-' || to_char(now(), 'YYYYMMDD') || '-' || substring(gen_random_uuid()::text, 1, 6)),
  contact_name text,
  contact_phone text,
  contact_email text,
  items jsonb DEFAULT '[]'::jsonb,
  subtotal numeric DEFAULT 0,
  shipping_fee numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  payment_method text DEFAULT 'prepaid',
  payment_status text DEFAULT 'pending',
  status text DEFAULT 'pending',
  shipping_address jsonb DEFAULT '{}'::jsonb,
  tracking_number text,
  courier_partner text,
  -- RTO fields
  risk_score integer DEFAULT 0,
  risk_level text DEFAULT 'low',
  risk_factors text[] DEFAULT '{}',
  is_flagged boolean DEFAULT false,
  c2p_attempted boolean DEFAULT false,
  c2p_converted boolean DEFAULT false,
  ndr_status text,
  ndr_attempts integer DEFAULT 0,
  -- Metadata
  source text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ecommerce_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ecommerce_orders" ON public.ecommerce_orders FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Return Requests
CREATE TABLE public.return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.ecommerce_orders(id) ON DELETE CASCADE,
  contact_name text,
  contact_phone text,
  contact_email text,
  type text DEFAULT 'return',
  reason text,
  status text DEFAULT 'pending',
  resolution text,
  qc_status text,
  refund_amount numeric,
  rejected_reason text,
  media_urls text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage return_requests" ON public.return_requests FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Return Rules
CREATE TABLE public.return_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  return_window_days integer DEFAULT 7,
  applicable_to text DEFAULT 'all',
  require_media boolean DEFAULT false,
  auto_approve boolean DEFAULT false,
  exchange_allowed boolean DEFAULT true,
  refund_allowed boolean DEFAULT true,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.return_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage return_rules" ON public.return_rules FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Omnichannel Conversations
CREATE TABLE public.omni_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text,
  contact_phone text,
  contact_email text,
  channel text DEFAULT 'whatsapp',
  status text DEFAULT 'open',
  assigned_to uuid,
  subject text,
  last_message_at timestamptz DEFAULT now(),
  last_message_preview text,
  tags text[] DEFAULT '{}',
  unread_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.omni_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage omni_conversations" ON public.omni_conversations FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Omnichannel Messages
CREATE TABLE public.omni_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.omni_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid,
  direction text DEFAULT 'inbound',
  content text NOT NULL,
  content_type text DEFAULT 'text',
  attachments jsonb DEFAULT '[]'::jsonb,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.omni_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage omni_messages" ON public.omni_messages FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Enable realtime for conversations and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.omni_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.omni_messages;
