
-- Conversations table
CREATE TABLE public.wa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  customer_name TEXT,
  customer_profile_pic TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_customer_message_at TIMESTAMPTZ,
  window_expires_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  assigned_vertical TEXT,
  assigned_user_id UUID,
  lead_id UUID,
  client_id UUID,
  status TEXT DEFAULT 'active',
  is_pinned BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(phone)
);

ALTER TABLE public.wa_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view conversations"
  ON public.wa_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert conversations"
  ON public.wa_conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update conversations"
  ON public.wa_conversations FOR UPDATE TO authenticated USING (true);

CREATE INDEX idx_wa_conversations_phone ON public.wa_conversations(phone);
CREATE INDEX idx_wa_conversations_last_msg ON public.wa_conversations(last_message_at DESC);
CREATE INDEX idx_wa_conversations_vertical ON public.wa_conversations(assigned_vertical);

-- Messages table
CREATE TABLE public.wa_inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL DEFAULT 'outbound',
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  media_filename TEXT,
  template_name TEXT,
  template_variables JSONB,
  button_payload TEXT,
  wa_message_id TEXT,
  status TEXT DEFAULT 'pending',
  status_updated_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  sent_by UUID,
  sent_by_name TEXT,
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wa_inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view messages"
  ON public.wa_inbox_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert messages"
  ON public.wa_inbox_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update messages"
  ON public.wa_inbox_messages FOR UPDATE TO authenticated USING (true);

CREATE INDEX idx_wa_inbox_messages_conv ON public.wa_inbox_messages(conversation_id, created_at DESC);
CREATE INDEX idx_wa_inbox_messages_wa_id ON public.wa_inbox_messages(wa_message_id);
CREATE INDEX idx_wa_inbox_messages_status ON public.wa_inbox_messages(status);

-- Templates table
CREATE TABLE public.wa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT,
  category TEXT DEFAULT 'utility',
  language TEXT DEFAULT 'en',
  body TEXT NOT NULL,
  header_type TEXT,
  header_content TEXT,
  footer TEXT,
  variables JSONB DEFAULT '[]',
  buttons JSONB DEFAULT '[]',
  sample_values JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  meta_template_id TEXT,
  vertical TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wa_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage templates"
  ON public.wa_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Quick replies
CREATE TABLE public.wa_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  shortcut TEXT,
  message TEXT NOT NULL,
  variables TEXT[],
  vertical TEXT,
  category TEXT DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wa_quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage quick replies"
  ON public.wa_quick_replies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_inbox_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_conversations;

-- Auto-update timestamps
CREATE TRIGGER update_wa_conversations_updated_at
  BEFORE UPDATE ON public.wa_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_inbox_messages_updated_at
  BEFORE UPDATE ON public.wa_inbox_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_templates_updated_at
  BEFORE UPDATE ON public.wa_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_quick_replies_updated_at
  BEFORE UPDATE ON public.wa_quick_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
