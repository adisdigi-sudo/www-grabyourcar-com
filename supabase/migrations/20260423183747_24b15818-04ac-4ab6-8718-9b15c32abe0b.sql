-- Enable realtime for dealer reply/delivery tracking
ALTER TABLE public.dealer_inquiry_recipients REPLICA IDENTITY FULL;
ALTER TABLE public.dealer_chat_history REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.dealer_inquiry_recipients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dealer_chat_history;