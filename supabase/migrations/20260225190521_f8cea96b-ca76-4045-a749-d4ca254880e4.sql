
-- 1) Vertical pipeline stages definition
CREATE TABLE public.vertical_pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vertical_name TEXT NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL DEFAULT 0,
  is_final_stage BOOLEAN NOT NULL DEFAULT false,
  is_lost_stage BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(vertical_name, stage_name)
);
ALTER TABLE public.vertical_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read vertical_pipelines" ON public.vertical_pipelines FOR SELECT TO authenticated USING (true);

-- 2) Customer's current stage per vertical
CREATE TABLE public.customer_vertical_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.master_customers(id) ON DELETE CASCADE,
  vertical_name TEXT NOT NULL,
  current_stage TEXT NOT NULL DEFAULT 'New',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, vertical_name)
);
ALTER TABLE public.customer_vertical_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read customer_vertical_status" ON public.customer_vertical_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert customer_vertical_status" ON public.customer_vertical_status FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update customer_vertical_status" ON public.customer_vertical_status FOR UPDATE TO authenticated USING (true);

-- 3) Vertical pipeline history
CREATE TABLE public.vertical_pipeline_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.master_customers(id) ON DELETE CASCADE,
  vertical_name TEXT NOT NULL,
  previous_stage TEXT,
  new_stage TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vertical_pipeline_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read vertical_pipeline_history" ON public.vertical_pipeline_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert vertical_pipeline_history" ON public.vertical_pipeline_history FOR INSERT TO authenticated WITH CHECK (true);

-- 4) Trigger: on customer_vertical_status update, log history + activity
CREATE OR REPLACE FUNCTION public.track_vertical_pipeline_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    INSERT INTO public.vertical_pipeline_history (customer_id, vertical_name, previous_stage, new_stage, changed_by)
    VALUES (NEW.customer_id, NEW.vertical_name, OLD.current_stage, NEW.current_stage, auth.uid());

    INSERT INTO public.customer_activity_logs (customer_id, activity_type, notes, performed_by)
    VALUES (NEW.customer_id, 'vertical_stage_change',
      NEW.vertical_name || ': ' || OLD.current_stage || ' → ' || NEW.current_stage,
      auth.uid());

    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vertical_pipeline_change
  BEFORE UPDATE ON public.customer_vertical_status
  FOR EACH ROW EXECUTE FUNCTION public.track_vertical_pipeline_change();

-- 5) Seed default pipeline stages
INSERT INTO public.vertical_pipelines (vertical_name, stage_name, stage_order, is_final_stage, is_lost_stage) VALUES
  ('car_sales','New',1,false,false),('car_sales','Contacted',2,false,false),('car_sales','Test Drive',3,false,false),('car_sales','Quoted',4,false,false),('car_sales','Booked',5,false,false),('car_sales','Delivered',6,true,false),('car_sales','Lost',7,false,true),
  ('insurance','New',1,false,false),('insurance','Contacted',2,false,false),('insurance','Quote Sent',3,false,false),('insurance','Policy Issued',4,true,false),('insurance','Lost',5,false,true),
  ('loan','New',1,false,false),('loan','Documents Collected',2,false,false),('loan','Submitted to Bank',3,false,false),('loan','Approved',4,false,false),('loan','Disbursed',5,true,false),('loan','Rejected',6,false,true),
  ('corporate','New',1,false,false),('corporate','Proposal Sent',2,false,false),('corporate','Negotiation',3,false,false),('corporate','Closed Won',4,true,false),('corporate','Closed Lost',5,false,true),
  ('accessories','New',1,false,false),('accessories','Quoted',2,false,false),('accessories','Order Placed',3,false,false),('accessories','Delivered',4,true,false),('accessories','Cancelled',5,false,true),
  ('rental','New',1,false,false),('rental','Contacted',2,false,false),('rental','Booking Confirmed',3,false,false),('rental','Active',4,false,false),('rental','Completed',5,true,false),('rental','Cancelled',6,false,true);
