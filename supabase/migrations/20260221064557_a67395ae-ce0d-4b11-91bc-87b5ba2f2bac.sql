
-- Lead intake automation tracking table
-- Mirrors n8n workflow state: tracks lead processing, executive assignment, contact status, follow-up alerts
CREATE TABLE public.automation_lead_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  city TEXT,
  vertical TEXT NOT NULL DEFAULT 'General Enquiry',
  multi_vertical_tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'Website',
  lead_source_type TEXT DEFAULT 'Organic',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'New Lead',
  contacted BOOLEAN NOT NULL DEFAULT false,
  contacted_at TIMESTAMPTZ,
  assigned_executive_email TEXT DEFAULT 'hello@grabyourcar.com',
  assigned_executive_phone TEXT DEFAULT '+919855924442',
  assigned_at TIMESTAMPTZ DEFAULT now(),
  follow_up_due TIMESTAMPTZ,
  follow_up_alert_sent BOOLEAN NOT NULL DEFAULT false,
  manager_alerted BOOLEAN NOT NULL DEFAULT false,
  executive_notified BOOLEAN NOT NULL DEFAULT false,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for dedup by phone
CREATE INDEX idx_automation_lead_phone ON public.automation_lead_tracking(phone);
-- Index for follow-up checker
CREATE INDEX idx_automation_lead_followup ON public.automation_lead_tracking(follow_up_due, contacted, follow_up_alert_sent) WHERE contacted = false AND follow_up_alert_sent = false;

-- Enable RLS
ALTER TABLE public.automation_lead_tracking ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage automation leads"
ON public.automation_lead_tracking
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Service role needs full access for edge functions
CREATE POLICY "Service role full access on automation leads"
ON public.automation_lead_tracking
FOR ALL
USING (true)
WITH CHECK (true);
