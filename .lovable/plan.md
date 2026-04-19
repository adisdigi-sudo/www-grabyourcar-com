# 🎯 GrabYourCar — Point-by-Point Master Build List

Phases nahi — har point ek **independent task**. 38 concrete points in execution order.

---

## 🔴 CRITICAL FIXES (pehle yeh)

**1. White-page issue permanent fix**
- Granular error boundaries on all routes
- Skeleton loaders har page pe (blank screen ban hi nahi)
- Network failure pe retry UI (not blank)
- Startup shell logic finalize

**2. Auto-refresh stability check**
- Confirm auto-reload disabled (already done)
- Manual reload button if needed

---

## 📞 CALLING SYSTEM (Sridhar/Knowlarity style)

**3. Universal Calling Engine — har vertical me same flow**
- Insurance, Loans, HSRP, Self-Drive, Accessories, Dealers, Rentals, Sales — sab me unified `CallingQueueWorkspace`
- Currently sirf Loans + Car me hai → baki 9 verticals me wire karna hai

**4. Mandatory disposition modal (forced)**
- Dial → call end → status modal BLOCKS UI
- Options: 🔥 Hot / ✅ Interested / ❌ Not Interested / 📅 Callback / 🚫 Wrong Number / 📵 Busy / 🔇 DND
- Save hone tak next number nahi
- Save → 2-sec countdown → next lead auto-load

**5. Mandatory remarks for Hot/Interested/Callback**
- Free-text required
- Save to `auto_dialer_dispositions` audit table

**6. Real-time filterization sidebar**
- Live counters with chips: Hot 🔥 | Interested ✅ | Not Interested ❌ | Callback 📅 | Pending 🕐
- Click chip → instant filter

**7. Permanent upload history**
- New table `auto_dialer_uploads` (filename, uploader, timestamp, row count, vertical)
- Re-download original CSV/XLSX anytime
- Conversion stats per upload

---

## 💬 WHATSAPP CONVERSATION

**8. Template send → recipient filter dropdown**
- By stage (New/Followup/Renewal/Issued/Lost)
- By vertical
- By tag (Hot/Cold/VIP)
- Custom date range

**9. Excel upload → custom audience send**
- Upload phone list → validate → dedupe → send to that list

**10. Bulk send mode (rate-limited)**
- 80 msgs/min Meta-safe
- Live progress, sent/failed counters, cancel button

**11. Attachment send/receive in WhatsApp**
- Send images, PDFs, brochures, voice notes
- Receive customer attachments inline preview
- Same in AI chat panel

**12. AI auto-context send**
- "send brochure Creta" → AI fetches `cars` → attaches PDF + images → sends
- "send my policy" → asks phone → fetches → auto-sends

---

## 🔴 LIVE WEBSITE CHATBOT REAL-TIME

**13. Admin live chat dashboard per vertical**
- All active website chats real-time
- Per-vertical filter

**14. New chat alert popup + sound**
- 🔔 Sound + browser notification
- Unread badge on sidebar

**15. AI auto lead capture real-time**
- AI extracts name+phone → instant lead in correct vertical
- Visible in pipeline within 2 sec

**16. Live agent takeover from AI**
- One-click "Takeover" → human types directly
- SLA timer (red alert >2 min wait)

---

## 🛡️ INSURANCE / LOANS SPECIFIC

**17. Brand New Car Quote flow (Insurance)**
- Toggle: "Brand New Car (no RC)" / "Existing Car (with RC)"
- Brand New: skip RC → ask brand/model/variant/RTO/ex-showroom → IDV → quote

**18. Live Agent inside Insurance CRM**
- WhatsApp inbox embedded
- Per-policy conversation thread

**19. Live Agent inside Loans CRM**
- Same WhatsApp inbox embed in Loans

**20. Insurance bekar tabs remove**
- Audit unused/duplicate tabs → list → approval → delete

---

## 🤖 AUTOMATION (founder reports + auto-followup)

**21. Founder Daily Digest WhatsApp**
- 9 AM + 7 PM auto-send
- Today's leads/calls/conversions/revenue/attendance/top-bottom performer

**22. Team attendance auto-track**
- Login = check-in, 5+ hr idle = auto check-out
- Daily summary to manager + founder

**23. Incentive engine real-time**
- Per-vertical targets
- Real-time progress bar per agent
- Auto-calculate incentive earned

**24. No-reply auto-followup chain**
- 24 hr → template 1
- 48 hr → template 2
- 7 days → mark cold + manager alert

---

## 🚗 DATA UPLOAD

**25. Car database completion**
- Audit `cars` table → missing fields
- Bulk CSV upload (variants/specs/prices)
- Drag-drop folder for images
- Brochure PDF storage per car

**26. Self-Drive cars bulk upload (7-8 cars)**
- UI for one-by-one or CSV
- Image + brochure + price

**27. Accessories catalog upload**
- Product image, name, price, stock, brand
- Bulk CSV

**28. WhatsApp accessories sales flow**
- "show seat covers" → AI sends image + price + Razorpay link
- Order confirmation → tracking via WhatsApp

---

## 🧹 CLEANUP

**29. Marketing tab cleanup (strict isolation)**
- WhatsApp Marketing → only WhatsApp tools
- Email Marketing → only email
- Google Ads / Meta Ads / RCS / SEO → strict isolation
- Remove duplicates and unused

**30. Legacy leads cleanup**
- Delete sample/test data from `legacy_leads`
- Real-time pipeline only

---

## 🔑 API SETUP

**31. Per-vertical API config (move from Marketing/Tech)**
- WhatsApp API → in WhatsApp Hub
- Email API (Resend) → in Email module
- SEO/AI keys → in SEO module
- Surepass + Bureau API → in Insurance module
- Saved + tested → auto-active

**32. API status dashboard per vertical**
- Green/Red/Yellow dots
- "Test Now" button per API

**33. Surepass live test UI**
- Test run RC verification inline
- Show response

**34. Open API Partner Portal (external sharing)**
- Custom logo + branding per partner
- API key + secret
- Test playground
- Auto-generated docs
- Usage analytics

---

## 📄 HR INVOICES/RECEIPTS LIVE EDITOR

**35. Side-by-side live preview editor**
- Left: form, Right: PDF preview live
- Templates: Invoice, Receipt, Salary Slip, Offer Letter
- Add/edit → instant preview
- PDF download + WhatsApp send

---

## 🧠 CONVERSATION FLOW BUILDER

**36. Visual flow builder (no-code)**
- Form-based: keyword → AI response → action (template/lead/handover)
- Hint system: `{{name}}` `{{policy_number}}` autocomplete
- Live test simulator
- Per-vertical flow library

---

## 🚀 DEPLOYMENT

**37. Lovable dependency removal**
- Remove `lovable.app`, `lovable-tagger`, hardcoded preview URLs
- All env via `VITE_*` from `.env`

**38. Vercel production deployment**
- `vercel.json` finalize
- Domain map `grabyourcar.com`
- Edge functions deploy via Supabase CLI
- SSL + DNS guide

---

## 📊 SUMMARY

- **Total points:** 38
- **Critical first:** 1-2
- **Biggest impact:** 3-7 (Calling), 8-12 (WhatsApp), 13-16 (Live chat)
- **Estimated turns:** 45-55

---

## 🎯 START COMMAND

Reply with:
- **"go 1"** → start from point 1 (white-page fix)
- **"go 3"** → start from Universal Calling Engine
- **"all critical first"** → do points 1-7 in one batch
- **"reorder"** → tell me new order
- **"add point: ..."** → add anything I missed
