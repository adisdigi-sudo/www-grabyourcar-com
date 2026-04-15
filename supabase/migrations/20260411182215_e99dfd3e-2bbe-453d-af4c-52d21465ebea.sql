
-- Add performance stats columns to wa_templates
ALTER TABLE public.wa_templates 
  ADD COLUMN IF NOT EXISTS sent_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivered_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS read_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replied_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ab_variant_of uuid REFERENCES public.wa_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ab_variant_label text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS conversion_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz DEFAULT NULL;

-- Index for A/B variant lookup
CREATE INDEX IF NOT EXISTS idx_wa_templates_ab_variant ON public.wa_templates(ab_variant_of) WHERE ab_variant_of IS NOT NULL;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_templates;
