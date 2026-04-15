import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import App from "./App";
import { Button } from "@/components/ui/button";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { isChunkLoadRecoveryExhausted, isDynamicImportError, recoverFromChunkLoadError, resetChunkLoadRecovery } from "@/lib/chunkLoadRecovery";
import { Loader2, WifiOff } from "lucide-react";

let hasTriggeredChunkRecovery = false;

const DEV_SERVER_STATUS_EVENT = "lovable:dev-server-status";
const CHUNK_RECOVERY_STATUS_EVENT = "lovable:chunk-recovery-status";
const DEV_SERVER_UPDATE_READY_EVENT = "lovable:dev-server-update-ready";
const ROUTE_ACTIVITY_EVENT = "lovable:route-activity";
const DEV_SERVER_PENDING_RELOAD_KEY = "lovable_dev_server_pending_reload";
const DEV_SERVER_LAST_RELOAD_KEY = "lovable_dev_server_last_reload";
const DEV_SERVER_RELOAD_COOLDOWN_MS = 5000;
const SENSITIVE_PREVIEW_ROUTE_PREFIXES = ["/crm", "/admin", "/workspace", "/document-viewer"];

type ChunkRecoveryAttemptResult = "recovered" | "exhausted" | "ignored";
type UpdateReadyReason = "dev-server-restart" | "stale-bundle";

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

const isSensitivePreviewRoute = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const { hostname, pathname } = window.location;
  return hostname.startsWith("admin.") || SENSITIVE_PREVIEW_ROUTE_PREFIXES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
};

const clearPendingReloadFlag = () => {
  try {
    sessionStorage.removeItem(DEV_SERVER_PENDING_RELOAD_KEY);
  } catch {
    // ignore storage failures
  }
};

const dispatchUpdateReady = (reason: UpdateReadyReason) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(DEV_SERVER_UPDATE_READY_EVENT, {
      detail: { reason },
    }),
  );
};

const dispatchRouteActivity = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(ROUTE_ACTIVITY_EVENT, {
      detail: {
        pathname: window.location.pathname,
        sensitive: isSensitivePreviewRoute(),
      },
    }),
  );
};

const installRouteActivityListeners = () => {
  if (typeof window === "undefined") {
    return;
  }

  const patchedWindow = window as Window & { __lovableRouteActivityPatched?: boolean };
  if (patchedWindow.__lovableRouteActivityPatched) {
    return;
  }

  patchedWindow.__lovableRouteActivityPatched = true;

  const notifyRouteChange = () => {
    window.setTimeout(() => {
      dispatchRouteActivity();
    }, 0);
  };

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = ((...args) => {
    originalPushState(...args);
    notifyRouteChange();
  }) as typeof window.history.pushState;

  window.history.replaceState = ((...args) => {
    originalReplaceState(...args);
    notifyRouteChange();
  }) as typeof window.history.replaceState;

  window.addEventListener("popstate", notifyRouteChange);
  window.addEventListener("hashchange", notifyRouteChange);
};

const performSafeReload = () => {
  try {
    clearPendingReloadFlag();
    sessionStorage.setItem(DEV_SERVER_LAST_RELOAD_KEY, String(Date.now()));

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("__v", Date.now().toString());
    window.location.replace(nextUrl.toString());
  } catch {
    window.location.reload();
  }
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

const requestManualReloadIfNeeded = (reason: UpdateReadyReason) => {
  if (!import.meta.env.DEV || !isSensitivePreviewRoute() || typeof document === "undefined") {
    return false;
  }

  if (document.visibilityState !== "visible") {
    return false;
  }

  markDevServerPendingReload();
  dispatchUpdateReady(reason);
  return true;
};

const reloadAfterDevServerRestart = () => {
  try {
    const hasPendingReload = sessionStorage.getItem(DEV_SERVER_PENDING_RELOAD_KEY) === "1";
    if (!hasPendingReload) return;

    const lastReloadAt = Number.parseInt(sessionStorage.getItem(DEV_SERVER_LAST_RELOAD_KEY) ?? "0", 10);
    if (!Number.isNaN(lastReloadAt) && Date.now() - lastReloadAt < DEV_SERVER_RELOAD_COOLDOWN_MS) {
      clearPendingReloadFlag();
      return;
    }

    if (requestManualReloadIfNeeded("dev-server-restart")) {
      return;
    }

    performSafeReload();
  } catch {
    window.location.reload();
  }
};

if (typeof window !== "undefined") {
  installRouteActivityListeners();
  dispatchRouteActivity();

  window.addEventListener("vite:preloadError", (event) => {
    const preloadEvent = event as Event & {
      payload?: unknown;
      preventDefault: () => void;
    };

    preloadEvent.preventDefault();

    const recoveryResult = attemptChunkRecovery(preloadEvent.payload, "window.vite:preloadError");

    if (recoveryResult === "ignored") {
      if (requestManualReloadIfNeeded("stale-bundle")) {
        return;
      }

      performSafeReload();
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
  const [isSensitiveRoute, setIsSensitiveRoute] = useState(() => isSensitivePreviewRoute());
  const [status, setStatus] = useState<"idle" | "disconnected" | "connected" | "reloading" | "update_ready">(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") {
      return "idle";
    }

    try {
      return sessionStorage.getItem(DEV_SERVER_PENDING_RELOAD_KEY) === "1" && isSensitivePreviewRoute() ? "update_ready" : "idle";
    } catch {
      return "idle";
    }
  });
  const [updateReason, setUpdateReason] = useState<UpdateReadyReason>("dev-server-restart");

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
        connectedTimer = window.setTimeout(() => {
          setStatus((current) => (current === "connected" ? "idle" : current));
        }, 1200);
      }
    };

    const handleUpdateReady = (event: Event) => {
      const reason = (event as CustomEvent<{ reason?: UpdateReadyReason }>).detail?.reason;
      setUpdateReason(reason ?? "dev-server-restart");
      setStatus("update_ready");
    };

    const handleRouteActivity = (event: Event) => {
      const sensitive = (event as CustomEvent<{ sensitive?: boolean }>).detail?.sensitive ?? isSensitivePreviewRoute();
      setIsSensitiveRoute(sensitive);

      if (!sensitive) {
        clearPendingReloadFlag();
        setStatus("idle");
      }
    };

    window.addEventListener(DEV_SERVER_STATUS_EVENT, handleStatus as EventListener);
    window.addEventListener(DEV_SERVER_UPDATE_READY_EVENT, handleUpdateReady as EventListener);
    window.addEventListener(ROUTE_ACTIVITY_EVENT, handleRouteActivity as EventListener);

    return () => {
      window.removeEventListener(DEV_SERVER_STATUS_EVENT, handleStatus as EventListener);
      window.removeEventListener(DEV_SERVER_UPDATE_READY_EVENT, handleUpdateReady as EventListener);
      window.removeEventListener(ROUTE_ACTIVITY_EVENT, handleRouteActivity as EventListener);
      if (connectedTimer) {
        window.clearTimeout(connectedTimer);
      }
    };
  }, []);

  if (!import.meta.env.DEV || status === "idle" || !isSensitiveRoute) return null;

  const copy =
    status === "disconnected"
      ? {
          title: "Reconnecting preview",
          description: "The dev server restarted while applying changes. We are stabilizing your session.",
          icon: WifiOff,
        }
      : status === "reloading"
        ? {
            title: "Refreshing latest changes",
            description: "Preparing the newest CRM bundle now.",
            icon: Loader2,
          }
        : status === "update_ready"
          ? {
              title: "Reload blocked to protect your CRM work",
              description:
                updateReason === "stale-bundle"
                  ? "A stale admin bundle was detected. We stopped the automatic reload so the preview does not turn white again."
                  : "The dev server restarted while you were working in CRM. We stopped the forced reload so your screen does not blank out again.",
              icon: WifiOff,
            }
          : {
              title: "Preview restored",
              description: "Connection recovered successfully.",
              icon: Loader2,
            };

  const Icon = copy.icon;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[min(100%,28rem)] justify-end px-4 sm:px-0">
      <div className="pointer-events-auto w-full rounded-2xl border border-border bg-card/95 p-5 text-card-foreground shadow-lg backdrop-blur-md">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className={`h-6 w-6 ${status === "connected" || status === "reloading" ? "animate-spin" : ""}`} />
        </div>
        <h2 className="text-lg font-semibold">{copy.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
        {status === "update_ready" ? (
          <Button className="mt-5" onClick={performSafeReload}>
            Reload safely
          </Button>
        ) : null}
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
    performSafeReload();
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
