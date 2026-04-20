
-- 1) Website / CRM branding (admin_settings.branding_settings)
UPDATE public.admin_settings
SET setting_value = setting_value
    || jsonb_build_object(
      'logo_url',          'https://ynoiwioypxpurwdbjvyt.supabase.co/storage/v1/object/public/branding-assets/grabyourcar-logo-light.png',
      'logo_dark_url',     'https://ynoiwioypxpurwdbjvyt.supabase.co/storage/v1/object/public/branding-assets/grabyourcar-logo-dark.png',
      'animated_logo_url', '',
      'use_animated_logo', false,
      'brand_name',        'Grabyourcar'
    ),
    updated_at = now()
WHERE setting_key = 'branding_settings';

-- 2) PDF backend branding (pdf_global_branding) — only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='pdf_global_branding') THEN
    EXECUTE $sql$
      UPDATE public.pdf_global_branding
      SET logo_url      = 'https://ynoiwioypxpurwdbjvyt.supabase.co/storage/v1/object/public/pdf-branding-assets/grabyourcar-logo.png',
          watermark_url = 'https://ynoiwioypxpurwdbjvyt.supabase.co/storage/v1/object/public/pdf-branding-assets/grabyourcar-logo.png',
          updated_at    = now()
    $sql$;
  END IF;
END $$;

-- 3) Insurance PDF branding cache (admin_settings.insurance_pdf_branding) — if exists
UPDATE public.admin_settings
SET setting_value = setting_value
    || jsonb_build_object(
      'grabyourcarLogoUrl',
      'https://ynoiwioypxpurwdbjvyt.supabase.co/storage/v1/object/public/pdf-branding-assets/grabyourcar-logo.png'
    ),
    updated_at = now()
WHERE setting_key = 'insurance_pdf_branding';
