-- Create WhatsApp Templates table
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'welcome', 'recommendation', 'quote', 'finance', 'test_drive', 'offer', 'reminder', 'feedback', 'trade_in', 'accessory', 'insurance', 'service', 'referral', 're_engagement'
  template_type TEXT NOT NULL, -- 'text', 'image', 'document'
  content TEXT NOT NULL,
  variables TEXT[], -- Array of variable names like ['{customer_name}', '{car_name}']
  preview TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  approval_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  wbiztool_template_id TEXT, -- Template ID from WhatsApp/Wbiztool
  language TEXT DEFAULT 'en',
  use_cases TEXT[], -- Multiple use cases this template serves
  example_data JSONB, -- Example data for preview
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can view all templates" 
ON public.whatsapp_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can create templates" 
ON public.whatsapp_templates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admin can update templates" 
ON public.whatsapp_templates 
FOR UPDATE 
USING (true);

CREATE POLICY "Admin can delete templates" 
ON public.whatsapp_templates 
FOR DELETE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert 15+ pre-approved templates
INSERT INTO public.whatsapp_templates (
  name, category, template_type, content, variables, preview, is_approved, 
  is_active, approval_status, language, use_cases, example_data
) VALUES
-- 1. Welcome Message
(
  'Welcome to GrabYourCar',
  'welcome',
  'text',
  'Hi {customer_name}! 👋 Welcome to GrabYourCar - your trusted platform for finding the perfect car. We help you compare prices, get instant quotes, and book test drives with ease. How can we assist you today?',
  ARRAY['{customer_name}'],
  'Hi John! 👋 Welcome to GrabYourCar...',
  TRUE,
  TRUE,
  'approved',
  'en',
  ARRAY['lead_welcome', 'first_contact'],
  '{"customer_name": "John"}'
),

-- 2. Brand Introduction
(
  'GrabYourCar Brand Story',
  'welcome',
  'text',
  'At GrabYourCar, we believe car buying should be transparent and hassle-free. 🚗 With access to 100+ car models, real-time pricing, and expert guidance, we make finding your perfect car simple. Let''s get started! 💪',
  ARRAY[]::TEXT[],
  'At GrabYourCar, we believe car buying should be transparent...',
  TRUE,
  TRUE,
  'approved',
  'en',
  ARRAY['brand_introduction', 'nurture'],
  '{}'
),

-- 3. Car Recommendation
(
  'Personalized Car Recommendation',
  'recommendation',
  'text',
  'Hi {customer_name}! Based on your preferences, we recommend the {car_name}. 🎯\n\n✅ Budget: {budget}\n✅ Best for: {use_case}\n✅ Current Price: {price}\n\nWould you like to see more details or book a test drive?',
  ARRAY['{customer_name}', '{car_name}', '{budget}', '{use_case}', '{price}'],
  'Hi John! Based on your preferences, we recommend the Maruti Swift...',
  TRUE,
  TRUE,
  'approved',
  'en',
  ARRAY['personalized_recommendation', 'high_intent'],
  '{"customer_name": "John", "car_name": "Maruti Swift", "budget": "₹6-9 Lakh", "use_case": "Daily Commute", "price": "₹6.49 Lakh"}'
),

-- 4. Price Quote
(
  'Instant On-Road Price Quote',
  'quote',
  'text',
  'Here''s your on-road price for {car_name} in {city}:\n\n💰 Ex-Showroom: {ex_showroom}\n🏛️ RTO: {rto}\n📋 Insurance: {insurance}\n💳 Total On-Road: {on_road_price}\n\nInterested? Let''s proceed with booking! 🎉',
  ARRAY['{car_name}', '{city}', '{ex_showroom}', '{rto}', '{insurance}', '{on_road_price}'],
  'Here''s your on-road price for Maruti Swift in Delhi...',
  TRUE,
  TRUE,
  'approved',
  'en',
  ARRAY['quote', 'pricing', 'high_intent'],
  '{"car_name": "Maruti Swift", "city": "Delhi", "ex_showroom": "₹6.49L", "rto": "₹52,000", "insurance": "₹25,000", "on_road_price": "₹7.26L"}'
),

-- 5. Finance Options
(
  'EMI & Finance Options',
  'finance',
  'text',
  'Ready to buy {car_name}? Here are your finance options:\n\n💳 EMI starting from {emi_amount}/month\n📊 Tenure: {tenure_months} months\n🏦 Available with all major banks\n✅ Zero down payment options available\n\nShall we proceed with the finance application?',
  ARRAY['{car_name}', '{emi_amount}', '{tenure_months}'],
  'Ready to buy Maruti Swift? Here are your finance options...',
  TRUE,
  TRUE,
  'approved',
  'en',
  ARRAY['finance', 'emi', 'conversion'],
  '{"car_name": "Maruti Swift", "emi_amount": "₹8,500", "tenure_months": "60"}'
),

-- 6. Test Drive Invitation
(
  'Test Drive Booking Invitation',
  'test_drive',
  'text',
  'Ready to experience {car_name}? 🚗 Book your test drive today!\n\n📍 Location: {location}\n🕐 Available slots: {available_slots}\n✅ Free home pickup & drop\n📞 {phone_number}\n\nReply with your preferred date & time!',
  ARRAY['{car_name}', '{location}', '{available_slots}', '{phone_number}'],
  'Ready to experience Maruti Swift? Book your test drive today...',
  TRUE,
  TRUE,
  'approved',
  'en',
  ARRAY['test_drive', 'booking', 'conversion'],
  '{"car_name": "Maruti Swift", "location": "Delhi", "available_slots": "Tomorrow 10-4pm", "phone_number": "9577200023"}'
),

-- 7. Limited Time Offer
(
  'Offer Alert - Limited Time',
  'offer',
  'text',
  '🎉 EXCLUSIVE OFFER on {car_name}!\n\n💰 Cashback: {cashback}\n🎁 Free accessories worth {accessories_value}\n📊 Additional exchange bonus: {exchange_bonus}\n⏰ Valid till {offer_expiry}\n\nDon''t miss out! Grab the deal now! 👉',
  ARRAY['{car_name}', '{cashback}', '{accessories_value}', '{exchange_bonus}', '{offer_expiry}'],
  '🎉 EXCLUSIVE OFFER on Maruti Swift!...',
  TRUE,
  TRUE,
  'approved',
  'en',
  ARRAY['promotion', 'offer', 'limited_time'],
  '{"car_name": "Maruti Swift", "cashback": "₹50,000", "accessories_value": "₹15,000", "exchange_bonus": "₹30,000", "offer_expiry": "31st March"}'
),

-- 8. Payment Reminder
(
  'Payment Due Reminder',
  'reminder',
  'text',
  'Hi {customer_name}, friendly reminder! 📌\n\nYour payment of {amount} is due on {due_date} for your {car_name} booking.\n\n💳 Pay securely here: {payment_link}\n📞 Need help? Call us at {phone_number}\n\nThank you!',
  ARRAY['{customer_name}', '{amount}', '{due_date}', '{car_name}', '{payment_link}', '{phone_number}'],
  'Hi John, friendly reminder! Your payment of ₹2L is due...',
  TRUE,
  TRUE,
  'approved',
  'en',
  ARRAY['reminder', 'payment', 'follow_up'],
  '{"customer_name": "John", "amount": "₹2,00,000", "due_date": "March 20", "car_name": "Maruti Swift", "payment_link": "pay.grabyourcar.com", "phone_number": "9577200023"}'
),

-- 9. Feedback Request
(
  'Post-Purchase Feedback',
  'feedback',
  'text',
  'Hi {customer_name}! 😊 We hope you''re loving your new {car_name}!\n\nWe''d love to hear about your experience with GrabYourCar. Your feedback helps us serve you better! ⭐\n\n👉 Share your review: {feedback_link}\n\nThank you for choosing us! 🙏',
  ARRAY['{customer_name}', '{car_name}', '{feedback_link}'],
  'Hi John! We hope you''re loving your new Maruti Swift...',
  TRUE,
  TRUE,
  'approved',
  'en',
  ARRAY['feedback', 'satisfaction', 'post_sale'],
  '{"customer_name": "John", "car_name": "Maruti Swift", "feedback_link": "feedback.grabyourcar.com/john123"}'
),

-- 10. Trade-In Offer
(
  'Trade-In Value Offer',
  'trade_in',
  'text',
  'Looking to upgrade? {customer_name}, we have excellent news! 🚗➡️🚗\n\nYour {old_car_model} is worth {trade_in_value} in our exchange program!\n\n✅ Instant valuation (no paperwork hassle)\n✅ Direct adjustment on new car price\n✅ Free pickup of old vehicle\n\nLet''s make the switch! 💪',
  ARRAY['{customer_name}', '{old_car_model}', '{trade_in_value}'],
  'Looking to upgrade? John, your Maruti Alto K10 is worth ₹3.5L...',
  TRUE,
  TRUE,
  'approved',
  'en',
  ARRAY['trade_in', 'exchange', 'upsell'],
  '{"customer_name": "John", "old_car_model": "Maruti Alto K10", "trade_in_value": "₹3,50,000"}'
),

-- 11. Accessory Bundle
(
  'Accessory Bundle Recommendation',
  'accessory',
  'text',
  'Enhance your {car_name} with our premium accessories! 🎁\n\n✨ Complete Care Bundle: {bundle_name}\n💰 Price: {bundle_price} (Save {savings}!)\n\n📦 Includes:\n• {accessory_1}\n• {accessory_2}\n• {accessory_3}\n\nInterested? 👉 {link}',
  ARRAY['{car_name}', '{bundle_name}', '{bundle_price}', '{savings}', '{accessory_1}', '{accessory_2}', '{accessory_3}', '{link}'],
  'Enhance your Maruti Swift with our premium accessories!...',
  TRUE,
  TRUE,
  'approved',
  'en',
  ARRAY['upsell', 'accessories', 'cross_sell'],
  '{"car_name": "Maruti Swift", "bundle_name": "Swift Elite Care", "bundle_price": "₹25,000", "savings": "₹8,000", "accessory_1": "Dashboard Cam", "accessory_2": "Seat Covers", "accessory_3": "Floor Mats", "link": "accessories.grabyourcar.com/swift"}'
),

-- 12. Insurance Recommendation
(
  'Car Insurance Offer',
  'insurance',
  'text',
  'Protect your {car_name} with comprehensive insurance! 🛡️\n\n✅ Annual premium: {annual_premium}\n✅ 24/7 roadside assistance\n✅ Cashless claim settlement\n✅ Family of insurers to choose from\n\n🔗 Get quotes: {insurance_link}\n\nSecure your vehicle today!',
  ARRAY['{car_name}', '{annual_premium}', '{insurance_link}'],
  'Protect your Maruti Swift with comprehensive insurance!...',
  TRUE,
  TRUE,
  'approved',
  'en',
  ARRAY['insurance', 'cross_sell', 'protection'],
  '{"car_name": "Maruti Swift", "annual_premium": "₹25,000", "insurance_link": "insurance.grabyourcar.com/quotes"}'
),

-- 13. Service Reminder
(
  'Car Service & Maintenance',
  'service',
  'text',
  'Hi {customer_name}! 🔧 Time for your {car_name}''s scheduled maintenance?\n\n✅ Free service inspection\n✅ Genuine spare parts guaranteed\n📅 Book your slot: {service_link}\n📞 {phone_number}\n\nKeep your car running smoothly! 💨',
  ARRAY['{customer_name}', '{car_name}', '{service_link}', '{phone_number}'],
  'Hi John! Time for your Maruti Swift''s scheduled maintenance...',
  TRUE,
  TRUE,
  'approved',
  'en',
  ARRAY['service', 'maintenance', 'retention'],
  '{"customer_name": "John", "car_name": "Maruti Swift", "service_link": "service.grabyourcar.com/book", "phone_number": "9577200023"}'
),

-- 14. Referral Incentive
(
  'Refer Friend & Earn',
  'referral',
  'text',
  'Love your {car_name}? Share the joy! 🚗💚\n\nRefer a friend to GrabYourCar and BOTH of you get:\n💰 ₹{referral_bonus} cashback\n🎁 Free accessories\n⭐ VIP customer status\n\n👉 Your referral code: {referral_code}\n\nShare now! {referral_link}',
  ARRAY['{car_name}', '{referral_bonus}', '{referral_code}', '{referral_link}'],
  'Love your Maruti Swift? Share the joy!...',
  TRUE,
  TRUE,
  'approved',
  'en',
  ARRAY['referral', 'growth', 'incentive'],
  '{"car_name": "Maruti Swift", "referral_bonus": "5000", "referral_code": "JOHN2024", "referral_link": "ref.grabyourcar.com/JOHN2024"}'
),

-- 15. Re-engagement
(
  'Win Back Inactive Lead',
  're_engagement',
  'text',
  'We miss you, {customer_name}! 😢\n\nIt''s been a while since we connected. Here''s a special offer just for you:\n\n🎉 COMEBACK BONUS: {comeback_offer}\n💰 Extra cashback on any purchase\n🎁 Exclusive model previews\n\nReady to find your dream car? 👉 {comeback_link}',
  ARRAY['{customer_name}', '{comeback_offer}', '{comeback_link}'],
  'We miss you, John! It''s been a while since we connected...',
  TRUE,
  TRUE,
  'approved',
  'en',
  ARRAY['re_engagement', 'win_back', 'conversion'],
  '{"customer_name": "John", "comeback_offer": "Extra ₹25,000 cashback", "comeback_link": "comeback.grabyourcar.com/john"}'
);