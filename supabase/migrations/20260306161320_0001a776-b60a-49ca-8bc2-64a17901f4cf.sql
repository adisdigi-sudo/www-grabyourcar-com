
-- Sales Pipeline table for car sales vertical
CREATE TABLE public.sales_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  city text,
  car_brand text,
  car_model text,
  car_variant text,
  source text DEFAULT 'manual',
  inquiry_remarks text,
  pipeline_stage text NOT NULL DEFAULT 'new_lead',
  call_status text,
  call_remarks text,
  call_attempts integer DEFAULT 0,
  buying_intent text,
  quote_history jsonb DEFAULT '[]'::jsonb,
  follow_up_date date,
  follow_up_time text,
  lost_reason text,
  lost_remarks text,
  booking_status text,
  booking_remarks text,
  loan_status text,
  delivery_date date,
  delivery_images text[] DEFAULT '{}',
  delivery_documents text[] DEFAULT '{}',
  feedback_rating integer,
  feedback_text text,
  feedback_images text[] DEFAULT '{}',
  feedback_videos text[] DEFAULT '{}',
  incentive_eligible boolean DEFAULT false,
  assigned_to text,
  client_id text,
  remarks_history jsonb DEFAULT '[]'::jsonb,
  last_activity_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.sales_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sales pipeline" ON public.sales_pipeline
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sales pipeline" ON public.sales_pipeline
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales pipeline" ON public.sales_pipeline
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sales pipeline" ON public.sales_pipeline
  FOR DELETE TO authenticated USING (true);

-- Sales activity log for chat/remarks history
CREATE TABLE public.sales_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES public.sales_pipeline(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  remarks text,
  metadata jsonb,
  performed_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sales_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage sales activity" ON public.sales_activity_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_sales_pipeline_stage ON public.sales_pipeline(pipeline_stage);
CREATE INDEX idx_sales_pipeline_phone ON public.sales_pipeline(phone);
CREATE INDEX idx_sales_activity_pipeline ON public.sales_activity_log(pipeline_id);
