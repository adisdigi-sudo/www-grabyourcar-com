
-- Add blocks_json to email_templates
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS blocks_json JSONB;

-- Create email_drip_enrollments table
CREATE TABLE IF NOT EXISTS public.email_drip_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES public.email_subscribers(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  current_step_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_send_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(subscriber_id, sequence_id)
);

ALTER TABLE public.email_drip_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on drip enrollments"
  ON public.email_drip_enrollments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on drip enrollments"
  ON public.email_drip_enrollments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on drip enrollments"
  ON public.email_drip_enrollments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete on drip enrollments"
  ON public.email_drip_enrollments FOR DELETE TO authenticated USING (true);

-- Enable realtime on email_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_logs;
