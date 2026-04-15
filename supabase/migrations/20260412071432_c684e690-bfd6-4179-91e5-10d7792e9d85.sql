-- Add meta_category to campaigns
ALTER TABLE public.wa_campaigns 
ADD COLUMN IF NOT EXISTS meta_category text DEFAULT 'utility';

-- Add meta_category to message queue
ALTER TABLE public.wa_message_queue 
ADD COLUMN IF NOT EXISTS meta_category text DEFAULT 'utility';

-- Add opt_out_footer to crm_message_templates  
ALTER TABLE public.crm_message_templates
ADD COLUMN IF NOT EXISTS opt_out_footer text DEFAULT 'Reply STOP to unsubscribe';

ALTER TABLE public.crm_message_templates
ADD COLUMN IF NOT EXISTS meta_category text DEFAULT 'service';

-- Create category rules table
CREATE TABLE IF NOT EXISTS public.wa_category_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  message_context text NOT NULL UNIQUE,
  meta_category text NOT NULL DEFAULT 'utility',
  requires_template boolean DEFAULT false,
  opt_out_footer_required boolean DEFAULT true,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.wa_category_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view category rules"
ON public.wa_category_rules FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Admins can manage category rules"
ON public.wa_category_rules FOR ALL
TO authenticated USING (public.is_admin(auth.uid()));

-- Seed default Meta category rules
INSERT INTO public.wa_category_rules (rule_name, message_context, meta_category, requires_template, opt_out_footer_required, description) VALUES
-- SERVICE (FREE) - within 24hr window
('CRM Follow-up', 'crm_followup', 'service', false, true, 'Follow-up messages to existing CRM clients - FREE within 24hr window'),
('Quote Share', 'quote_share', 'service', false, true, 'Sharing quotes to clients who inquired - FREE within 24hr window'),
('Policy Update', 'policy_update', 'service', false, true, 'Policy status updates to existing clients - FREE within 24hr window'),
('Inbox Reply', 'inbox_reply', 'service', false, false, 'Direct replies to customer messages - FREE within 24hr window'),
('Document Share', 'document_share', 'service', false, true, 'Sharing documents/PDFs to clients - FREE within 24hr window'),

-- UTILITY - approved templates required
('Renewal Reminder', 'renewal_reminder', 'utility', true, true, 'Insurance renewal reminders to existing policyholders - Utility template required'),
('Booking Confirmation', 'booking_confirmation', 'utility', true, false, 'Order/booking confirmations - Utility template required'),
('Payment Receipt', 'payment_receipt', 'utility', true, false, 'Payment confirmation messages - Utility template required'),
('Appointment Reminder', 'appointment_reminder', 'utility', true, false, 'Service appointment reminders - Utility template required'),
('Delivery Update', 'delivery_update', 'utility', true, false, 'Order delivery status updates - Utility template required'),
('HSRP Status', 'hsrp_status', 'utility', true, false, 'HSRP plate status updates - Utility template required'),

-- MARKETING - approved templates required, most expensive
('New Lead Outreach', 'new_lead_outreach', 'marketing', true, true, 'First contact with new/cold leads - Marketing template required'),
('Promotional Offer', 'promotional_offer', 'marketing', true, true, 'Promotional offers, discounts, new launches - Marketing template required'),
('Cross-sell Campaign', 'cross_sell', 'marketing', true, true, 'Cross-vertical selling campaigns - Marketing template required'),
('Re-engagement', 're_engagement', 'marketing', true, true, 'Re-engaging dormant leads - Marketing template required'),
('Bulk Campaign', 'bulk_campaign', 'marketing', true, true, 'Mass broadcast campaigns - Marketing template required'),
('Festival Offer', 'festival_offer', 'marketing', true, true, 'Festival/seasonal promotional messages - Marketing template required'),

-- AUTHENTICATION
('OTP Verification', 'otp_verification', 'authentication', true, false, 'One-time password for login/verification')
ON CONFLICT (message_context) DO NOTHING;