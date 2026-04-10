UPDATE public.channel_providers
SET provider_name = 'wabb',
    is_active = true,
    updated_at = now()
WHERE channel = 'whatsapp';