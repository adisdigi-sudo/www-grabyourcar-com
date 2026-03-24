
-- Discount change history table
CREATE TABLE IF NOT EXISTS public.dealer_discount_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id uuid REFERENCES public.dealer_live_discounts(id) ON DELETE CASCADE,
  dealer_company_id uuid REFERENCES public.dealer_companies(id) ON DELETE SET NULL,
  brand text NOT NULL,
  model text NOT NULL,
  variant text,
  old_amount numeric DEFAULT 0,
  new_amount numeric DEFAULT 0,
  change_type text DEFAULT 'update',
  changed_by text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.dealer_discount_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access discount history" ON public.dealer_discount_history FOR ALL USING (true);

-- Daily automation schedule config
CREATE TABLE IF NOT EXISTS public.dealer_automation_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_name text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  template_key text,
  custom_message text,
  frequency text DEFAULT 'daily',
  schedule_time time DEFAULT '09:00',
  days_of_week int[] DEFAULT '{1,2,3,4,5}',
  target_filter jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.dealer_automation_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access schedules" ON public.dealer_automation_schedules FOR ALL USING (true);

-- Follow-up alerts table
CREATE TABLE IF NOT EXISTS public.dealer_follow_up_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_company_id uuid REFERENCES public.dealer_companies(id) ON DELETE CASCADE,
  dealer_rep_id uuid REFERENCES public.dealer_representatives(id) ON DELETE SET NULL,
  alert_type text DEFAULT 'follow_up',
  priority text DEFAULT 'medium',
  message text,
  due_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  completed_by text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.dealer_follow_up_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access follow up alerts" ON public.dealer_follow_up_alerts FOR ALL USING (true);

-- Add showroom metadata to dealer_companies
ALTER TABLE public.dealer_companies 
  ADD COLUMN IF NOT EXISTS showroom_count int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS gst_number text,
  ADD COLUMN IF NOT EXISTS established_year int,
  ADD COLUMN IF NOT EXISTS region text DEFAULT 'North';

-- Trigger to log discount changes
CREATE OR REPLACE FUNCTION public.log_discount_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.discount_amount IS DISTINCT FROM NEW.discount_amount THEN
    INSERT INTO public.dealer_discount_history (discount_id, dealer_company_id, brand, model, variant, old_amount, new_amount, change_type)
    VALUES (NEW.id, NEW.dealer_company_id, NEW.brand, NEW.model, COALESCE(NEW.variant,''), OLD.discount_amount, NEW.discount_amount, 'update');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_discount_change ON public.dealer_live_discounts;
CREATE TRIGGER trg_log_discount_change
  AFTER UPDATE ON public.dealer_live_discounts
  FOR EACH ROW EXECUTE FUNCTION public.log_discount_change();
