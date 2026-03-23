import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import App from "./App";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { isDynamicImportError, recoverFromChunkLoadError } from "@/lib/chunkLoadRecovery";

let hasTriggeredChunkRecovery = false;

const attemptChunkRecovery = (error: unknown, source: string) => {
  if (hasTriggeredChunkRecovery || !isDynamicImportError(error)) {
    return false;
  }

  hasTriggeredChunkRecovery = recoverFromChunkLoadError();

  if (hasTriggeredChunkRecovery) {
    console.warn("[Bootstrap] Attempting chunk recovery", { source, error });
  }

  return hasTriggeredChunkRecovery;
};

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    attemptChunkRecovery(event.error ?? event.message, "window.error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    attemptChunkRecovery(event.reason, "window.unhandledrejection");
  });
}

const SafeTelemetry = () => {
  const [telemetry, setTelemetry] = useState<null | {
    Analytics: React.ComponentType;
    SpeedInsights: React.ComponentType;
  }>(null);

  useEffect(() => {
    if (import.meta.env.DEV) {
      return;
    }

    let cancelled = false;

    Promise.all([
      import("@vercel/analytics/react"),
      import("@vercel/speed-insights/react"),
    ])
      .then(([analyticsModule, speedInsightsModule]) => {
        if (cancelled) return;

        setTelemetry({
          Analytics: analyticsModule.Analytics,
          SpeedInsights: speedInsightsModule.SpeedInsights,
        });
      })
      .catch((error) => {
        console.warn("[Bootstrap] Telemetry disabled after startup failure", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (import.meta.env.DEV || !telemetry) return null;

  const { Analytics, SpeedInsights } = telemetry;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
};

try {
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
  console.warn("[Bootstrap] Failed to append robots meta tag", error);
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found");
}

createRoot(rootElement).render(
  <AppErrorBoundary>
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
        <SafeTelemetry />
      </ThemeProvider>
    </HelmetProvider>
  </AppErrorBoundary>
);
