INSERT INTO public.business_verticals (name, slug, description, icon, color, is_active, sort_order, has_vertical_password, vertical_password)
VALUES (
  'Founder Cockpit',
  'founder-cockpit',
  'Targets, approvals, briefings & live deal attribution — founder-only workspace.',
  'Crown',
  '#FFD700',
  true,
  0,
  true,
  'GycFounderCockpit@2026'
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    has_vertical_password = EXCLUDED.has_vertical_password,
    vertical_password = EXCLUDED.vertical_password,
    updated_at = now();