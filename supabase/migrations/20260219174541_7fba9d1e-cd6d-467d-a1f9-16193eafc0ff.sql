INSERT INTO public.business_verticals (slug, name, icon, color, is_active, sort_order, description)
VALUES ('car-database', 'Car Database', '🚗', '#3B82F6', true, 8, 'Centralized car inventory management - brands, models, variants, specs, pricing')
ON CONFLICT (slug) DO NOTHING;