-- Email Templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  template_type TEXT NOT NULL DEFAULT 'transactional',
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email Sequences table (for drip campaigns)
CREATE TABLE public.email_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_event TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email Sequence Steps
CREATE TABLE public.email_sequence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 1,
  delay_hours INTEGER NOT NULL DEFAULT 0,
  delay_days INTEGER NOT NULL DEFAULT 0,
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email Send Log (tracking)
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.email_templates(id),
  sequence_id UUID REFERENCES public.email_sequences(id),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  resend_id TEXT,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Subscriber preferences
CREATE TABLE public.email_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  subscribed BOOLEAN DEFAULT true,
  preferences JSONB DEFAULT '{"welcome": true, "quotes": true, "offers": true, "followups": true}',
  source TEXT,
  lead_id UUID,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can manage email_templates" ON public.email_templates
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage email_sequences" ON public.email_sequences
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage email_sequence_steps" ON public.email_sequence_steps
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage email_logs" ON public.email_logs
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage email_subscribers" ON public.email_subscribers
  FOR ALL USING (public.is_admin(auth.uid()));

-- Insert default email templates
INSERT INTO public.email_templates (name, subject, category, template_type, html_content, variables) VALUES
-- Welcome Email
('Welcome to GrabYourCar', 'Welcome to GrabYourCar, {customer_name}! 🚗', 'welcome', 'transactional',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
    <h1 style="color: #f97316; margin: 0;">GrabYourCar</h1>
  </div>
  <div style="padding: 30px; background: #ffffff;">
    <h2 style="color: #1a1a2e;">Welcome, {customer_name}! 🎉</h2>
    <p>Thank you for choosing GrabYourCar as your trusted car buying partner.</p>
    <p>We''re here to help you find your dream car with:</p>
    <ul>
      <li>✅ Best prices guaranteed</li>
      <li>✅ Expert advice from our team</li>
      <li>✅ Easy financing options</li>
      <li>✅ Hassle-free documentation</li>
    </ul>
    <p>Our team will reach out to you shortly. In the meantime, explore our collection!</p>
    <a href="https://grabyourcar.lovable.app/cars" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">Browse Cars</a>
  </div>
  <div style="background: #f4f4f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
    <p>GrabYourCar | Your Trusted Car Partner</p>
    <p>📞 9577200023 | 📧 info@grabyourcar.com</p>
  </div>
</div>', 
ARRAY['{customer_name}']),

-- Price Quote Email
('Price Quote Delivery', 'Your {car_name} Price Quote from GrabYourCar', 'quote', 'transactional',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
    <h1 style="color: #f97316; margin: 0;">GrabYourCar</h1>
  </div>
  <div style="padding: 30px; background: #ffffff;">
    <h2 style="color: #1a1a2e;">Hi {customer_name},</h2>
    <p>Here''s your personalized price quote for <strong>{car_name}</strong>:</p>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;">Ex-Showroom Price</td><td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #eee;">{ex_showroom}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;">RTO & Registration</td><td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #eee;">{rto}</td></tr>
        <tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;">Insurance (1 Year)</td><td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #eee;">{insurance}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold; color: #f97316;">On-Road Price</td><td style="text-align: right; padding: 8px 0; font-weight: bold; color: #f97316; font-size: 18px;">{on_road_price}</td></tr>
      </table>
    </div>
    <p style="background: #fef3cd; padding: 12px; border-radius: 6px;">💰 <strong>Special Offer:</strong> {special_offer}</p>
    <p>This quote is valid for 7 days. Contact us to book your car!</p>
    <a href="tel:9577200023" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">📞 Call Now</a>
  </div>
  <div style="background: #f4f4f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
    <p>GrabYourCar | Your Trusted Car Partner</p>
  </div>
</div>',
ARRAY['{customer_name}', '{car_name}', '{ex_showroom}', '{rto}', '{insurance}', '{on_road_price}', '{special_offer}']),

-- Follow-up Day 1
('Follow-up Day 1', 'Still interested in {car_name}? Let''s talk!', 'followup', 'marketing',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
    <h1 style="color: #f97316; margin: 0;">GrabYourCar</h1>
  </div>
  <div style="padding: 30px; background: #ffffff;">
    <h2 style="color: #1a1a2e;">Hi {customer_name},</h2>
    <p>We noticed you were exploring the <strong>{car_name}</strong>. It''s a fantastic choice!</p>
    <p>Did you know we offer:</p>
    <ul>
      <li>🎯 Free test drives at your doorstep</li>
      <li>💳 Easy EMI starting at {emi_amount}/month</li>
      <li>🎁 Exclusive accessories worth ₹15,000</li>
    </ul>
    <p>Our car expert <strong>Anshdeep Singh</strong> can answer all your questions.</p>
    <div style="margin-top: 20px;">
      <a href="https://wa.me/919577200023" style="display: inline-block; background: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px;">💬 WhatsApp</a>
      <a href="tel:9577200023" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">📞 Call Us</a>
    </div>
  </div>
</div>',
ARRAY['{customer_name}', '{car_name}', '{emi_amount}']),

-- Follow-up Day 3
('Follow-up Day 3 - Limited Offer', '⏰ Limited Time: Special offer on {car_name}', 'followup', 'marketing',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #f97316 100%); padding: 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0;">⏰ Limited Time Offer!</h1>
  </div>
  <div style="padding: 30px; background: #ffffff;">
    <h2 style="color: #1a1a2e;">Hi {customer_name},</h2>
    <p>Great news! We have a special offer just for you on the <strong>{car_name}</strong>:</p>
    <div style="background: #fef2f2; border: 2px dashed #dc2626; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
      <p style="font-size: 24px; color: #dc2626; font-weight: bold; margin: 0;">{discount_offer}</p>
      <p style="color: #666; margin: 10px 0 0 0;">Valid until {offer_expiry}</p>
    </div>
    <p>Don''t miss out on this amazing deal!</p>
    <a href="tel:9577200023" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">🔥 Claim Offer Now</a>
  </div>
</div>',
ARRAY['{customer_name}', '{car_name}', '{discount_offer}', '{offer_expiry}']),

-- Follow-up Day 7
('Follow-up Day 7 - Last Chance', 'Last chance: Your {car_name} is waiting!', 'followup', 'marketing',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="padding: 30px; background: #ffffff;">
    <h2 style="color: #1a1a2e;">Hi {customer_name},</h2>
    <p>We don''t want you to miss out on your dream car!</p>
    <p>The <strong>{car_name}</strong> you were interested in is still available, but demand is high.</p>
    <p>Here''s what makes it special:</p>
    <ul>
      <li>⭐ {car_highlight_1}</li>
      <li>⭐ {car_highlight_2}</li>
      <li>⭐ {car_highlight_3}</li>
    </ul>
    <p>Let''s make this happen! Reply to this email or call us directly.</p>
    <p>Best regards,<br><strong>Team GrabYourCar</strong></p>
  </div>
</div>',
ARRAY['{customer_name}', '{car_name}', '{car_highlight_1}', '{car_highlight_2}', '{car_highlight_3}']),

-- Booking Confirmation
('Booking Confirmation', '✅ Your {car_name} booking is confirmed!', 'transactional', 'transactional',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0;">✅ Booking Confirmed!</h1>
  </div>
  <div style="padding: 30px; background: #ffffff;">
    <h2 style="color: #1a1a2e;">Congratulations, {customer_name}! 🎉</h2>
    <p>Your booking for <strong>{car_name}</strong> has been confirmed!</p>
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>Booking ID:</strong> {booking_id}</p>
      <p><strong>Variant:</strong> {variant_name}</p>
      <p><strong>Color:</strong> {color}</p>
      <p><strong>Amount Paid:</strong> {amount_paid}</p>
    </div>
    <p><strong>Next Steps:</strong></p>
    <ol>
      <li>Our team will contact you within 24 hours</li>
      <li>Document verification process</li>
      <li>Delivery scheduling</li>
    </ol>
    <p>Thank you for choosing GrabYourCar!</p>
  </div>
</div>',
ARRAY['{customer_name}', '{car_name}', '{booking_id}', '{variant_name}', '{color}', '{amount_paid}']),

-- Test Drive Reminder
('Test Drive Reminder', '🚗 Your test drive for {car_name} is tomorrow!', 'reminder', 'transactional',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="padding: 30px; background: #ffffff;">
    <h2 style="color: #1a1a2e;">Hi {customer_name},</h2>
    <p>Just a friendly reminder about your upcoming test drive:</p>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p><strong>🚗 Car:</strong> {car_name}</p>
      <p><strong>📅 Date:</strong> {test_drive_date}</p>
      <p><strong>⏰ Time:</strong> {test_drive_time}</p>
      <p><strong>📍 Location:</strong> {location}</p>
    </div>
    <p>Please bring your driving license. Looking forward to seeing you!</p>
  </div>
</div>',
ARRAY['{customer_name}', '{car_name}', '{test_drive_date}', '{test_drive_time}', '{location}']),

-- Monthly Newsletter
('Monthly Newsletter', '🚗 This Month at GrabYourCar: New Arrivals & Offers!', 'newsletter', 'marketing',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
    <h1 style="color: #f97316; margin: 0;">GrabYourCar</h1>
    <p style="color: #ffffff; margin: 10px 0 0 0;">{month_year} Newsletter</p>
  </div>
  <div style="padding: 30px; background: #ffffff;">
    <h2>Hi {customer_name}! 👋</h2>
    <p>Here''s what''s new this month:</p>
    <h3>🆕 New Arrivals</h3>
    <p>{new_arrivals}</p>
    <h3>💰 Best Offers</h3>
    <p>{best_offers}</p>
    <h3>📰 Auto News</h3>
    <p>{auto_news}</p>
    <a href="https://grabyourcar.lovable.app" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Explore Now</a>
  </div>
</div>',
ARRAY['{customer_name}', '{month_year}', '{new_arrivals}', '{best_offers}', '{auto_news}']);

-- Create default email sequences
INSERT INTO public.email_sequences (name, description, trigger_type, trigger_event, is_active) VALUES
('Welcome Series', 'Automated welcome sequence for new leads', 'event', 'new_lead', true),
('Quote Follow-up', 'Follow-up sequence after sending price quote', 'event', 'quote_sent', true),
('Abandoned Inquiry', 'Re-engagement for users who showed interest but didn''t convert', 'event', 'inquiry_abandoned', true);

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_sequences_updated_at BEFORE UPDATE ON public.email_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_subscribers_updated_at BEFORE UPDATE ON public.email_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();