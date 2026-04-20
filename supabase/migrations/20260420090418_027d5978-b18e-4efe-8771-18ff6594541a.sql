
UPDATE public.admin_settings
SET setting_value = setting_value
    || jsonb_build_object(
      'logo_url',           'https://ynoiwioypxpurwdbjvyt.supabase.co/storage/v1/object/public/branding-assets/grabyourcar-logo-light.png?v=2',
      'logo_dark_url',      'https://ynoiwioypxpurwdbjvyt.supabase.co/storage/v1/object/public/branding-assets/grabyourcar-logo-dark.png?v=2',
      'logo_height_header', 96,
      'logo_height_footer', 80,
      'logo_height_mobile', 56,
      'logo_width_header',  null,
      'logo_width_footer',  null,
      'logo_width_mobile',  null,
      'animated_logo_url',  '',
      'use_animated_logo',  false
    ),
    updated_at = now()
WHERE setting_key = 'branding_settings';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='pdf_global_branding') THEN
    EXECUTE $sql$
      UPDATE public.pdf_global_branding
      SET logo_url      = 'https://ynoiwioypxpurwdbjvyt.supabase.co/storage/v1/object/public/pdf-branding-assets/grabyourcar-logo.png?v=2',
          watermark_url = 'https://ynoiwioypxpurwdbjvyt.supabase.co/storage/v1/object/public/pdf-branding-assets/grabyourcar-logo.png?v=2',
          updated_at    = now()
    $sql$;
  END IF;
END $$;
