import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import App from "./App";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { BootstrapRuntime } from "@/components/bootstrap/BootstrapRuntime";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { installSensitiveRouteReloadGuard } from "@/lib/devReloadGuard";
import { ensureAppRootElement } from "@/lib/ensureAppRoot";
import { shouldStabilizeStartupShellWindow } from "@/lib/adminPreviewStability";
import {
  ensureStartupShell,
  installStartupShellHealthMonitor,
  removeStartupShell,
} from "@/lib/startupShell";

try {
  installSensitiveRouteReloadGuard();
  if (shouldStabilizeStartupShellWindow()) {
    installStartupShellHealthMonitor();
    ensureStartupShell();
  }

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
