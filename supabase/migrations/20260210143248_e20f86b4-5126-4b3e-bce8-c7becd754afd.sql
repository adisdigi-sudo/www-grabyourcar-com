-- Add automation_rule_id to wa_message_queue for journey tracking
ALTER TABLE public.wa_message_queue 
ADD COLUMN IF NOT EXISTS automation_rule_id uuid REFERENCES public.wa_automation_rules(id) ON DELETE SET NULL;

-- Add last_triggered_at to wa_automation_rules
ALTER TABLE public.wa_automation_rules
ADD COLUMN IF NOT EXISTS last_triggered_at timestamptz;

-- Add scheduled_at to wa_message_queue for delayed sends
ALTER TABLE public.wa_message_queue
ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

-- Index for automation lookups
CREATE INDEX IF NOT EXISTS idx_wa_queue_automation_rule ON public.wa_message_queue(automation_rule_id);
CREATE INDEX IF NOT EXISTS idx_wa_queue_scheduled ON public.wa_message_queue(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Seed high-conversion WhatsApp templates for Cars, Insurance, and Loans
INSERT INTO public.whatsapp_templates (name, category, template_type, content, variables, approval_status, is_approved, is_active, language, use_cases) VALUES
-- CARS MARKETING
('new_car_launch', 'Marketing', 'text', 
'🚗 *Exciting News, {name}!*

The all-new *{car_model}* has just launched!

✅ Starting at {price}
✅ Available in {city}
✅ Zero waiting period

📞 Call now for exclusive launch offers!

👉 Explore: grabyourcar.lovable.app/cars

_Reply STOP to opt out_', 
ARRAY['name', 'car_model', 'price', 'city'], 'approved', true, true, 'en', ARRAY['launch', 'new_car']),

('best_deal_offer', 'Marketing', 'text',
'🎉 *Special Offer for You, {name}!*

Get the *best deal* on {car_model}:

💰 Save up to ₹75,000
🎁 Free accessories worth ₹25,000
📋 Instant loan approval
🚗 Fast delivery available

This offer is valid for a limited time only!

📞 Call: +91 95772 00023
💬 Reply "DEAL" to know more

_Reply STOP to opt out_',
ARRAY['name', 'car_model'], 'approved', true, true, 'en', ARRAY['offer', 'deal']),

('price_drop_alert', 'Marketing', 'text',
'📉 *Price Drop Alert, {name}!*

Great news! The *{car_model}* price has been reduced!

🏷️ New price: {price}
📍 Available in {city}
⚡ Limited time offer

Don''t miss this opportunity!

👉 Check now: grabyourcar.lovable.app

_Reply STOP to opt out_',
ARRAY['name', 'car_model', 'price', 'city'], 'approved', true, true, 'en', ARRAY['price_drop', 'alert']),

('fast_delivery', 'Marketing', 'text',
'⚡ *Quick Delivery Available, {name}!*

Looking for a car with zero waiting?

These models are ready for *immediate delivery*:
🚗 Maruti Swift — Ready
🚗 Hyundai Creta — Ready
🚗 Tata Nexon — Ready

Book now and drive home this weekend! 🏠

📞 +91 95772 00023

_Reply STOP to opt out_',
ARRAY['name'], 'approved', true, true, 'en', ARRAY['delivery', 'fast']),

-- CAR LOANS
('instant_loan_approval', 'Marketing', 'text',
'💰 *Car Loan Pre-Approved, {name}!*

Your car loan is just a step away:

✅ Interest from *8.5%* p.a.
✅ Up to *100% financing*
✅ Tenure up to *7 years*
✅ Instant digital approval

Monthly EMI starting ₹{emi}/month

📋 Apply now and get instant approval!

📞 Call: +91 95772 00023
💬 Reply "LOAN" to proceed

_Reply STOP to opt out_',
ARRAY['name', 'emi'], 'approved', true, true, 'en', ARRAY['loan', 'finance']),

('low_emi_offer', 'Marketing', 'text',
'🏦 *Lowest EMI Offer, {name}!*

Drive your dream {car_model} at just:

💳 *₹{emi}/month*
📊 {tenure_months} months tenure
💰 Minimal down payment
🏦 Multiple bank options

Compare & choose the best plan for you!

👉 grabyourcar.lovable.app/car-loans

_Reply STOP to opt out_',
ARRAY['name', 'car_model', 'emi', 'tenure_months'], 'approved', true, true, 'en', ARRAY['emi', 'low_emi']),

-- INSURANCE
('lowest_premium_alert', 'Marketing', 'text',
'🛡️ *Car Insurance Alert, {name}!*

Protect your car with the *lowest premiums*:

✅ Up to *70% discount* on premium
✅ Zero depreciation cover
✅ Instant policy issuance
✅ 14+ trusted insurers

Compare plans in 2 minutes!

👉 grabyourcar.lovable.app/car-insurance

📞 +91 95772 00023

_Reply STOP to opt out_',
ARRAY['name'], 'approved', true, true, 'en', ARRAY['insurance', 'premium']),

('insurance_renewal', 'Reminder', 'text',
'⏰ *Insurance Renewal Reminder, {name}!*

Your car insurance may be due for renewal.

Don''t let it lapse! Renew now and save:

💰 Up to 70% discount
🛡️ Comprehensive coverage
📄 Instant digital policy

Renew in 2 minutes:
👉 grabyourcar.lovable.app/car-insurance

_Reply STOP to opt out_',
ARRAY['name'], 'approved', true, true, 'en', ARRAY['insurance', 'renewal']),

-- JOURNEYS
('welcome_new_lead', 'Welcome', 'text',
'👋 *Welcome to Grabyourcar, {name}!*

Thank you for your interest! 🚗

We''re India''s smarter way to buy new cars.

How can I help you today?
1️⃣ Find the perfect car
2️⃣ Check prices & offers
3️⃣ Calculate EMI
4️⃣ Book a test drive

Just type your preference!

_Reply STOP to opt out_',
ARRAY['name'], 'approved', true, true, 'en', ARRAY['welcome', 'onboarding']),

('inquiry_acknowledgment', 'Utility', 'text',
'✅ *Inquiry Received, {name}!*

Thank you for your interest in the *{car_model}*.

Our car expert will call you within *5 minutes* with:
📋 Best on-road price for {city}
🎁 Available offers & discounts
📊 EMI options

Meanwhile, explore:
👉 grabyourcar.lovable.app/cars/{car_slug}

_Reply STOP to opt out_',
ARRAY['name', 'car_model', 'city', 'car_slug'], 'approved', true, true, 'en', ARRAY['inquiry', 'confirmation']),

('test_drive_confirmation', 'Utility', 'text',
'🚗 *Test Drive Confirmed, {name}!*

Your test drive for *{car_model}* is booked.

📍 Location: {city}
📅 Our team will confirm the date shortly

What to expect:
✅ Full vehicle walkthrough
✅ On-road test drive
✅ Price discussion
✅ Exchange evaluation

📞 Questions? Call +91 95772 00023

_Reply STOP to opt out_',
ARRAY['name', 'car_model', 'city'], 'approved', true, true, 'en', ARRAY['test_drive', 'booking']),

('post_inquiry_followup', 'Follow-up', 'text',
'Hi {name}! 👋

Following up on your inquiry about the *{car_model}*.

Did you know?
🏷️ Special offers are running this month
💰 EMI starts from just ₹{emi}/month
🎁 Free accessories on booking

Would you like to:
1️⃣ Get the best price
2️⃣ Book a test drive
3️⃣ Talk to our expert

Just reply with your choice!

_Reply STOP to opt out_',
ARRAY['name', 'car_model', 'emi'], 'approved', true, true, 'en', ARRAY['followup', 'nurture']),

('abandoned_flow_reengagement', 'Marketing', 'text',
'Hi {name}! 🚗

We noticed you were exploring the *{car_model}* on Grabyourcar.

Don''t miss out!
✨ Exclusive offer waiting for you
💰 Best price guarantee
🚗 Fast delivery available

Complete your journey:
👉 grabyourcar.lovable.app/cars/{car_slug}

📞 Need help? Call +91 95772 00023

_Reply STOP to opt out_',
ARRAY['name', 'car_model', 'car_slug'], 'approved', true, true, 'en', ARRAY['abandoned', 'reengagement']),

-- FESTIVAL/SEASONAL
('festival_campaign', 'Marketing', 'text',
'🎊 *Festival Special, {name}!*

Celebrate with unbeatable car deals:

🚗 Up to ₹1,00,000 off on select models
🎁 Free gold coin on booking
💰 0% processing on car loans
🛡️ 1-year free insurance

Limited period only!

📞 Book now: +91 95772 00023
👉 grabyourcar.lovable.app

_Reply STOP to opt out_',
ARRAY['name'], 'approved', true, true, 'en', ARRAY['festival', 'seasonal'])

ON CONFLICT DO NOTHING;
