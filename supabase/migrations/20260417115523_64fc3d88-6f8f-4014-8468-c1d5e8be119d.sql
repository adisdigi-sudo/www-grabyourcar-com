ALTER TABLE public.sales_pipeline
  ADD COLUMN IF NOT EXISTS status_outcome text,
  ADD COLUMN IF NOT EXISTS is_hot boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_abandoned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS website_journey jsonb,
  ADD COLUMN IF NOT EXISTS budget text,
  ADD COLUMN IF NOT EXISTS car_year text,
  ADD COLUMN IF NOT EXISTS vehicle_type text,
  ADD COLUMN IF NOT EXISTS timeline text;

CREATE INDEX IF NOT EXISTS idx_sales_pipeline_status_outcome ON public.sales_pipeline(status_outcome);
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_is_hot ON public.sales_pipeline(is_hot) WHERE is_hot = true;
CREATE INDEX IF NOT EXISTS idx_sales_pipeline_is_abandoned ON public.sales_pipeline(is_abandoned) WHERE is_abandoned = true;