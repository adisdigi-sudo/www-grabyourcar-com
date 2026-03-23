
ALTER TABLE public.accessory_orders
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS courier_tracking_url text,
  ADD COLUMN IF NOT EXISTS estimated_delivery date,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_updates jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.order_tracking_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.accessory_orders(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL,
  message text,
  location text,
  updated_by text DEFAULT 'system',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.order_tracking_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tracking history"
  ON public.order_tracking_history FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tracking history"
  ON public.order_tracking_history FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.auto_track_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.order_status IS DISTINCT FROM NEW.order_status THEN
    INSERT INTO public.order_tracking_history (order_id, status, message, updated_by)
    VALUES (
      NEW.id,
      NEW.order_status,
      CASE NEW.order_status
        WHEN 'confirmed' THEN 'Your order has been confirmed'
        WHEN 'processing' THEN 'Your order is being prepared'
        WHEN 'shipped' THEN 'Your order has been shipped' || COALESCE(' via ' || NEW.courier_name, '')
        WHEN 'out_for_delivery' THEN 'Your order is out for delivery'
        WHEN 'delivered' THEN 'Your order has been delivered'
        WHEN 'cancelled' THEN 'Your order has been cancelled'
        ELSE 'Order status updated to ' || NEW.order_status
      END,
      'system'
    );
    IF NEW.order_status = 'shipped' AND NEW.shipped_at IS NULL THEN
      NEW.shipped_at := now();
    END IF;
    IF NEW.order_status = 'delivered' AND NEW.delivered_at IS NULL THEN
      NEW.delivered_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_track_order_status
  BEFORE UPDATE ON public.accessory_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_track_order_status();

CREATE OR REPLACE FUNCTION public.auto_track_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.order_tracking_history (order_id, status, message, updated_by)
  VALUES (NEW.id, 'placed', 'Your order has been placed successfully', 'system');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_track_new_order
  AFTER INSERT ON public.accessory_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_track_new_order();
