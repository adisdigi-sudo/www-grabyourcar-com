
-- Create email_campaigns table for bulk email management
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_id UUID REFERENCES public.email_templates(id),
  html_content TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  segment_filter JSONB DEFAULT '{}',
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add campaign_id to email_logs for tracking
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.email_campaigns(id);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- Admin read/write policies
CREATE POLICY "Admins can manage campaigns" ON public.email_campaigns
  FOR ALL USING (true) WITH CHECK (true);

-- Add tags column to email_subscribers for segmentation
ALTER TABLE public.email_subscribers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.email_subscribers ADD COLUMN IF NOT EXISTS company TEXT;

-- Enable realtime for campaign status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_campaigns;

-- Trigger for updated_at
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
