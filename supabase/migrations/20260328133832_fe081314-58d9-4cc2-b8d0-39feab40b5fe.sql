-- Fix quote PDF uploads for upsert-based saves and allow insurance team history writes

-- Storage: allow authenticated users to update quote PDFs when client upload uses upsert=true
CREATE POLICY "Auth users can update quote PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'quote-pdfs')
WITH CHECK (bucket_id = 'quote-pdfs');

-- Quote history: allow insurance team and admins to create quote history rows
CREATE POLICY "Insurance members can insert quote share history"
ON public.quote_share_history
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_vertical_access uva
    JOIN public.business_verticals bv ON bv.id = uva.vertical_id
    WHERE uva.user_id = auth.uid()
      AND bv.slug = 'insurance'
  )
);

-- Quote history: allow insurance team and admins to view quote history rows
CREATE POLICY "Insurance members can view quote share history"
ON public.quote_share_history
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_vertical_access uva
    JOIN public.business_verticals bv ON bv.id = uva.vertical_id
    WHERE uva.user_id = auth.uid()
      AND bv.slug = 'insurance'
  )
);

-- Quote history: allow insurance team and admins to update quote history rows if needed
CREATE POLICY "Insurance members can update quote share history"
ON public.quote_share_history
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_vertical_access uva
    JOIN public.business_verticals bv ON bv.id = uva.vertical_id
    WHERE uva.user_id = auth.uid()
      AND bv.slug = 'insurance'
  )
)
WITH CHECK (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_vertical_access uva
    JOIN public.business_verticals bv ON bv.id = uva.vertical_id
    WHERE uva.user_id = auth.uid()
      AND bv.slug = 'insurance'
  )
);