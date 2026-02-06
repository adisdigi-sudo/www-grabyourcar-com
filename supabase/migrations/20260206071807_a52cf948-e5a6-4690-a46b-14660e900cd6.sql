-- Add discount columns to hsrp_bookings
ALTER TABLE public.hsrp_bookings 
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_reason text,
ADD COLUMN IF NOT EXISTS discount_applied_by uuid;

-- Add discount columns to rental_bookings
ALTER TABLE public.rental_bookings 
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_reason text,
ADD COLUMN IF NOT EXISTS discount_applied_by uuid;

-- Add discount columns to accessory_orders
ALTER TABLE public.accessory_orders 
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_reason text,
ADD COLUMN IF NOT EXISTS discount_applied_by uuid;

-- Create discount presets table for quick application
CREATE TABLE IF NOT EXISTS public.discount_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  discount_type text NOT NULL DEFAULT 'fixed', -- 'fixed' or 'percentage'
  discount_value numeric NOT NULL,
  applicable_to text[] DEFAULT ARRAY['hsrp', 'rental', 'accessories'],
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discount_presets ENABLE ROW LEVEL SECURITY;

-- RLS policies for discount_presets (admin only)
CREATE POLICY "Admins can manage discount presets"
ON public.discount_presets
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Insert some default presets
INSERT INTO public.discount_presets (name, discount_type, discount_value, applicable_to) VALUES
('Festival Offer - ₹100 Off', 'fixed', 100, ARRAY['hsrp', 'rental', 'accessories']),
('New Customer - 5% Off', 'percentage', 5, ARRAY['hsrp', 'rental', 'accessories']),
('Bulk Order - ₹500 Off', 'fixed', 500, ARRAY['accessories']),
('Weekend Special - 10% Off', 'percentage', 10, ARRAY['rental'])
ON CONFLICT DO NOTHING;