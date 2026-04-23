
-- Add intent tagging to wa_inbox_messages
ALTER TABLE public.wa_inbox_messages
  ADD COLUMN IF NOT EXISTS intent text,
  ADD COLUMN IF NOT EXISTS intent_meta jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS lead_id uuid,
  ADD COLUMN IF NOT EXISTS vertical text;

CREATE INDEX IF NOT EXISTS idx_wa_inbox_messages_intent ON public.wa_inbox_messages(intent);
CREATE INDEX IF NOT EXISTS idx_wa_inbox_messages_vertical ON public.wa_inbox_messages(vertical);
CREATE INDEX IF NOT EXISTS idx_wa_inbox_messages_created_at ON public.wa_inbox_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_inbox_messages_lead ON public.wa_inbox_messages(lead_id);

-- Backfill intent based on template_name patterns
UPDATE public.wa_inbox_messages
SET intent = CASE
  WHEN template_name ILIKE '%feedback%' THEN 'feedback'
  WHEN template_name ILIKE '%renewal%' OR template_name ILIKE '%expir%' THEN 'renewal_reminder'
  WHEN template_name ILIKE '%quote%' OR template_name ILIKE '%offer%' THEN 'quote_share'
  WHEN template_name ILIKE '%policy%' OR template_name ILIKE '%pdf%' OR template_name ILIKE '%document%' THEN 'policy_document'
  WHEN template_name ILIKE '%followup%' OR template_name ILIKE '%follow_up%' OR template_name ILIKE '%nurture%' THEN 'followup'
  WHEN template_name ILIKE '%welcome%' OR template_name ILIKE '%otp%' THEN 'transactional'
  WHEN template_name IS NOT NULL THEN 'template_other'
  WHEN direction = 'inbound' THEN 'customer_reply'
  ELSE 'manual_chat'
END
WHERE intent IS NULL;

-- Backfill vertical from conversation
UPDATE public.wa_inbox_messages m
SET vertical = c.assigned_vertical
FROM public.wa_conversations c
WHERE m.conversation_id = c.id AND m.vertical IS NULL AND c.assigned_vertical IS NOT NULL;

-- Backfill lead_id from conversation
UPDATE public.wa_inbox_messages m
SET lead_id = COALESCE(c.lead_id, c.client_id)
FROM public.wa_conversations c
WHERE m.conversation_id = c.id AND m.lead_id IS NULL;

COMMENT ON COLUMN public.wa_inbox_messages.intent IS 'Tagged intent: followup | quote_share | renewal_reminder | feedback | policy_document | transactional | manual_chat | customer_reply | template_other';
