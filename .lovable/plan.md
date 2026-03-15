

## Plan: Holi WhatsApp Share Tool (No API Needed)

### Approach
Since no WhatsApp API is involved, we'll build a **personal share tool** that works directly from your phone's WhatsApp app using deep links.

**How it works:**
1. Upload your Holi image to the project and host it on a **public shareable page** (e.g., `/holi`)
2. Create an **admin share tool** where you paste/enter contact numbers and tap "Send" — each tap opens WhatsApp with a pre-filled greeting message + link to the hosted image page
3. The message will include a link to `grabyourcar.lovable.app/holi` where the recipient sees the full branded Holi poster

### What gets built

**1. Public Holi Greeting Page (`/pages/HoliGreeting.tsx`)**
- Displays the uploaded Holi image full-screen with GrabYourCar branding
- Mobile-optimized, shareable URL: `grabyourcar.lovable.app/holi`

**2. Admin Bulk Share Tool (`/components/admin/HoliBulkShare.tsx`)**
- Textarea to paste phone numbers (one per line or comma-separated)
- Pre-written Holi message with the image page link
- "Send Next" button that opens `wa.me/{number}?text=...` one at a time
- Progress tracker showing how many sent

**3. Files to create/edit**
- Copy uploaded image to `public/images/holi-2026.png`
- Create `src/pages/HoliGreeting.tsx` — public greeting page
- Create `src/components/admin/HoliBulkShare.tsx` — bulk share tool
- Edit `src/App.tsx` — add `/holi` route
- Edit `src/pages/AdminLayout.tsx` — add access to the share tool

### Flow
```text
Admin pastes numbers → clicks "Send Next" → WhatsApp opens with message →
admin hits send in WhatsApp → comes back → clicks "Send Next" for next number
```

**Message template:**
> 🎨 Wishing you a Colorful & Joyful Holi! 🎉
> May your journeys be filled with vibrant colors & happy memories.
> Happy Holi from Team GrabYourCar! 🚗
> 👉 grabyourcar.lovable.app/holi

