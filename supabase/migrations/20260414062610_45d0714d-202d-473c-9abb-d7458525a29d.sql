
-- Campaign tracking for bulk dealer inquiries
CREATE TABLE public.dealer_inquiry_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  variant TEXT,
  color TEXT,
  message_template TEXT NOT NULL,
  template_type TEXT DEFAULT 'stock_inquiry',
  total_dealers INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  ai_followup_enabled BOOLEAN DEFAULT false,
  ai_followup_script TEXT,
  ai_followup_delay_minutes INTEGER DEFAULT 3,
  status TEXT DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dealer_inquiry_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage dealer inquiry campaigns"
ON public.dealer_inquiry_campaigns FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Per-recipient tracking
CREATE TABLE public.dealer_inquiry_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.dealer_inquiry_campaigns(id) ON DELETE CASCADE NOT NULL,
  dealer_rep_id UUID REFERENCES public.dealer_representatives(id),
  dealer_name TEXT,
  rep_name TEXT,
  phone TEXT NOT NULL,
  send_status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  reply_message TEXT,
  ai_followup_sent BOOLEAN DEFAULT false,
  ai_followup_sent_at TIMESTAMPTZ,
  ai_followup_reply TEXT,
  ai_qualified BOOLEAN,
  qualification_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dealer_inquiry_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage dealer inquiry recipients"
ON public.dealer_inquiry_recipients FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_dir_campaign ON public.dealer_inquiry_recipients(campaign_id);
CREATE INDEX idx_dir_status ON public.dealer_inquiry_recipients(send_status);

CREATE TRIGGER update_dic_updated_at BEFORE UPDATE ON public.dealer_inquiry_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
