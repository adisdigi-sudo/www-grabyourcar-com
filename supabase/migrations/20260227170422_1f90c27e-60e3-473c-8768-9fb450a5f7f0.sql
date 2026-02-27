
-- Add state and city columns to dealer_representatives for direct filtering
ALTER TABLE public.dealer_representatives ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.dealer_representatives ADD COLUMN IF NOT EXISTS city TEXT;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_dealer_rep_state ON public.dealer_representatives(state);
CREATE INDEX IF NOT EXISTS idx_dealer_rep_city ON public.dealer_representatives(city);

-- RLS policies for dealer_representatives (INSERT, UPDATE, DELETE for authenticated)
CREATE POLICY "Authenticated users can insert dealer_representatives"
ON public.dealer_representatives FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update dealer_representatives"
ON public.dealer_representatives FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete dealer_representatives"
ON public.dealer_representatives FOR DELETE TO authenticated
USING (true);
