import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import App from "./App";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { isChunkLoadRecoveryExhausted, isDynamicImportError, recoverFromChunkLoadError, resetChunkLoadRecovery } from "@/lib/chunkLoadRecovery";
import { Loader2, WifiOff } from "lucide-react";

let hasTriggeredChunkRecovery = false;

const DEV_SERVER_STATUS_EVENT = "lovable:dev-server-status";
const CHUNK_RECOVERY_STATUS_EVENT = "lovable:chunk-recovery-status";
const DEV_SERVER_PENDING_RELOAD_KEY = "lovable_dev_server_pending_reload";
const DEV_SERVER_LAST_RELOAD_KEY = "lovable_dev_server_last_reload";
const DEV_SERVER_RELOAD_COOLDOWN_MS = 5000;

type ChunkRecoveryAttemptResult = "recovered" | "exhausted" | "ignored";

const dispatchChunkRecoveryStatus = (status: "recovering" | "exhausted", source: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(CHUNK_RECOVERY_STATUS_EVENT, {
      detail: { status, source },
    }),
  );
};

const attemptChunkRecovery = (error: unknown, source: string): ChunkRecoveryAttemptResult => {
  if (hasTriggeredChunkRecovery || !isDynamicImportError(error)) {
    return "ignored";
  }

  const recovered = recoverFromChunkLoadError();

  if (recovered) {
    hasTriggeredChunkRecovery = true;
    dispatchChunkRecoveryStatus("recovering", source);

    console.warn("[Bootstrap] Attempting chunk recovery", { source, error });
    return "recovered";
  }

  if (isChunkLoadRecoveryExhausted()) {
    dispatchChunkRecoveryStatus("exhausted", source);
    console.error("[Bootstrap] Chunk recovery attempts exhausted", { source, error });
    return "exhausted";
  }

  return "ignored";
};

const markDevServerPendingReload = () => {
  try {
    sessionStorage.setItem(DEV_SERVER_PENDING_RELOAD_KEY, "1");
  } catch {
    // ignore storage failures
  }
};

const reloadAfterDevServerRestart = () => {
  try {
    const hasPendingReload = sessionStorage.getItem(DEV_SERVER_PENDING_RELOAD_KEY) === "1";
    if (!hasPendingReload) return;

    const lastReloadAt = Number.parseInt(sessionStorage.getItem(DEV_SERVER_LAST_RELOAD_KEY) ?? "0", 10);
    if (!Number.isNaN(lastReloadAt) && Date.now() - lastReloadAt < DEV_SERVER_RELOAD_COOLDOWN_MS) {
      sessionStorage.removeItem(DEV_SERVER_PENDING_RELOAD_KEY);
      return;
    }

    sessionStorage.removeItem(DEV_SERVER_PENDING_RELOAD_KEY);
    sessionStorage.setItem(DEV_SERVER_LAST_RELOAD_KEY, String(Date.now()));

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("__v", Date.now().toString());
    window.location.replace(nextUrl.toString());
  } catch {
    window.location.reload();
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    const preloadEvent = event as Event & {
      payload?: unknown;
      preventDefault: () => void;
    };

    preloadEvent.preventDefault();

    const recoveryResult = attemptChunkRecovery(preloadEvent.payload, "window.vite:preloadError");

    if (recoveryResult === "ignored") {
      window.location.reload();
    }
  });

  window.addEventListener("error", (event) => {
    attemptChunkRecovery(event.error ?? event.message, "window.error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    attemptChunkRecovery(event.reason, "window.unhandledrejection");
  });
}

if (import.meta.hot && typeof window !== "undefined") {
  import.meta.hot.on("vite:ws:disconnect", () => {
    markDevServerPendingReload();
    window.dispatchEvent(
      new CustomEvent(DEV_SERVER_STATUS_EVENT, {
        detail: { status: "disconnected" as const },
      }),
    );
  });

  import.meta.hot.on("vite:ws:connect", () => {
    window.dispatchEvent(
      new CustomEvent(DEV_SERVER_STATUS_EVENT, {
        detail: { status: "connected" as const },
      }),
    );

    window.setTimeout(() => {
      reloadAfterDevServerRestart();
    }, 150);
  });

  import.meta.hot.on("vite:beforeFullReload", () => {
    markDevServerPendingReload();
    window.dispatchEvent(
      new CustomEvent(DEV_SERVER_STATUS_EVENT, {
        detail: { status: "reloading" as const },
      }),
    );
  });
}

const DevServerStatusOverlay = () => {
  const [status, setStatus] = useState<"idle" | "disconnected" | "connected" | "reloading">("idle");

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") {
      return;
    }

    let connectedTimer: number | null = null;

    const handleStatus = (event: Event) => {
      const nextStatus = (event as CustomEvent<{ status?: "disconnected" | "connected" | "reloading" }>).detail?.status;
      if (!nextStatus) return;

      setStatus(nextStatus);

      if (connectedTimer) {
        window.clearTimeout(connectedTimer);
        connectedTimer = null;
      }

      if (nextStatus === "connected") {
        connectedTimer = window.setTimeout(() => setStatus("idle"), 1200);
      }
    };

    window.addEventListener(DEV_SERVER_STATUS_EVENT, handleStatus as EventListener);

    return () => {
      window.removeEventListener(DEV_SERVER_STATUS_EVENT, handleStatus as EventListener);
      if (connectedTimer) {
        window.clearTimeout(connectedTimer);
      }
    };
  }, []);

  if (!import.meta.env.DEV || status === "idle") return null;

  const copy =
    status === "disconnected"
      ? {
          title: "Reconnecting preview",
          description: "The dev server restarted while applying changes. Your CRM will resume automatically.",
          icon: WifiOff,
        }
      : status === "reloading"
        ? {
            title: "Refreshing latest changes",
            description: "Reloading the newest CRM bundle now.",
            icon: Loader2,
          }
        : {
            title: "Preview restored",
            description: "Connection recovered successfully.",
            icon: Loader2,
          };

  const Icon = copy.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 px-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center text-card-foreground shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className={`h-6 w-6 ${status !== "disconnected" ? "animate-spin" : ""}`} />
        </div>
        <h2 className="text-lg font-semibold">{copy.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
      </div>
    </div>
  );
};

const ChunkRecoveryOverlay = () => {
  const [recoverySource, setRecoverySource] = useState<string | null>(() =>
    typeof window !== "undefined" && isChunkLoadRecoveryExhausted() ? "startup" : null,
  );

  useEffect(() => {
    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: "recovering" | "exhausted"; source?: string }>).detail;

      if (detail?.status === "exhausted") {
        setRecoverySource(detail.source ?? "runtime");
        return;
      }

      if (detail?.status === "recovering") {
        setRecoverySource(null);
      }
    };

    window.addEventListener(CHUNK_RECOVERY_STATUS_EVENT, handleStatus as EventListener);

    return () => {
      window.removeEventListener(CHUNK_RECOVERY_STATUS_EVENT, handleStatus as EventListener);
    };
  }, []);

  if (!recoverySource) {
    return null;
  }

  const handleManualRefresh = () => {
    resetChunkLoadRecovery();

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("__v", Date.now().toString());
    window.location.replace(nextUrl.toString());
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/95 px-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center text-card-foreground shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <WifiOff className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold">Latest update got stuck</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We stopped the auto-reload loop so the screen does not go blank again. Refresh once to load a clean bundle.
        </p>
        <button
          type="button"
          onClick={handleManualRefresh}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Reload safely
        </button>
      </div>
    </div>
  );
};

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
        <DevServerStatusOverlay />
        <ChunkRecoveryOverlay />
      </ThemeProvider>
    </HelmetProvider>
  </AppErrorBoundary>
);
