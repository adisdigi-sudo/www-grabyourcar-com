
Goal: white page ko deep fix karna, restore ke baad backend mismatch risk ko handle karna, aur message-send failures ko non-crashing banana.

What I found
- Restore se backend data/table/secrets normally “kharab” nahi hote. Data, secrets, storage, applied DB migrations usually wahi rehte hain.
- Real risk: restored frontend code + existing backend/schema mismatch. Isse blank screen, stuck loading, ya send failures aa sakte hain.
- White page ka root issue Vite-only nahi lag raha. Current code me startup stall ke 4 strong points hain:
  1. `src/components/app/RouteProviderGate.tsx` login routes (`/crm-auth`, `/crm-reset-password`) ko bhi admin experience treat karke `VerticalProvider` mount kar raha hai.
  2. `src/hooks/useVerticalAccess.tsx` login/auth screens par bhi multiple queries chala raha hai, aur active workspace resolution ke liye wait karta hai.
  3. `src/pages/AdminLayout.tsx` auth + vertical bootstrap pe heavily depend karta hai; timeout se pehle user ko blank/spinner state mil sakti hai.
  4. `src/components/bootstrap/BootstrapRuntime.tsx` sensitive route reload guard stale state ko hide kar raha ho sakta hai, so reload ke baad safe recovery ke bajaye stuck screen bachi rehti hai.
- Messaging side me `supabase/functions/whatsapp-send/index.ts` abhi `502/500` return karta hai. Client libs (`src/lib/sendWhatsApp.ts`, `src/lib/omniSend.ts`) invoke error pe throw karte hain. Isse send UX brittle ho jata hai.

Do I know what the issue is?
- Haan, enough confidence hai ki primary issue frontend bootstrap/auth-routing stall hai, not backend corruption.
- Secondary issue message pipeline ka hard-fail behavior hai.

Implementation plan
1. Separate auth shell from CRM shell
- `/crm-auth` aur `/crm-reset-password` ko `VerticalProvider`/admin bootstrap path se bahar nikalunga.
- Login page ko minimal auth-only route banaunga so it loads even if vertical/workspace queries fail.
- Files: `src/App.tsx`, `src/components/app/RouteProviderGate.tsx`, `src/pages/AdminAuth.tsx`.

2. Make CRM startup fail-soft, not fail-blank
- `AdminLayout` ko “instant shell + deferred data” pattern pe shift karunga.
- Sidebar/frame first render hoga; heavy panels baad me load honge.
- Active vertical missing ho to hard blank nahi, explicit recovery card/chooser show hoga.
- Workspace resolution ko local cached vertical + guarded fallback ke saath simplify karunga.
- Files: `src/pages/AdminLayout.tsx`, `src/hooks/useVerticalAccess.tsx`, related admin shell imports.

3. Fix auth bootstrap deadlocks
- `useAuth.tsx` me cached session fallback aur bootstrap completion flow ko tighten karunga so login/restore ke baad app indefinite loading me na rahe.
- Auth timeout ke baad route-aware fallback dunga: login route login UI dikhaye, CRM route recovery UI dikhaye.
- File: `src/hooks/useAuth.tsx`.

4. Rework dev-reload protection logic
- Sensitive routes par forced reload block rahega, but stale state silently clear nahi hoga.
- “Update ready / reconnect detected” banner reliable banega, so blank page ke badle explicit recovery mile.
- Chunk/dev-server recovery flags ko simplify karunga.
- Files: `src/components/bootstrap/BootstrapRuntime.tsx`, `src/lib/chunkLoadRecovery.ts`, `src/lib/adminPreviewStability.ts`.

5. Harden message send path
- `whatsapp-send` ko structured JSON responses par shift karunga: non-critical provider failures par 200 + `{ success:false, fallback:true/error }`.
- Client send helpers hard throw ke bajaye graceful result return karenge.
- Same pattern omni send me bhi apply karunga.
- Files: `supabase/functions/whatsapp-send/index.ts`, possibly `supabase/functions/omni-channel-send/index.ts`, `src/lib/sendWhatsApp.ts`, `src/lib/omniSend.ts`, `src/lib/crmMessageTemplates.ts`.

6. Add targeted diagnostics, not guesswork
- Auth bootstrap, active vertical resolution, CRM mount, and send pipeline par short structured logs add karunga.
- Isse next failure exact point pe trace ho jayega without random retries.

7. Verification after implementation
- Test 1: `/crm-auth` should open instantly after restore.
- Test 2: login -> workspace -> `/crm` should never show white page; worst case recovery card.
- Test 3: dev reconnect/reload during CRM work should not blank out the screen.
- Test 4: one WhatsApp send + one omni send should fail gracefully with toast/result, not crash UI.

Technical notes
- Restore se DB schema/data automatically rollback nahi hota; isi liye frontend-backend mismatch ko absorb karne ke liye fail-soft guards zaroori hain.
- Main focus backend badalna nahi, startup shell aur error handling ko robust banana hai.
- Messaging fix ka purpose yeh hai ki provider/API error se frontend unstable na ho.

Likely files to update
- `src/App.tsx`
- `src/components/app/RouteProviderGate.tsx`
- `src/hooks/useAuth.tsx`
- `src/hooks/useVerticalAccess.tsx`
- `src/pages/AdminAuth.tsx`
- `src/pages/AdminLayout.tsx`
- `src/components/bootstrap/BootstrapRuntime.tsx`
- `src/lib/chunkLoadRecovery.ts`
- `src/lib/adminPreviewStability.ts`
- `src/lib/sendWhatsApp.ts`
- `src/lib/omniSend.ts`
- `supabase/functions/whatsapp-send/index.ts`
- maybe `supabase/functions/omni-channel-send/index.ts`

Expected outcome
- Restore ke baad backend safe rahega, aur frontend mismatch ki wajah se white page nahi aayega.
- Login screen independent hogi.
- CRM boot always visible recovery path dega.
- Message sending errors app ko break nahi karenge.
