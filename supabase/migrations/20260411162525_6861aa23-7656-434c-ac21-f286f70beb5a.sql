DELETE FROM public.wa_inbox_messages
WHERE conversation_id IN (
  SELECT id FROM public.wa_conversations
  WHERE phone IN ('919999999999', '16315551181')
);

DELETE FROM public.wa_message_logs
WHERE phone IN ('919999999999', '16315551181');

DELETE FROM public.wa_contacts
WHERE phone IN ('919999999999', '16315551181');

DELETE FROM public.whatsapp_conversations
WHERE phone_number IN ('919999999999', '16315551181');

DELETE FROM public.wa_conversations
WHERE phone IN ('919999999999', '16315551181');