
-- Dealer auto-reply flow rules
CREATE TABLE IF NOT EXISTS public.dealer_reply_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  -- Match config
  match_type TEXT NOT NULL DEFAULT 'keyword', -- 'keyword' | 'regex' | 'fallback' | 'ai'
  keywords TEXT[] NOT NULL DEFAULT '{}',      -- e.g. {'yes','haan','available','ready'}
  -- Reply
  reply_template TEXT,                         -- supports {rep_name} {brand} {model} {variant}
  -- Behavior
  priority INTEGER NOT NULL DEFAULT 100,       -- lower = earlier match
  is_active BOOLEAN NOT NULL DEFAULT true,
  ai_fallback BOOLEAN NOT NULL DEFAULT false,  -- if no keyword matches, AI replies
  -- Stats
  trigger_count INTEGER NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  -- Standard
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dealer_reply_flows_active_priority
  ON public.dealer_reply_flows (is_active, priority);

ALTER TABLE public.dealer_reply_flows ENABLE ROW LEVEL SECURITY;

-- Admins manage; everyone authenticated can read (used by webhook via service role anyway)
CREATE POLICY "Admins manage dealer reply flows"
  ON public.dealer_reply_flows
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read dealer reply flows"
  ON public.dealer_reply_flows
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_dealer_reply_flows_updated ON public.dealer_reply_flows;
CREATE TRIGGER trg_dealer_reply_flows_updated
  BEFORE UPDATE ON public.dealer_reply_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default flows
INSERT INTO public.dealer_reply_flows (rule_name, match_type, keywords, reply_template, priority, ai_fallback)
VALUES
  ('Dealer says YES / Available',
   'keyword',
   ARRAY['yes','haan','han','available','ready','stock','ha ji','hanji','hain','mil jayega','ho jayega','sure'],
   'Bhai zabardast! 🎯 Apna *best on-road price* + *delivery date* WhatsApp pe bhej do — client ready hai, deal close karte hain.',
   10, false),
  ('Dealer says NO / Out of stock',
   'keyword',
   ARRAY['no','nahi','nahin','sorry','out of stock','not available','khatam','nahi hai','not in stock'],
   'Theek hai bhai, dhanyavaad. Jab bhi stock aaye please ping kar dena 🙏',
   20, false),
  ('Dealer asks for client details',
   'keyword',
   ARRAY['client','customer','name','number','contact','kaun','kiska'],
   'Client serious hai, ready with payment. Pehle aap *price + availability* confirm kar do, fir client ka full detail share karta hoon 👍',
   30, false),
  ('Dealer asks Top price / Best offer',
   'keyword',
   ARRAY['top','best','final','last','lowest','minimum','kam se kam','aakhri'],
   'Bhai apna *top corporate price* (on-road, all-inclusive) bhej do — hum bulk volume karte hain, fair deal pakka.',
   40, false),
  ('AI Fallback (anything else)',
   'ai',
   ARRAY[]::text[],
   NULL,
   999, true)
ON CONFLICT DO NOTHING;
