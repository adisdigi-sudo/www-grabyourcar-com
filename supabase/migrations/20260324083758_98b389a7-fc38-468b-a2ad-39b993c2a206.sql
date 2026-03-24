CREATE TABLE IF NOT EXISTS public.ai_cofounder_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  title text DEFAULT 'AI Co-Founder Chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_cofounder_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cofounder conversations" ON public.ai_cofounder_conversations
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_cofounder_conversations;