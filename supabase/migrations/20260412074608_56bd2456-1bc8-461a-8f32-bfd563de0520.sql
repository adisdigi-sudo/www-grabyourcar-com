
CREATE TABLE public.partner_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name text NOT NULL,
  vertical text NOT NULL DEFAULT 'insurance',
  partner_url text NOT NULL,
  is_active boolean DEFAULT true,
  last_health_check timestamptz,
  health_status text DEFAULT 'unknown',
  expires_at timestamptz,
  notes text,
  updated_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(partner_name, vertical)
);

ALTER TABLE public.partner_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read partner links"
  ON public.partner_links FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage partner links"
  ON public.partner_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anonymous read for website usage
CREATE POLICY "Public can read active partner links"
  ON public.partner_links FOR SELECT TO anon USING (is_active = true);

-- Seed the current PolicyBazaar link
INSERT INTO public.partner_links (partner_name, vertical, partner_url, notes)
VALUES (
  'PolicyBazaar',
  'insurance',
  'https://pbpci.policybazaar.com/?token=o5aMAq6qZ1tLXTODNpDyVbk4MP6pWDnq6hhpN5u%2BmyJLH9wHcj81JpXwkmKwLPBcDQlOpmql%2FtQgJKjQaQBk%2F6h5%2Bh6wxuKCTAtXRNQ1WBN7m6J2EwinhUfoywZ8E%2B%2BJFZQlcTcGh6a4upMh26MliMAXl%2FqWXTt%2B579hIW3zzfAGZ7aSNJ3WTeVCdfy%2FjJGe%2BQa3M6xdyWiN9%2FuvLVHo9A%3D%3D',
  'PBPartner insurance quote link - update when token expires'
);
