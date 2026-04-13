
-- Table to store incoming/received emails
CREATE TABLE public.received_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  cc TEXT,
  bcc TEXT,
  reply_to TEXT,
  message_id TEXT,
  in_reply_to TEXT,
  headers JSONB,
  attachments JSONB,
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_spam BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  folder TEXT DEFAULT 'inbox',
  received_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast folder queries
CREATE INDEX idx_received_emails_folder ON public.received_emails(folder);
CREATE INDEX idx_received_emails_to ON public.received_emails(to_email);
CREATE INDEX idx_received_emails_received ON public.received_emails(received_at DESC);

-- RLS
ALTER TABLE public.received_emails ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read received emails"
  ON public.received_emails FOR SELECT TO authenticated
  USING (true);

-- Allow authenticated users to update (mark read, star, etc.)
CREATE POLICY "Authenticated users can update received emails"
  ON public.received_emails FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Allow service role inserts (from edge function)
CREATE POLICY "Service role can insert received emails"
  ON public.received_emails FOR INSERT TO service_role
  WITH CHECK (true);

-- Also allow anon insert for webhook
CREATE POLICY "Anon can insert received emails"
  ON public.received_emails FOR INSERT TO anon
  WITH CHECK (true);
