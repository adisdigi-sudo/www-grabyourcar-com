UPDATE public.whatsapp_flow_triggers
SET action_config = jsonb_set(
  action_config,
  '{fields_to_send}',
  '["name","brand","tagline","body_type","price_range","fuel_types","transmission_types","key_highlights"]'::jsonb
)
WHERE trigger_name = 'Car Details from Database';

UPDATE public.whatsapp_flow_triggers
SET action_config = jsonb_set(
  action_config,
  '{fields_to_send}',
  '["name","brand"]'::jsonb
)
WHERE trigger_name = 'Car Photo Request';

UPDATE public.whatsapp_flow_triggers
SET action_config = jsonb_set(
  action_config,
  '{fields_to_send}',
  '["name","brand","brochure_url"]'::jsonb
)
WHERE trigger_name = 'Car Brochure Request';