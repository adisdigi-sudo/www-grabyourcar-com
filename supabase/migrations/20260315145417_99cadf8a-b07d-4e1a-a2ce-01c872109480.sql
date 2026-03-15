
CREATE TABLE public.hsrp_abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  phone text,
  owner_name text,
  email text,
  registration_number text,
  vehicle_category text,
  service_type text,
  state text,
  city text,
  pincode text,
  last_step integer NOT NULL DEFAULT 1,
  form_data jsonb DEFAULT '{}'::jsonb,
  estimated_total numeric DEFAULT 0,
  recovery_status text NOT NULL DEFAULT 'abandoned',
  recovery_attempts integer DEFAULT 0,
  last_recovery_at timestamptz,
  converted_booking_id uuid REFERENCES public.hsrp_bookings(id),
  converted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.hsrp_abandoned_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create abandoned cart" ON public.hsrp_abandoned_carts
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update own abandoned cart" ON public.hsrp_abandoned_carts
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read all abandoned carts" ON public.hsrp_abandoned_carts
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX idx_hsrp_abandoned_carts_status ON public.hsrp_abandoned_carts(recovery_status);
CREATE INDEX idx_hsrp_abandoned_carts_phone ON public.hsrp_abandoned_carts(phone);
CREATE INDEX idx_hsrp_abandoned_carts_created ON public.hsrp_abandoned_carts(created_at DESC);
