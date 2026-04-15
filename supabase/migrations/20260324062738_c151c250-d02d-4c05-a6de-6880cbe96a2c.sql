
CREATE TABLE public.dealer_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_company_id UUID REFERENCES public.dealer_companies(id) ON DELETE CASCADE,
  dealer_rep_id UUID REFERENCES public.dealer_representatives(id) ON DELETE SET NULL,
  direction TEXT NOT NULL DEFAULT 'outbound',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  message TEXT NOT NULL,
  sender_name TEXT,
  sender_phone TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'sent',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dealer_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage dealer chats"
ON public.dealer_chat_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_dealer_chat_company ON public.dealer_chat_history(dealer_company_id);
CREATE INDEX idx_dealer_chat_created ON public.dealer_chat_history(created_at DESC);

-- Add full-text search index on dealer_companies for keyword search
CREATE INDEX idx_dealer_companies_search ON public.dealer_companies 
  USING gin(to_tsvector('english', coalesce(company_name,'') || ' ' || coalesce(brand_name,'') || ' ' || coalesce(city,'') || ' ' || coalesce(state,'') || ' ' || coalesce(region,'') || ' ' || coalesce(notes,'')));
