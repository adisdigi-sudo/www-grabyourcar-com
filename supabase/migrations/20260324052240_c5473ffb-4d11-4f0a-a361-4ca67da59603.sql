
-- Function to auto-create invoice when payment_status changes to paid in any vertical
CREATE OR REPLACE FUNCTION public.auto_generate_invoice_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice_number TEXT;
  v_client_name TEXT;
  v_client_phone TEXT;
  v_client_email TEXT;
  v_total NUMERIC;
  v_vertical TEXT;
  v_items JSONB;
  v_description TEXT;
  v_invoice_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'deals' THEN
    IF NEW.payment_status IS DISTINCT FROM 'received' THEN RETURN NEW; END IF;
    IF OLD IS NOT NULL AND OLD.payment_status = 'received' THEN RETURN NEW; END IF;
  ELSE
    IF NEW.payment_status IS DISTINCT FROM 'paid' THEN RETURN NEW; END IF;
    IF OLD IS NOT NULL AND OLD.payment_status = 'paid' THEN RETURN NEW; END IF;
  END IF;

  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || substring(gen_random_uuid()::text, 1, 6);

  IF TG_TABLE_NAME = 'accessory_orders' THEN
    v_client_name := NEW.shipping_name;
    v_client_phone := NEW.shipping_phone;
    v_client_email := NEW.shipping_email;
    v_total := NEW.total_amount;
    v_vertical := 'Accessories';
    v_items := NEW.items::jsonb;
    v_description := 'Accessory Order #' || COALESCE(NEW.order_id, NEW.id::text);

  ELSIF TG_TABLE_NAME = 'hsrp_bookings' THEN
    v_client_name := NEW.owner_name;
    v_client_phone := NEW.mobile;
    v_client_email := NEW.email;
    v_total := COALESCE(NEW.payment_amount, NEW.service_price);
    v_vertical := 'HSRP';
    v_items := jsonb_build_array(jsonb_build_object('description', 'HSRP - ' || COALESCE(NEW.service_type, 'Standard') || ' (' || COALESCE(NEW.registration_number, '') || ')', 'quantity', 1, 'rate', COALESCE(NEW.payment_amount, NEW.service_price), 'amount', COALESCE(NEW.payment_amount, NEW.service_price)));
    v_description := 'HSRP for ' || COALESCE(NEW.registration_number, '');

  ELSIF TG_TABLE_NAME = 'rental_bookings' THEN
    v_client_name := NEW.customer_name;
    v_client_phone := NEW.phone;
    v_client_email := NEW.email;
    v_total := NEW.total_amount;
    v_vertical := 'Self Drive';
    v_items := jsonb_build_array(jsonb_build_object('description', 'Self-Drive Rental', 'quantity', 1, 'rate', NEW.total_amount, 'amount', NEW.total_amount));
    v_description := 'Self-Drive Rental';

  ELSIF TG_TABLE_NAME = 'deals' THEN
    v_client_name := COALESCE((SELECT name FROM public.customers WHERE id = NEW.customer_id LIMIT 1), 'Customer');
    v_client_phone := COALESCE((SELECT phone FROM public.customers WHERE id = NEW.customer_id LIMIT 1), '');
    v_client_email := COALESCE((SELECT email FROM public.customers WHERE id = NEW.customer_id LIMIT 1), '');
    v_total := COALESCE(NEW.payment_received_amount, NEW.deal_value);
    v_vertical := COALESCE(NEW.vertical_name, 'Car Sales');
    v_items := jsonb_build_array(jsonb_build_object('description', 'Deal #' || COALESCE(NEW.deal_number, '') || ' - ' || COALESCE(NEW.vertical_name, 'Service'), 'quantity', 1, 'rate', v_total, 'amount', v_total));
    v_description := 'Deal #' || COALESCE(NEW.deal_number, '');

  ELSE
    RETURN NEW;
  END IF;

  IF v_total IS NULL OR v_total <= 0 THEN RETURN NEW; END IF;

  INSERT INTO public.invoices (
    invoice_number, invoice_date, client_name, client_phone, client_email,
    items, subtotal, tax_amount, discount_amount, total_amount, amount_paid, balance_due,
    status, vertical_name, notes, invoice_type, paid_at
  ) VALUES (
    v_invoice_number, CURRENT_DATE, v_client_name, v_client_phone, v_client_email,
    v_items, v_total, 0, 0, v_total, v_total, 0,
    'paid', v_vertical, v_description, 'auto', now()
  ) RETURNING id INTO v_invoice_id;

  RETURN NEW;
END;
$$;

-- Triggers on each vertical
CREATE TRIGGER trg_auto_invoice_accessory_orders
  AFTER INSERT OR UPDATE OF payment_status ON public.accessory_orders
  FOR EACH ROW WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION public.auto_generate_invoice_on_payment();

CREATE TRIGGER trg_auto_invoice_hsrp_bookings
  AFTER INSERT OR UPDATE OF payment_status ON public.hsrp_bookings
  FOR EACH ROW WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION public.auto_generate_invoice_on_payment();

CREATE TRIGGER trg_auto_invoice_rental_bookings
  AFTER INSERT OR UPDATE OF payment_status ON public.rental_bookings
  FOR EACH ROW WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION public.auto_generate_invoice_on_payment();

CREATE TRIGGER trg_auto_invoice_deals
  AFTER INSERT OR UPDATE OF payment_status ON public.deals
  FOR EACH ROW WHEN (NEW.payment_status = 'received')
  EXECUTE FUNCTION public.auto_generate_invoice_on_payment();
