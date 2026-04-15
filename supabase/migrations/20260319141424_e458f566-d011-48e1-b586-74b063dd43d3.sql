
-- AI Knowledge Base for editable company knowledge snippets
CREATE TABLE public.ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai_knowledge_base" ON public.ai_knowledge_base FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Read active knowledge" ON public.ai_knowledge_base FOR SELECT TO anon USING (is_active = true);

-- AI Conversation Analytics
CREATE TABLE public.ai_conversation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  intent_detected TEXT,
  lead_captured BOOLEAN DEFAULT false,
  lead_id UUID,
  response_quality_score NUMERIC,
  conversation_id TEXT,
  message_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_conversation_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read analytics" ON public.ai_conversation_analytics FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Add columns to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS human_takeover BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS intent_detected TEXT;

-- Seed knowledge base with core company data
INSERT INTO public.ai_knowledge_base (category, title, content, sort_order) VALUES
('company', 'Company Identity', 'GrabYourCar (Adis Makethemoney Services Pvt Ltd) is India''s leading car buying platform. 500+ deliveries, 50+ corporate clients. Website: www.grabyourcar.com', 1),
('services', 'Car Sales', 'New car sales across all major brands: Maruti Suzuki, Hyundai, Tata Motors, Mahindra, Kia, Toyota, Honda, MG Motor, Skoda, Volkswagen, Citroen, Jeep, Renault, Nissan, BMW, Mercedes, Audi. Best on-road prices with exclusive dealer discounts.', 2),
('services', 'Car Insurance', 'Car insurance with up to 70% discount. All types: Comprehensive, Third Party, Zero Dep, Engine Protect, RSA. Partners: ICICI Lombard, HDFC Ergo, Bajaj Allianz, New India, United India, National, Oriental. Instant policy issuance.', 3),
('services', 'Car Loans', 'Car finance from 8.5% interest rate. Up to 100% on-road funding. Instant approval. EMI options from 12-84 months. Partners: SBI, HDFC, ICICI, Axis, Kotak, IndusInd. Free credit score check.', 4),
('services', 'HSRP Services', 'High Security Registration Plate booking. Genuine government-approved HSRP plates. Home delivery available. Status tracking. Bulk HSRP for dealers.', 5),
('services', 'Accessories', 'Genuine car accessories: Seat covers, floor mats, music systems, dash cameras, GPS trackers, alloy wheels, body kits, lights, interior accessories. 7-day return policy. Free delivery above ₹999.', 6),
('services', 'Self-Drive Rentals', 'Self-drive car rentals available in Delhi NCR only. Daily, weekly, monthly plans. Fuel included options. Insurance covered. Chauffeur-driven also available.', 7),
('policies', 'Business Rules', 'Accessories: 7-day return policy. Self-drive: Delhi NCR region only. Corporate enquiries: Direct to /corporate portal, don''t list specific client names. Communication style: Friendly professional advisor with light Hindi-English mix.', 8),
('contact', 'Contact & Support', 'Website: www.grabyourcar.com | WhatsApp: Available 24/7 | Email: info@grabyourcar.com | Office: Delhi NCR', 9);
