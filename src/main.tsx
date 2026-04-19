import { createRoot } from "react-dom/client";
import "./index.css";
import { installSensitiveRouteReloadGuard } from "@/lib/devReloadGuard";
import { ensureAppRootElement } from "@/lib/ensureAppRoot";
import { ensureStartupShell } from "@/lib/startupShell";
import { installStartupShellHealthMonitor } from "@/lib/startupShell";
import { removeStartupShell } from "@/lib/startupShell";
import { promoteStartupShellToRecovery } from "@/lib/startupShell";

try {
  ensureStartupShell();
  installSensitiveRouteReloadGuard();
  installStartupShellHealthMonitor();

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
  console.warn("[Bootstrap] Failed during startup shell init", error);
}

const rootElement = ensureAppRootElement();

if (!rootElement) {
  throw new Error("Root element #root was not found");
}

const bootApplication = async () => {
  const [
    { HelmetProvider },
    { AppErrorBoundary },
    { BootstrapRuntime },
    { ThemeProvider },
    { default: App },
  ] = await Promise.all([
    import("react-helmet-async"),
    import("@/components/AppErrorBoundary"),
    import("@/components/bootstrap/BootstrapRuntime"),
    import("@/components/theme/ThemeProvider"),
    import("./App"),
  ]);

  createRoot(rootElement).render(
    <AppErrorBoundary>
      <HelmetProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <App />
          <BootstrapRuntime onReady={removeStartupShell} />
        </ThemeProvider>
      </HelmetProvider>
    </AppErrorBoundary>
  );
};

bootApplication().catch((error) => {
  console.error("[Bootstrap] App boot failed", error);
  ensureStartupShell();
  promoteStartupShellToRecovery("App boot start ho gaya tha, but bundle ya startup render fail hua. White screen ke bajaye recovery dikh rahi hai.");
});
