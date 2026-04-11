
-- WA Contacts table for contact management
CREATE TABLE public.wa_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  city TEXT,
  tags TEXT[] DEFAULT '{}',
  segment TEXT DEFAULT 'general',
  notes TEXT,
  lead_id UUID,
  client_id UUID,
  conversation_id UUID,
  opted_in BOOLEAN DEFAULT false,
  opted_in_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  total_messages INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(phone)
);

ALTER TABLE public.wa_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage wa_contacts"
  ON public.wa_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_wa_contacts_phone ON public.wa_contacts(phone);
CREATE INDEX idx_wa_contacts_segment ON public.wa_contacts(segment);
CREATE INDEX idx_wa_contacts_tags ON public.wa_contacts USING GIN(tags);

CREATE TRIGGER update_wa_contacts_updated_at
  BEFORE UPDATE ON public.wa_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WA Flows table for visual automation builder
CREATE TABLE public.wa_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'keyword',
  trigger_config JSONB DEFAULT '{}',
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT false,
  vertical TEXT,
  total_runs INT DEFAULT 0,
  total_completions INT DEFAULT 0,
  total_failures INT DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage wa_flows"
  ON public.wa_flows FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_wa_flows_updated_at
  BEFORE UPDATE ON public.wa_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WA Chatbot Rules for intent detection and auto-replies
CREATE TABLE public.wa_chatbot_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  intent_keywords TEXT[] DEFAULT '{}',
  response_type TEXT NOT NULL DEFAULT 'text',
  response_content TEXT,
  template_name TEXT,
  ai_prompt TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 10,
  vertical TEXT,
  match_count INT DEFAULT 0,
  last_matched_at TIMESTAMPTZ,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_chatbot_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage wa_chatbot_rules"
  ON public.wa_chatbot_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_wa_chatbot_rules_updated_at
  BEFORE UPDATE ON public.wa_chatbot_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
