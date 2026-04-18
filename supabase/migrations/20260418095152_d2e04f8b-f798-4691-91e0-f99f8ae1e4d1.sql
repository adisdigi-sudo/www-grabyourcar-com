ALTER TABLE public.sales_pipeline
  ADD COLUMN IF NOT EXISTS assigned_executive text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS car_color text,
  ADD COLUMN IF NOT EXISTS ex_showroom_price numeric,
  ADD COLUMN IF NOT EXISTS on_road_price numeric;