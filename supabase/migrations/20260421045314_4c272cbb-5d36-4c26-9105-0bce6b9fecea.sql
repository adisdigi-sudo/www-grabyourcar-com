
-- ─── 1. Meta account status cache ───
CREATE TABLE IF NOT EXISTS public.wa_meta_account_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id text,
  display_phone_number text,
  verified_name text,
  quality_rating text,
  messaging_limit_tier text,
  daily_conversation_limit integer,
  monthly_conversation_limit integer,
  business_initiated_24h integer DEFAULT 0,
  user_initiated_24h integer DEFAULT 0,
  throughput_tier text,
  account_review_status text,
  business_verification_status text,
  raw_payload jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_meta_status_fetched ON public.wa_meta_account_status(fetched_at DESC);

ALTER TABLE public.wa_meta_account_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read meta status" ON public.wa_meta_account_status;
CREATE POLICY "auth read meta status" ON public.wa_meta_account_status
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth manage meta status" ON public.wa_meta_account_status;
CREATE POLICY "auth manage meta status" ON public.wa_meta_account_status
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 2. Surveys ───
CREATE TABLE IF NOT EXISTS public.wa_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  mode text NOT NULL DEFAULT 'quick_reply' CHECK (mode IN ('quick_reply','flow')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected','active','paused')),
  meta_template_name text,
  meta_flow_id text,
  meta_flow_json jsonb,
  total_responses integer NOT NULL DEFAULT 0,
  total_sent integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_surveys_status ON public.wa_surveys(status);
CREATE INDEX IF NOT EXISTS idx_wa_surveys_active ON public.wa_surveys(is_active);

ALTER TABLE public.wa_surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth manage surveys" ON public.wa_surveys;
CREATE POLICY "auth manage surveys" ON public.wa_surveys
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 3. Survey questions ───
CREATE TABLE IF NOT EXISTS public.wa_survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.wa_surveys(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('multiple_choice','rating','yes_no','open_text','nps')),
  options jsonb,
  required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_survey_questions_survey ON public.wa_survey_questions(survey_id, position);

ALTER TABLE public.wa_survey_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth manage survey questions" ON public.wa_survey_questions;
CREATE POLICY "auth manage survey questions" ON public.wa_survey_questions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 4. Survey responses ───
CREATE TABLE IF NOT EXISTS public.wa_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.wa_surveys(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.wa_survey_questions(id) ON DELETE CASCADE,
  respondent_phone text NOT NULL,
  respondent_name text,
  answer_text text,
  answer_value jsonb,
  campaign_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_survey_responses_survey ON public.wa_survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_wa_survey_responses_phone ON public.wa_survey_responses(respondent_phone);

ALTER TABLE public.wa_survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth manage survey responses" ON public.wa_survey_responses;
CREATE POLICY "auth manage survey responses" ON public.wa_survey_responses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 5. Updated-at trigger for surveys ───
DROP TRIGGER IF EXISTS trg_wa_surveys_updated ON public.wa_surveys;
CREATE TRIGGER trg_wa_surveys_updated
  BEFORE UPDATE ON public.wa_surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
