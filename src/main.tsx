import { Suspense, lazy, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import {
  isDynamicImportError,
  recoverFromChunkLoadError,
} from "@/lib/chunkLoadRecovery";

const handleDynamicImportFailure = (error: unknown) => {
  if (!isDynamicImportError(error)) return;
  console.warn("[ChunkRecovery] Dynamic import error detected, attempting recovery:", error);
  recoverFromChunkLoadError("global_chunk_recovery");
};

const LazyApp = lazy(() => import("./App"));

const SafeTelemetry = () => {
  const [telemetry, setTelemetry] = useState<null | {
    Analytics: React.ComponentType;
    SpeedInsights: React.ComponentType;
  }>(null);

  useEffect(() => {
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

  if (!telemetry) return null;

  const { Analytics, SpeedInsights } = telemetry;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
};

window.addEventListener(
  "error",
  (event) => {
    if (event.filename && (event.filename.endsWith(".js") || event.filename.endsWith(".mjs"))) {
      handleDynamicImportFailure(event.error ?? event.message);
    }
  },
  true
);

window.addEventListener("unhandledrejection", (event) => {
  if (isDynamicImportError(event.reason)) {
    console.warn("[ChunkRecovery] Unhandled rejection from dynamic import:", event.reason);
    handleDynamicImportFailure(event.reason);
  }
});

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  console.warn("[ChunkRecovery] Vite preload error detected, attempting recovery.");
  recoverFromChunkLoadError("global_chunk_recovery");
});

// Block search-engine indexing on .lovable.app domains
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

const root = createRoot(rootElement);

const BootstrapFailure = ({ canRetry }: { canRetry: boolean }) => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
    <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Page failed to start</h1>
        <p className="text-sm text-muted-foreground">
          We hit a loading problem before the app could open.
          {canRetry ? " Refresh once to load the latest version." : " Please reopen the site in a fresh tab."}
        </p>
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Refresh page
      </button>
    </div>
  </div>
);

const BootstrapLoading = () => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      <p className="text-sm text-muted-foreground">Loading the latest version…</p>
    </div>
  </div>
);

const renderBootstrapFailure = (error: unknown) => {
  const canRetry = isDynamicImportError(error) && recoverFromChunkLoadError("bootstrap_chunk_recovery", 2);

  console.error("[Bootstrap] App failed before mount", {
    error,
    href: window.location.href,
    hostname: window.location.hostname,
    canRetry,
  });

  if (canRetry) return;

  root.render(
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <BootstrapFailure canRetry={false} />
      </ThemeProvider>
    </HelmetProvider>
  );
};

try {
  root.render(
    <AppErrorBoundary>
      <HelmetProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Suspense fallback={<BootstrapLoading />}>
            <LazyApp />
            <SafeTelemetry />
          </Suspense>
        </ThemeProvider>
      </HelmetProvider>
    </AppErrorBoundary>
  );
} catch (error) {
  renderBootstrapFailure(error);
}
