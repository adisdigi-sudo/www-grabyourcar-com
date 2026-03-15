
Goal: fix the persistent Google Search favicon issue (old icon still showing) and keep OG image aligned with your uploaded brand mark.

What I found (root causes)
- Your current icon files in `public/` all visually contain the correct circular car logo, but they are effectively the same source image reused across all filenames.
- The current favicon assets are not standards-compliant for search crawlers:
  - `favicon.ico` is being served as PNG bytes (not a true ICO container).
  - Icon files like `icon-192.png` / `icon-512.png` appear to still be the same small source dimensions, not true 192/512 outputs.
- Google favicon selection is strict; invalid icon formats/sizes often keep old cached icons in Search even when browser tabs update.

Implementation plan
1. Rebuild a proper favicon set from your uploaded logo (not just renaming/copying one PNG):
   - `public/favicon.ico` (real ICO with 16/32/48)
   - `public/favicon-16x16.png`
   - `public/favicon-32x32.png`
   - `public/favicon-48x48.png`
   - `public/apple-touch-icon.png` (180x180)
   - `public/icon-192.png` (192x192)
   - `public/icon-512.png` (512x512)

2. Keep OG image “only” from your provided mark but make it crawler-safe:
   - Regenerate `public/og-image.png` at 1200x630 with your uploaded logo centered (no random branding text unless you want it).
   - Keep your logo exactly as provided, just on correct OG canvas size.

3. Update head tags in `index.html` to standard favicon declarations:
   - Add explicit `rel="icon"` entries for 16/32/48 PNG + `rel="icon" href="/favicon.ico" sizes="any"`.
   - Keep Apple touch + manifest links.
   - Bump version params once (e.g. `v=4`) for browser cache busting.

4. Update `public/site.webmanifest`:
   - Ensure `icons` entries point to actual 192 and 512 files with correct dimensions.
   - Keep consistent naming with the files created above.

5. Keep SEO image defaults consistent:
   - Update any default OG path references (e.g. in `GlobalSEO.tsx`) to the same new versioned OG asset so homepage and dynamic pages don’t diverge.

Validation plan (after implementation)
- Verify local project assets visually:
  - `public/favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `icon-192.png`, `icon-512.png`, `og-image.png`.
- Verify live URLs return the new files:
  - `/favicon.ico`, `/favicon-48x48.png`, `/icon-192.png`, `/og-image.png`.
- Verify Google-facing fetch endpoint:
  - `https://www.google.com/s2/favicons?sz=64&domain=grabyourcar.com`
- Confirm both domains if used (`grabyourcar.com` and `www.grabyourcar.com`) resolve the same favicon files.

Technical details
- Files to edit: `index.html`, `public/site.webmanifest`, `src/components/seo/GlobalSEO.tsx`
- Files to replace/create: favicon/OG assets listed above in `public/`
- No backend/database changes required.

Important expectation
- After this standards-compliant fix, browser/tab icon should update immediately after publish.
- Google Search icon can still lag due crawl cache, but this removes the technical blockers causing prolonged stale favicon behavior.
