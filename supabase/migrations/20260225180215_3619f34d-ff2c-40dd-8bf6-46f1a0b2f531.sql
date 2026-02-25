
-- Pipeline history table
CREATE TABLE public.pipeline_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.master_customers(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipeline_history_customer_id ON public.pipeline_history(customer_id);
CREATE INDEX idx_pipeline_history_new_status ON public.pipeline_history(new_status);
CREATE INDEX idx_pipeline_history_changed_at ON public.pipeline_history(changed_at);

ALTER TABLE public.pipeline_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pipeline history"
  ON public.pipeline_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert pipeline history"
  ON public.pipeline_history FOR INSERT TO authenticated WITH CHECK (true);

-- Auto-track pipeline changes and update lifecycle_stage
CREATE OR REPLACE FUNCTION public.track_pipeline_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Insert pipeline history
    INSERT INTO public.pipeline_history (customer_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());

    -- Auto-update lifecycle_stage based on status
    NEW.lifecycle_stage := CASE NEW.status
      WHEN 'New' THEN 'lead'
      WHEN 'Contacted' THEN 'lead'
      WHEN 'Interested' THEN 'prospect'
      WHEN 'Quoted' THEN 'prospect'
      WHEN 'Booked' THEN 'customer'
      WHEN 'Delivered' THEN 'customer'
      WHEN 'Policy Done' THEN 'customer'
      WHEN 'Lost' THEN 'lost'
      ELSE NEW.lifecycle_stage
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_pipeline_change
  BEFORE UPDATE ON public.master_customers
  FOR EACH ROW EXECUTE FUNCTION public.track_pipeline_change();
