DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ecommerce_orders_order_number_key'
  ) THEN
    ALTER TABLE public.ecommerce_orders ADD CONSTRAINT ecommerce_orders_order_number_key UNIQUE (order_number);
  END IF;
END $$;