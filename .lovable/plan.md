
What I found

- `vite.config.ts` is not the source of the issue. It contains Vite/dev-server/build settings only — no security headers.
- The header risk is in `vercel.json`, which applies:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection: 1; mode=block`
- Of these, the dangerous one for an editor/iframe workflow is `X-Frame-Options: DENY`. If the app is rendered inside an iframe, that can block it.
- But the stronger root cause in this project appears to be the app’s own recovery logic:
  - `src/main.tsx` always installs the startup shell
  - `src/lib/adminPreviewStability.ts` treats embedded preview windows as “stabilized”
  - `src/lib/startupShell.ts` keeps a full-screen recovery shell until DOM heuristics say the app is “ready”
  - session replay shows the “Dev connection lost / CRM shell active” path fired on `/workspace`

So this looks like a combination of:
1. A potentially iframe-hostile header setup
2. An over-aggressive blank-screen recovery system that is now trapping the preview

Different approach

Instead of adding more recovery patches, I would simplify the system:

- Make embedded editor preview “fail open”, not “fail closed”
- Stop using the global full-screen startup shell inside the editor iframe
- Keep loading/error handling local to `/workspace` and admin pages
- Relax iframe-blocking headers only where embedding is required

Implementation plan

1. Reduce the blast radius of the startup shell
- Update `src/lib/adminPreviewStability.ts`
- Change `shouldStabilizeStartupShellWindow()` so embedded editor previews do not trigger the global shell/recovery behavior
- Keep shell protection only for true top-level sensitive/admin contexts if still needed

2. Simplify boot/reconnect behavior
- Update `src/main.tsx`
- Gate `ensureStartupShell()` and `installStartupShellHealthMonitor()` behind the stricter rule
- Update `src/lib/startupShell.ts` and `src/components/bootstrap/BootstrapRuntime.tsx`
- Remove the embedded-preview dependency on DOM “app ready” heuristics and reconnect recovery overlays

3. Keep page-level recovery only
- Leave `WorkspaceSelector.tsx` responsible for its own loading / timeout / retry UI
- If needed, do the same pattern in the CRM shell instead of one global white overlay controller

4. Fix the header strategy
- Update `vercel.json`
- Remove blanket `X-Frame-Options: DENY` from routes/environments that must render in an iframe
- Prefer a scoped `Content-Security-Policy: frame-ancestors ...` approach if embedding allowlists are needed
- Keep `X-Content-Type-Options: nosniff`
- Remove deprecated `X-XSS-Protection`

5. Validate after implementation
- Check `/workspace` in embedded preview
- Check `/workspace` in standalone tab
- Confirm editing works again after reconnect
- Confirm no iframe-blocking headers are applied where preview/editor needs embedding

Expected result

- The blank white screen should stop because the editor preview will no longer get trapped behind the recovery shell
- Security remains intact, but without using an iframe-breaking global header
- The app becomes easier to debug because loading failures are handled locally instead of by a complex global recovery layer
