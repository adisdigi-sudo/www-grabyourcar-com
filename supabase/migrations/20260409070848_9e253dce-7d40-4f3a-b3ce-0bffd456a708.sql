
-- Contact Scoring & Timezone columns on email_subscribers
ALTER TABLE public.email_subscribers
  ADD COLUMN IF NOT EXISTS engagement_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_opens integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_clicks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS optimal_send_hour integer;

-- Pop-up Forms table
CREATE TABLE IF NOT EXISTS public.popup_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  form_type text NOT NULL DEFAULT 'popup',
  trigger_type text NOT NULL DEFAULT 'time_delay',
  delay_seconds integer DEFAULT 5,
  html_content text,
  target_url text,
  is_active boolean DEFAULT false,
  impressions integer DEFAULT 0,
  conversions integer DEFAULT 0,
  list_id uuid REFERENCES public.email_lists(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.popup_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage popup forms" ON public.popup_forms
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Cart Abandonment table
CREATE TABLE IF NOT EXISTS public.cart_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  email text,
  cart_data jsonb DEFAULT '[]'::jsonb,
  cart_value numeric DEFAULT 0,
  abandoned_at timestamptz,
  recovery_email_sent boolean DEFAULT false,
  recovery_email_sent_at timestamptz,
  recovered boolean DEFAULT false,
  recovered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cart_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert cart events" ON public.cart_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins view cart events" ON public.cart_events
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins update cart events" ON public.cart_events
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Email Polls
CREATE TABLE IF NOT EXISTS public.email_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  campaign_id uuid REFERENCES public.email_campaigns(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  total_votes integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage polls" ON public.email_polls
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Public can view active polls" ON public.email_polls
  FOR SELECT TO anon
  USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.email_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.email_polls(id) ON DELETE CASCADE,
  subscriber_email text NOT NULL,
  selected_option text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, subscriber_email)
);

ALTER TABLE public.email_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can vote" ON public.email_poll_votes
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins view votes" ON public.email_poll_votes
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Batch sending columns on email_campaigns
ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS batch_size integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS batch_delay_seconds integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS send_in_timezone boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS optimal_time_send boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_batches jsonb DEFAULT '[]'::jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cart_events_email ON public.cart_events(email);
CREATE INDEX IF NOT EXISTS idx_cart_events_abandoned ON public.cart_events(abandoned_at) WHERE recovered = false AND recovery_email_sent = false;
CREATE INDEX IF NOT EXISTS idx_email_subscribers_score ON public.email_subscribers(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_popup_forms_active ON public.popup_forms(is_active) WHERE is_active = true;
