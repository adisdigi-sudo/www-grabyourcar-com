-- ════════════════════════════════════════════
-- COMPANY KNOWLEDGE TRIGGERS — GrabYourCar
-- ════════════════════════════════════════════

INSERT INTO public.whatsapp_flow_triggers (vertical_slug, trigger_name, keywords, intent_type, action_config, priority) VALUES

-- About / Who are you
(NULL, 'About GrabYourCar',
  ARRAY['about', 'about you', 'about grabyourcar', 'who are you', 'kya hai', 'kaun ho', 'company kya hai', 'tell me about', 'introduce', 'introduction'],
  'fixed_reply',
  jsonb_build_object('reply_text', E'🚗 *Welcome to GrabYourCar!* 🙏\n\nWe are India''s fastest-growing automotive platform — your one-stop solution for everything car-related.\n\n*🏆 Our Achievements:*\n✅ 500+ Cars Delivered Pan-India\n✅ 50+ Brands Covered\n✅ 11 Service Verticals\n✅ 24/7 WhatsApp Support\n✅ Trusted by 10,000+ Happy Customers\n\n*🎯 What We Do:*\n🚙 New Car Sales (Best Prices)\n💰 Car Loans (3-Bank Comparison)\n🛡️ Insurance (Save up to 50%)\n🔢 HSRP Number Plates\n🚘 Self-Drive Rentals\n🛍️ Premium Accessories\n\n*Reply with:*\n• "founder" — Our story\n• "benefits" — Why choose us\n• "services" — Full list\n• "contact" — Reach our team'),
  50),

-- Founder journey
(NULL, 'Founder Journey',
  ARRAY['founder', 'owner', 'ceo', 'who started', 'founder kaun', 'anshdeep', 'story', 'journey', 'background'],
  'fixed_reply',
  jsonb_build_object('reply_text', E'👨‍💼 *Founder Story — Anshdeep Singh* 🇮🇳\n\nGrabYourCar was born from a simple frustration: *buying a car in India was too complex, too expensive, and too opaque.*\n\n*The Journey:*\n🌱 Started with one mission — make car buying *transparent, fast, and affordable*\n🚗 First year: 50 cars delivered with personal handholding\n📈 Today: 500+ cars delivered, 50+ brands, Pan-India presence\n🏢 Backed by Wakhra Swag Lifestyle Pvt Ltd\n\n*Our Promise:*\n_"Hum sirf cars nahi bechte — hum families ko sapne deliver karte hain."_\n\nFrom a single dealership idea to a full automotive ecosystem covering Sales, Loans, Insurance, HSRP, Rentals & Accessories — we''ve built India''s most complete car platform.\n\n💬 Want to be part of our growth story? Reply "services" to explore.'),
  50),

-- Benefits / Why choose us
(NULL, 'Why Choose GrabYourCar',
  ARRAY['benefits', 'why you', 'why grabyourcar', 'why choose', 'kyu lu', 'fayda', 'fayda kya', 'advantage', 'better than', 'usp'],
  'fixed_reply',
  jsonb_build_object('reply_text', E'⭐ *Why 10,000+ Customers Choose GrabYourCar:*\n\n💸 *Best Price Guarantee*\nWe negotiate with 50+ dealers across India to get you the lowest on-road price.\n\n⚡ *24/7 Instant Support*\nWhatsApp us anytime — get policy, invoice, sanction letter in seconds.\n\n🔒 *100% Transparent*\nNo hidden charges. Every cost shown upfront.\n\n🏦 *3-Bank Loan Comparison*\nSide-by-side EMI from HDFC, ICICI, SBI — choose the best.\n\n🛡️ *Insurance Savings up to 50%*\nWe compare 20+ insurers to fetch you the cheapest premium.\n\n🚀 *Pan-India Delivery*\nDoorstep delivery in 100+ cities.\n\n📄 *Auto Document Delivery*\nPolicy, RC, Invoice — all auto-shared on WhatsApp.\n\n🎁 *Free Accessories Worth ₹15,000*\nOn select bookings.\n\n💬 Ready to start? Just type the car name (e.g. "Fortuner") or service you need.'),
  50),

-- Services list
(NULL, 'All Services',
  ARRAY['services', 'what services', 'kya services', 'offerings', 'what do you offer', 'kya offer', 'verticals', 'all products'],
  'fixed_reply',
  jsonb_build_object('reply_text', E'🛠️ *GrabYourCar — All Services:*\n\n🚙 *1. New Car Sales*\nBest on-road prices on 50+ brands. Free home test drive.\n👉 Type any car name (Fortuner, Creta, Thar...)\n\n💰 *2. Car Loans*\n3-bank comparison. Lowest EMI. 24-hr approval.\n👉 Type "loan"\n\n🛡️ *3. Car Insurance*\nSave up to 50%. Instant policy on WhatsApp.\n👉 Type "insurance" or "policy"\n\n🔢 *4. HSRP Number Plates*\nDoorstep delivery. Govt-approved.\n👉 Type "hsrp"\n\n🚘 *5. Self-Drive Rentals*\nMonthly/weekly. Premium fleet.\n👉 Type "rental" or "self drive"\n\n🛍️ *6. Premium Accessories*\nOEM + aftermarket. Doorstep install.\n👉 Type "accessories"\n\n📞 *Need a human?* Type "talk to expert"'),
  50),

-- Contact
(NULL, 'Contact / Office',
  ARRAY['contact', 'contact us', 'address', 'office', 'location', 'where', 'kahan ho', 'phone number', 'call', 'email'],
  'fixed_reply',
  jsonb_build_object('reply_text', E'📞 *Contact GrabYourCar:*\n\n🏢 *Company:* Wakhra Swag Lifestyle Pvt Ltd\n📍 *Office:* Gurgaon, Sohna Road\n📱 *WhatsApp:* This number (24/7)\n📧 *Email:* support@grabyourcar.com\n🌐 *Website:* www.grabyourcar.com\n\n*Office Hours:*\n🕘 Mon–Sat: 9:00 AM – 9:00 PM\n🕐 Sun: 10:00 AM – 6:00 PM\n\n*WhatsApp Support: 24/7 ⚡*\n\nWhat would you like help with?'),
  50),

-- Delivered cars / Track record
(NULL, '500+ Cars Delivered',
  ARRAY['how many cars', 'delivered', 'track record', 'experience', 'kitne cars', 'customers', 'trust', 'reviews'],
  'fixed_reply',
  jsonb_build_object('reply_text', E'🏆 *GrabYourCar by the Numbers:*\n\n🚗 *500+ Cars Delivered* across India\n👥 *10,000+ Happy Customers*\n🌆 *100+ Cities Served*\n🏢 *50+ Brand Partnerships*\n⭐ *4.8/5 Average Rating*\n📞 *24/7 WhatsApp Support*\n💰 *₹50 Crore+ in deals closed*\n\n*Recent Customer Wins:*\n✅ ₹2.5L saved on Fortuner deal (Mumbai)\n✅ ₹35K saved on insurance (Delhi)\n✅ Same-day HSRP delivery (Bangalore)\n✅ 7.5% EMI vs market 9.2% (Pune)\n\n_"Real customers. Real savings. Real trust."_\n\n💬 Want a personalized quote? Just type the car/service name.'),
  50),

-- How to book
(NULL, 'How to Book',
  ARRAY['how to book', 'how to buy', 'process', 'booking', 'kaise book', 'kaise lu', 'kaise kharidu', 'steps'],
  'fixed_reply',
  jsonb_build_object('reply_text', E'📋 *How to Book with GrabYourCar — 4 Easy Steps:*\n\n*Step 1: Tell us what you need* 💬\nJust type the car name or service (e.g. "Fortuner" or "Insurance")\n\n*Step 2: Get instant quote* ⚡\nWe send on-road price + EMI + insurance options on WhatsApp\n\n*Step 3: Confirm & pay* 💳\nPay token amount via UPI/Bank transfer (type "account" for details)\n\n*Step 4: Doorstep delivery* 🚗\nWe handle paperwork, RC, HSRP, Insurance — you get the keys\n\n⏱️ *Total Time:* 7–14 days (vs market 30+ days)\n\n*Ready to start?* Just type:\n• Car name → for sales\n• "Loan" → for finance\n• "Insurance" → for policy\n• "Account" → for payment'),
  50),

-- Talk to human / expert
(NULL, 'Talk to Expert',
  ARRAY['talk to expert', 'human', 'agent', 'representative', 'manager', 'baat karni', 'connect me', 'speak to', 'real person'],
  'fixed_reply',
  jsonb_build_object('reply_text', E'👨‍💼 *Connecting you to a Human Expert...*\n\nOur team will reach out within *15 minutes* on this WhatsApp number.\n\n*Please share:*\n1️⃣ Your name\n2️⃣ City\n3️⃣ What you need help with\n\n_Example: "Anshdeep, Delhi, want Fortuner on-road price"_\n\nMeanwhile, you can also:\n📞 Call us: Mon–Sat 9 AM – 9 PM\n📧 Email: support@grabyourcar.com\n\n_Average response time: 8 minutes ⚡_'),
  50),

-- Pricing / Charges
(NULL, 'Pricing / Charges',
  ARRAY['charges', 'fees', 'commission', 'service charge', 'free', 'cost', 'kitna lagega', 'kitna paisa'],
  'fixed_reply',
  jsonb_build_object('reply_text', E'💰 *GrabYourCar Pricing — 100% Transparent:*\n\n✅ *Car Sales Consultation* — FREE\n✅ *Loan EMI Comparison* — FREE\n✅ *Insurance Quotes* — FREE\n✅ *Test Drive Booking* — FREE\n✅ *On-Road Price Calculator* — FREE\n\n*We earn ONLY from manufacturer/bank/insurer commissions* — never from you. So our advice is always in your favor.\n\n*Paid Services:*\n🔢 HSRP Plate: ₹999 (govt rate)\n🛍️ Accessories: As per MRP minus discount\n🚘 Self-Drive: Per-day/per-km basis\n\n_No hidden charges. No surprises. Ever._\n\n💬 What service do you need a quote for?'),
  60)

ON CONFLICT DO NOTHING;