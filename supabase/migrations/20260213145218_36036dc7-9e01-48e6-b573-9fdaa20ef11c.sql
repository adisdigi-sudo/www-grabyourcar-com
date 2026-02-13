
-- Create delivery_stories table
CREATE TABLE public.delivery_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  location TEXT NOT NULL,
  car_brand TEXT NOT NULL,
  car_model TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  testimonial TEXT,
  delivery_date DATE,
  savings TEXT,
  highlight TEXT,
  buyer_type TEXT,
  wait_time TEXT,
  rating INTEGER DEFAULT 5,
  journey_steps TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_stories ENABLE ROW LEVEL SECURITY;

-- Public read for visible stories
CREATE POLICY "Anyone can view visible delivery stories"
  ON public.delivery_stories FOR SELECT
  USING (is_visible = true);

-- Admin full access
CREATE POLICY "Admins can manage delivery stories"
  ON public.delivery_stories FOR ALL
  USING (public.is_admin(auth.uid()));

-- Timestamp trigger
CREATE TRIGGER update_delivery_stories_updated_at
  BEFORE UPDATE ON public.delivery_stories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_stories;
