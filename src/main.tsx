import { createRoot } from "react-dom/client";
import "./index.css";
import { installSensitiveRouteReloadGuard } from "@/lib/devReloadGuard";
import { ensureAppRootElement } from "@/lib/ensureAppRoot";

// Permanently remove the initial HTML loader once React takes over (or on error).
const removeInitialLoader = () => {
  if (typeof document === "undefined") return;
  ["gyc-initial-loader", "lovable-startup-shell", "lovable-dev-preview-reconnect"].forEach((id) => {
    document.getElementById(id)?.remove();
  });
};

try {
  installSensitiveRouteReloadGuard();

  if (window.location.hostname.endsWith(".lovable.app")) {
    const existingNoindex = document.querySelector('meta[name="robots"]');
    if (!existingNoindex) {
      const noindex = document.createElement("meta");
      noindex.name = "robots";
      noindex.content = "noindex, nofollow";
      document.head.appendChild(noindex);
    }
  }
} catch (error) {
  console.warn("[Bootstrap] Non-fatal init error", error);
}

const rootElement = ensureAppRootElement();

if (!rootElement) {
  throw new Error("Root element #root was not found");
}

const bootApplication = async () => {
  const [
    { HelmetProvider },
    { AppErrorBoundary },
    { ThemeProvider },
    { default: App },
  ] = await Promise.all([
    import("react-helmet-async"),
    import("@/components/AppErrorBoundary"),
    import("@/components/theme/ThemeProvider"),
    import("./App"),
  ]);

  // React is about to render — strip the initial loader so we don't double-paint.
  removeInitialLoader();

  createRoot(rootElement).render(
    <AppErrorBoundary>
      <HelmetProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <App />
        </ThemeProvider>
      </HelmetProvider>
    </AppErrorBoundary>
  );
};

bootApplication().catch((error) => {
  console.error("[Bootstrap] App boot failed", error);
  // Replace the loader with a visible error + retry — never leave a blank screen.
  removeInitialLoader();
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#f8fafc;">
        <div style="max-width:420px;text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 10px 40px rgba(0,0,0,0.06);">
          <div style="width:48px;height:48px;border-radius:50%;background:#fee2e2;color:#dc2626;display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 16px;">!</div>
          <h1 style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 8px;">Failed to load the app</h1>
          <p style="font-size:14px;color:#64748b;margin:0 0 20px;">A loading issue occurred. Refresh once to try again.</p>
          <button onclick="window.location.reload()" style="background:#2563eb;color:#fff;border:0;padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">Reload page</button>
        </div>
      </div>
    `;
  }
});
