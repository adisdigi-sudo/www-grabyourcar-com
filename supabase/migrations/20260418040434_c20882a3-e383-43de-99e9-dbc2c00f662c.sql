
-- ============================================
-- UNIVERSAL SALES ENGINE — PHASE 1 SCHEMA
-- ============================================

-- 1. Engine definition (one per vertical or per use-case)
CREATE TABLE public.sales_engines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  vertical TEXT NOT NULL, -- 'loans' | 'insurance' | 'sales' | 'hsrp' | 'rentals' | 'accessories' | 'custom'
  trigger_template_name TEXT, -- WhatsApp template that activates this engine when sent
  language TEXT DEFAULT 'hinglish',
  is_active BOOLEAN DEFAULT true,
  qualify_action TEXT DEFAULT 'create_lead', -- 'create_lead' | 'tag_only' | 'handover'
  handover_phone TEXT, -- agent phone to ping on qualify
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Each step in the conversation flow
CREATE TABLE public.sales_engine_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engine_id UUID NOT NULL REFERENCES public.sales_engines(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL, -- 'step_1' | 'ask_amount' | etc. (unique per engine)
  step_order INTEGER NOT NULL DEFAULT 0,
  title TEXT, -- internal label e.g. "Initial Question"
  message_text TEXT NOT NULL, -- what we send to customer
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'image' | 'video' | 'document' | 'template'
  media_url TEXT,
  template_name TEXT, -- if message_type = 'template'
  expects_reply BOOLEAN DEFAULT true,
  capture_field TEXT, -- 'amount' | 'salary' | 'city' — saves reply to session.qualification_data
  is_initial BOOLEAN DEFAULT false, -- starting step
  is_terminal BOOLEAN DEFAULT false, -- end of flow
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(engine_id, step_key)
);

-- 3. Branches (how reply routes to next step)
CREATE TABLE public.sales_engine_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES public.sales_engine_steps(id) ON DELETE CASCADE,
  branch_order INTEGER NOT NULL DEFAULT 0,
  match_type TEXT NOT NULL DEFAULT 'keyword', -- 'keyword' | 'regex' | 'any' | 'no_match'
  match_keywords TEXT[], -- ['haan','yes','chahiye','interested']
  next_step_key TEXT, -- next step within same engine
  action TEXT NOT NULL DEFAULT 'continue', -- 'continue' | 'qualify' | 'disqualify' | 'handover' | 'end'
  action_note TEXT, -- e.g. "qualified for car loan"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Live customer sessions
CREATE TABLE public.sales_engine_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engine_id UUID NOT NULL REFERENCES public.sales_engines(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  customer_name TEXT,
  current_step_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending_reply', -- 'pending_reply' | 'active' | 'qualified' | 'disqualified' | 'handover' | 'paused' | 'completed'
  qualification_data JSONB DEFAULT '{}'::jsonb, -- captured fields
  triggered_by_campaign UUID, -- broadcast/campaign id
  paused_by_agent BOOLEAN DEFAULT false,
  pause_reason TEXT,
  qualified_at TIMESTAMPTZ,
  lead_id_created UUID, -- the lead created in vertical CRM
  lead_table TEXT, -- 'loans_pipeline' | 'insurance_clients' etc.
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reply_at TIMESTAMPTZ,
  last_message_sent_at TIMESTAMPTZ,
  total_replies INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ses_engine_sessions_phone ON public.sales_engine_sessions(phone);
CREATE INDEX idx_ses_engine_sessions_status ON public.sales_engine_sessions(status);
CREATE INDEX idx_ses_engine_sessions_engine ON public.sales_engine_sessions(engine_id);

-- 5. Audit log (every message in/out within engine)
CREATE TABLE public.sales_engine_session_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sales_engine_sessions(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- 'inbound' | 'outbound'
  step_key TEXT,
  branch_matched TEXT,
  message_text TEXT,
  message_type TEXT DEFAULT 'text',
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ses_engine_logs_session ON public.sales_engine_session_logs(session_id);

-- ============================================
-- RLS — Admin/CRM users only
-- ============================================
ALTER TABLE public.sales_engines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_engine_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_engine_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_engine_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_engine_session_logs ENABLE ROW LEVEL SECURITY;

-- Engines: all CRM users can view, only admins can write
CREATE POLICY "CRM users view engines" ON public.sales_engines FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.crm_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Admins manage engines" ON public.sales_engines FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "CRM users view steps" ON public.sales_engine_steps FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.crm_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Admins manage steps" ON public.sales_engine_steps FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "CRM users view branches" ON public.sales_engine_branches FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.crm_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Admins manage branches" ON public.sales_engine_branches FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "CRM users view sessions" ON public.sales_engine_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.crm_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "CRM users manage sessions" ON public.sales_engine_sessions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.crm_users WHERE auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.crm_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "CRM users view session logs" ON public.sales_engine_session_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.crm_users WHERE auth_user_id = auth.uid()));
CREATE POLICY "CRM users insert session logs" ON public.sales_engine_session_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.crm_users WHERE auth_user_id = auth.uid()));

-- ============================================
-- updated_at triggers
-- ============================================
CREATE TRIGGER trg_sales_engines_updated BEFORE UPDATE ON public.sales_engines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sales_engine_steps_updated BEFORE UPDATE ON public.sales_engine_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sales_engine_sessions_updated BEFORE UPDATE ON public.sales_engine_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SEED — 4 default engines (Loan, Insurance, Sales, HSRP)
-- ============================================
DO $$
DECLARE
  v_loan_id UUID;
  v_ins_id UUID;
  v_sales_id UUID;
  v_hsrp_id UUID;
  v_step UUID;
BEGIN
  -- LOAN ENGINE
  INSERT INTO public.sales_engines(name, description, vertical, language, qualify_action)
  VALUES ('Car Loan Qualifier', 'Qualifies bulk video recipients for car loans', 'loans', 'hinglish', 'create_lead')
  RETURNING id INTO v_loan_id;

  INSERT INTO public.sales_engine_steps(engine_id, step_key, step_order, title, message_text, is_initial, capture_field)
  VALUES (v_loan_id, 'ask_intent', 1, 'Initial Interest', 'Namaste 🙏 Aapko car loan chahiye? Hum 7.5% se start hone wali EMI options dete hain. Reply YES ya NO 👇', true, NULL)
  RETURNING id INTO v_step;
  INSERT INTO public.sales_engine_branches(step_id, branch_order, match_type, match_keywords, next_step_key, action) VALUES
    (v_step, 1, 'keyword', ARRAY['yes','haan','chahiye','interested','y','han','ji','ok','okay','intrested'], 'ask_amount', 'continue'),
    (v_step, 2, 'keyword', ARRAY['no','nahi','not interested','nhi','n','later','baad mein'], NULL, 'disqualify');

  INSERT INTO public.sales_engine_steps(engine_id, step_key, step_order, title, message_text, capture_field)
  VALUES (v_loan_id, 'ask_amount', 2, 'Loan Amount', 'Great! Kitne ka loan chahiye? (e.g. 5 lakh, 10 lakh)', 'loan_amount')
  RETURNING id INTO v_step;
  INSERT INTO public.sales_engine_branches(step_id, branch_order, match_type, next_step_key, action) VALUES
    (v_step, 1, 'any', 'ask_salary', 'continue');

  INSERT INTO public.sales_engine_steps(engine_id, step_key, step_order, title, message_text, capture_field)
  VALUES (v_loan_id, 'ask_salary', 3, 'Monthly Salary', 'Aapki monthly income kitni hai? (loan eligibility ke liye)', 'monthly_income')
  RETURNING id INTO v_step;
  INSERT INTO public.sales_engine_branches(step_id, branch_order, match_type, next_step_key, action) VALUES
    (v_step, 1, 'any', 'ask_city', 'continue');

  INSERT INTO public.sales_engine_steps(engine_id, step_key, step_order, title, message_text, capture_field, is_terminal)
  VALUES (v_loan_id, 'ask_city', 4, 'City', 'Last question — aap kis city me rehte hain?', 'city', true)
  RETURNING id INTO v_step;
  INSERT INTO public.sales_engine_branches(step_id, branch_order, match_type, action, action_note) VALUES
    (v_step, 1, 'any', 'qualify', 'Loan lead qualified — agent will call within 30 mins');

  -- INSURANCE ENGINE
  INSERT INTO public.sales_engines(name, description, vertical, language, qualify_action)
  VALUES ('Insurance Renewal Qualifier', 'Qualifies recipients for car insurance renewal', 'insurance', 'hinglish', 'create_lead')
  RETURNING id INTO v_ins_id;

  INSERT INTO public.sales_engine_steps(engine_id, step_key, step_order, title, message_text, is_initial)
  VALUES (v_ins_id, 'ask_intent', 1, 'Initial Interest', 'Namaste 🙏 Kya aapki car insurance renewal due hai? Hum 40% tak NCB benefit aur best premium dete hain. Reply YES ya NO 👇', true)
  RETURNING id INTO v_step;
  INSERT INTO public.sales_engine_branches(step_id, branch_order, match_type, match_keywords, next_step_key, action) VALUES
    (v_step, 1, 'keyword', ARRAY['yes','haan','chahiye','interested','y','han','ji','ok','renew'], 'ask_vehicle', 'continue'),
    (v_step, 2, 'keyword', ARRAY['no','nahi','not','nhi','n','already done'], NULL, 'disqualify');

  INSERT INTO public.sales_engine_steps(engine_id, step_key, step_order, title, message_text, capture_field)
  VALUES (v_ins_id, 'ask_vehicle', 2, 'Vehicle Number', 'Kindly share apna vehicle number (e.g. PB10AB1234) — hum instant quote nikaal denge', 'vehicle_number')
  RETURNING id INTO v_step;
  INSERT INTO public.sales_engine_branches(step_id, branch_order, match_type, next_step_key, action) VALUES
    (v_step, 1, 'any', 'ask_expiry', 'continue');

  INSERT INTO public.sales_engine_steps(engine_id, step_key, step_order, title, message_text, capture_field, is_terminal)
  VALUES (v_ins_id, 'ask_expiry', 3, 'Policy Expiry', 'Aapki current policy kab expire ho rahi hai? (e.g. Dec 2025)', 'policy_expiry', true)
  RETURNING id INTO v_step;
  INSERT INTO public.sales_engine_branches(step_id, branch_order, match_type, action, action_note) VALUES
    (v_step, 1, 'any', 'qualify', 'Insurance lead qualified — quote will be shared in 15 mins');

  -- SALES ENGINE (new car)
  INSERT INTO public.sales_engines(name, description, vertical, language, qualify_action)
  VALUES ('New Car Sales Qualifier', 'Qualifies recipients for new car purchase', 'sales', 'hinglish', 'create_lead')
  RETURNING id INTO v_sales_id;

  INSERT INTO public.sales_engine_steps(engine_id, step_key, step_order, title, message_text, is_initial)
  VALUES (v_sales_id, 'ask_intent', 1, 'Initial Interest', 'Namaste 🙏 Kya aap nayi car lene ka soch rahe hain? Hum best on-road price aur exchange offer dete hain. Reply YES ya NO 👇', true)
  RETURNING id INTO v_step;
  INSERT INTO public.sales_engine_branches(step_id, branch_order, match_type, match_keywords, next_step_key, action) VALUES
    (v_step, 1, 'keyword', ARRAY['yes','haan','chahiye','interested','y','han','ji','ok','sochra'], 'ask_model', 'continue'),
    (v_step, 2, 'keyword', ARRAY['no','nahi','not','nhi','n'], NULL, 'disqualify');

  INSERT INTO public.sales_engine_steps(engine_id, step_key, step_order, title, message_text, capture_field)
  VALUES (v_sales_id, 'ask_model', 2, 'Preferred Model', 'Kaunsi car pasand hai? (e.g. Swift, Creta, Nexon)', 'preferred_model')
  RETURNING id INTO v_step;
  INSERT INTO public.sales_engine_branches(step_id, branch_order, match_type, next_step_key, action) VALUES
    (v_step, 1, 'any', 'ask_budget', 'continue');

  INSERT INTO public.sales_engine_steps(engine_id, step_key, step_order, title, message_text, capture_field)
  VALUES (v_sales_id, 'ask_budget', 3, 'Budget', 'Aapka budget kya hai? (e.g. 8-10 lakh)', 'budget')
  RETURNING id INTO v_step;
  INSERT INTO public.sales_engine_branches(step_id, branch_order, match_type, next_step_key, action) VALUES
    (v_step, 1, 'any', 'ask_timeline', 'continue');

  INSERT INTO public.sales_engine_steps(engine_id, step_key, step_order, title, message_text, capture_field, is_terminal)
  VALUES (v_sales_id, 'ask_timeline', 4, 'Timeline', 'Kab tak chahiye? (this month / 1-3 months / just exploring)', 'purchase_timeline', true)
  RETURNING id INTO v_step;
  INSERT INTO public.sales_engine_branches(step_id, branch_order, match_type, action, action_note) VALUES
    (v_step, 1, 'any', 'qualify', 'Car sales lead qualified — sales executive will share quote');

  -- HSRP ENGINE
  INSERT INTO public.sales_engines(name, description, vertical, language, qualify_action)
  VALUES ('HSRP Booking Qualifier', 'Qualifies recipients for HSRP number plate booking', 'hsrp', 'hinglish', 'create_lead')
  RETURNING id INTO v_hsrp_id;

  INSERT INTO public.sales_engine_steps(engine_id, step_key, step_order, title, message_text, is_initial)
  VALUES (v_hsrp_id, 'ask_intent', 1, 'Initial Interest', 'Namaste 🙏 Kya aapko HSRP number plate chahiye? Government-approved, doorstep delivery. Reply YES ya NO 👇', true)
  RETURNING id INTO v_step;
  INSERT INTO public.sales_engine_branches(step_id, branch_order, match_type, match_keywords, next_step_key, action) VALUES
    (v_step, 1, 'keyword', ARRAY['yes','haan','chahiye','interested','y','han','ji','ok'], 'ask_vehicle_no', 'continue'),
    (v_step, 2, 'keyword', ARRAY['no','nahi','not','nhi','n'], NULL, 'disqualify');

  INSERT INTO public.sales_engine_steps(engine_id, step_key, step_order, title, message_text, capture_field)
  VALUES (v_hsrp_id, 'ask_vehicle_no', 2, 'Vehicle Number', 'Vehicle number share karein (e.g. PB10AB1234)', 'vehicle_number')
  RETURNING id INTO v_step;
  INSERT INTO public.sales_engine_branches(step_id, branch_order, match_type, next_step_key, action) VALUES
    (v_step, 1, 'any', 'ask_city', 'continue');

  INSERT INTO public.sales_engine_steps(engine_id, step_key, step_order, title, message_text, capture_field, is_terminal)
  VALUES (v_hsrp_id, 'ask_city', 3, 'City', 'Aap kis city me hain? (delivery scheduling ke liye)', 'city', true)
  RETURNING id INTO v_step;
  INSERT INTO public.sales_engine_branches(step_id, branch_order, match_type, action, action_note) VALUES
    (v_step, 1, 'any', 'qualify', 'HSRP lead qualified — booking link will be sent');
END $$;
