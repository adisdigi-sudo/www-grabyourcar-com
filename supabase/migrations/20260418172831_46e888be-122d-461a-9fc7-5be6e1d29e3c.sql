-- Disable all old wa_chatbot_rules so new whatsapp-flow-engine takes over
UPDATE public.wa_chatbot_rules SET is_active = false WHERE is_active = true;

-- Make sure Redirect Off-Topic has a strong greeting reply (was empty)
UPDATE public.whatsapp_flow_triggers
SET intent_type = 'fixed_reply',
    action_config = jsonb_build_object(
      'reply_text',
      E'🚗 *Namaste! Welcome to GrabYourCar* 🙏\n\nIndia''s most trusted car ecosystem — *500+ cars delivered*, 10,000+ happy customers, 50+ brands, pan-India service.\n\n*Reply with the keyword to know more:*\n\n🏆 *founder* — Our founder''s journey\n🚙 *services* — All 6 verticals we offer\n💎 *benefits* — Why choose us\n📞 *contact* — Reach our team\n📋 *how to book* — Our 4-step process\n\n*Need a document?*\n• *policy* — Insurance copy\n• *invoice* — Order receipt\n• *sanction letter* — Loan approval\n• *hsrp status* — Plate order\n• *account* — UPI / Bank details\n\n*Looking for a car?* Just type the model name (e.g. *Fortuner*, *Creta*, *Thar*) — we''ll send price + features instantly! ⚡'
    ),
    keywords = ARRAY['hi','hello','hey','hii','hlo','help','support','start','menu','namaste','hola','hai','haii','hii','helo','hellow','good morning','good evening','good afternoon']
WHERE trigger_name = 'Redirect Off-Topic';

-- Add a dedicated "How to set trigger / how AI works" help reply (for the user himself / managers)
INSERT INTO public.whatsapp_flow_triggers (trigger_name, keywords, intent_type, vertical_slug, priority, is_active, action_config)
VALUES (
  'How Triggers Work (Help)',
  ARRAY['how trigger','how to set trigger','setup trigger','create trigger','admin help','how does this work','how chatbot work','how bot work','trigger setup','document trigger'],
  'fixed_reply',
  NULL,
  50,
  true,
  jsonb_build_object(
    'reply_text',
    E'⚙️ *How Smart Triggers Work*\n\n*1. Customer types a keyword* (e.g. "policy", "invoice", "fortuner")\n*2. Our DB matches it* against active triggers\n*3. Auto-action runs:*\n   • 📄 Send document (Policy/Invoice/Sanction)\n   • 💬 Send fixed reply (FAQ)\n   • 🚗 Fetch car details from website DB\n   • 🏦 Send UPI/Bank details\n\n*To create a new trigger:*\nGo to → *WhatsApp Hub → Smart Triggers → + New Trigger*\n• Name it (e.g. "Renewal Reminder")\n• Add keywords (comma-separated)\n• Choose Intent Type\n• Configure source table + identity field\n• Save & test in Live Tester ✅\n\n*100% rule-based — no AI dependency, fully exportable.*'
  )
);