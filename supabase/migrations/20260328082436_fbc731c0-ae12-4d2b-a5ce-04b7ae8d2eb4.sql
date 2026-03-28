
-- Function to auto-delete expired quotes and their PDFs
CREATE OR REPLACE FUNCTION public.cleanup_expired_quotes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, pdf_storage_path
    FROM public.quote_share_history
    WHERE expires_at < now()
  LOOP
    IF r.pdf_storage_path IS NOT NULL AND r.pdf_storage_path <> '' THEN
      DELETE FROM storage.objects
      WHERE bucket_id = 'quote-pdfs'
        AND name = r.pdf_storage_path;
    END IF;
    DELETE FROM public.quote_share_history WHERE id = r.id;
  END LOOP;
END;
$$;
