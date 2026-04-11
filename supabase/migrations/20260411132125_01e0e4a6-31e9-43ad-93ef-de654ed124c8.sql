
-- Add Meta sync columns to wa_templates
ALTER TABLE public.wa_templates 
  ADD COLUMN IF NOT EXISTS meta_rejection_reason text,
  ADD COLUMN IF NOT EXISTS meta_quality_score text;

-- Create wa_broadcasts table
CREATE TABLE IF NOT EXISTS public.wa_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_id uuid REFERENCES public.wa_templates(id),
  template_name text,
  status text DEFAULT 'draft',
  total_recipients int DEFAULT 0,
  sent_count int DEFAULT 0,
  delivered_count int DEFAULT 0,
  read_count int DEFAULT 0,
  failed_count int DEFAULT 0,
  segment_filter jsonb,
  variables jsonb,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.wa_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage broadcasts"
  ON public.wa_broadcasts FOR ALL TO authenticated USING (true) WITH CHECK (true);
