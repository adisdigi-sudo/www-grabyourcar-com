
-- Add 45-day reminder tracking columns
ALTER TABLE public.insurance_renewal_tracking
ADD COLUMN IF NOT EXISTS reminder_45_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_45_sent_at timestamptz;

-- Create renewal settings table for configurable templates/triggers
CREATE TABLE IF NOT EXISTS public.insurance_renewal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.insurance_renewal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage renewal settings"
  ON public.insurance_renewal_settings FOR ALL
  USING (public.is_admin(auth.uid()));

-- Seed default premium renewal template
INSERT INTO public.insurance_renewal_settings (setting_key, setting_value, description)
VALUES (
  'renewal_whatsapp_template',
  '{
    "template_body": "🚗 *Grabyourcar Policy Renewal Reminder*\n━━━━━━━━━━━━━━━━━━━━━\n\nHello *{{customer_name}}*,\n\nWe hope you are enjoying a smooth and safe drive!\n\nThis is a friendly reminder from *Grabyourcar Insurance Desk* that your *{{vehicle_model}}* {{vehicle_number_line}}insurance policy is set to expire on *{{expiry_date}}* — just *{{days_remaining}} days* to go.\n\nRenewing your policy before the expiry helps you:\n\n✅ Avoid inspection hassles\n✅ Maintain your No Claim Bonus\n✅ Stay financially protected\n✅ Ensure uninterrupted coverage\n\nOur team has already prepared renewal assistance for you to make the process quick and seamless.\n\n👉 Simply *reply to this message* or click below to get your renewal quote instantly.\n\n🔗 Renew Now: https://grabyourcar.lovable.app/insurance\n\n{{policy_details_section}}\n\nIf you need any help, feel free to contact your dedicated advisor.\n\n📞 {{advisor_number}}\n🌐 www.grabyourcar.com\n\nThank you for trusting *Grabyourcar* — we look forward to protecting your journeys ahead.\n\nDrive safe! 🚘",
    "advisor_number": "+91 98559 24442",
    "cta_link": "https://grabyourcar.lovable.app/insurance",
    "cta_text": "Renew Now",
    "brand_name": "Grabyourcar Insurance",
    "tone": "premium_warm"
  }',
  'Premium WhatsApp renewal reminder template with dynamic variable support'
),
(
  'renewal_trigger_windows',
  '{"windows": [45, 30, 15, 7, 1], "enabled": true}',
  'Days before expiry to send automated renewal reminders'
),
(
  'renewal_advisor_details',
  '{"name": "Grabyourcar Insurance Desk", "phone": "+91 98559 24442", "email": "hello@grabyourcar.com"}',
  'Default advisor details for renewal communications'
)
ON CONFLICT (setting_key) DO NOTHING;
