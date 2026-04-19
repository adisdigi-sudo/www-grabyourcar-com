
-- 1) Permanent upload history
CREATE TABLE IF NOT EXISTS public.auto_dialer_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.auto_dialer_campaigns(id) ON DELETE CASCADE,
  vertical_slug text NOT NULL,
  filename text NOT NULL,
  file_size_bytes bigint,
  storage_path text,
  storage_url text,
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  invalid_rows integer NOT NULL DEFAULT 0,
  converted_leads integer NOT NULL DEFAULT 0,
  uploaded_by uuid,
  uploaded_by_email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_dialer_uploads_vertical ON public.auto_dialer_uploads(vertical_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auto_dialer_uploads_campaign ON public.auto_dialer_uploads(campaign_id);

ALTER TABLE public.auto_dialer_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth users manage uploads" ON public.auto_dialer_uploads;
CREATE POLICY "Auth users manage uploads"
  ON public.auto_dialer_uploads
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_auto_dialer_uploads_updated_at
  BEFORE UPDATE ON public.auto_dialer_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Disposition audit log (immutable)
CREATE TABLE IF NOT EXISTS public.auto_dialer_dispositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.auto_dialer_contacts(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.auto_dialer_campaigns(id) ON DELETE CASCADE,
  vertical_slug text NOT NULL,
  phone text NOT NULL,
  customer_name text,
  disposition text NOT NULL,
  remarks text,
  follow_up_at timestamptz,
  attempt_number integer NOT NULL DEFAULT 1,
  call_duration_seconds integer,
  dialed_by uuid,
  dialed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispositions_contact ON public.auto_dialer_dispositions(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispositions_vertical ON public.auto_dialer_dispositions(vertical_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispositions_campaign ON public.auto_dialer_dispositions(campaign_id, disposition);

ALTER TABLE public.auto_dialer_dispositions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth users manage dispositions" ON public.auto_dialer_dispositions;
CREATE POLICY "Auth users manage dispositions"
  ON public.auto_dialer_dispositions
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 3) Contact upgrades
ALTER TABLE public.auto_dialer_contacts
  ADD COLUMN IF NOT EXISTS disposition_remarks text,
  ADD COLUMN IF NOT EXISTS upload_id uuid REFERENCES public.auto_dialer_uploads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_category text;

CREATE INDEX IF NOT EXISTS idx_dialer_contacts_status_category ON public.auto_dialer_contacts(campaign_id, status_category);
CREATE INDEX IF NOT EXISTS idx_dialer_contacts_upload ON public.auto_dialer_contacts(upload_id);

-- 4) Campaign aggregate column for hot leads
ALTER TABLE public.auto_dialer_campaigns
  ADD COLUMN IF NOT EXISTS hot_contacts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS callback_contacts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dnd_contacts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wrong_number_contacts integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS busy_contacts integer DEFAULT 0;

-- 5) Storage bucket for the original uploaded spreadsheets
INSERT INTO storage.buckets (id, name, public)
VALUES ('calling-uploads', 'calling-uploads', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Calling uploads — public read'
  ) THEN
    CREATE POLICY "Calling uploads — public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'calling-uploads');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Calling uploads — authenticated write'
  ) THEN
    CREATE POLICY "Calling uploads — authenticated write"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'calling-uploads');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Calling uploads — authenticated update'
  ) THEN
    CREATE POLICY "Calling uploads — authenticated update"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'calling-uploads');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Calling uploads — authenticated delete'
  ) THEN
    CREATE POLICY "Calling uploads — authenticated delete"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'calling-uploads');
  END IF;
END $$;
