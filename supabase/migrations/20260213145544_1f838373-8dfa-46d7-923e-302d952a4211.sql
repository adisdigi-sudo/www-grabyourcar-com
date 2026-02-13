
-- Create google_reviews table
CREATE TABLE public.google_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_name TEXT NOT NULL,
  author_photo TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  relative_time TEXT,
  car_purchased TEXT,
  is_local_guide BOOLEAN DEFAULT false,
  has_response BOOLEAN DEFAULT false,
  response_text TEXT,
  is_visible BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  review_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_reviews ENABLE ROW LEVEL SECURITY;

-- Public read for visible reviews
CREATE POLICY "Anyone can view visible reviews"
  ON public.google_reviews FOR SELECT
  USING (is_visible = true);

-- Admin full access
CREATE POLICY "Admins can manage reviews"
  ON public.google_reviews FOR ALL
  USING (public.is_admin(auth.uid()));

-- Timestamp trigger
CREATE TRIGGER update_google_reviews_updated_at
  BEFORE UPDATE ON public.google_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.google_reviews;
