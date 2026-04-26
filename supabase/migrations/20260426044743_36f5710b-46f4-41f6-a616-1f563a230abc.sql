ALTER TABLE public.visitor_page_views ADD COLUMN IF NOT EXISTS client_id TEXT;
CREATE INDEX IF NOT EXISTS idx_page_views_client_id ON public.visitor_page_views(client_id);