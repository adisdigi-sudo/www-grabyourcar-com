import { isSensitivePreviewRouteWindow } from "@/lib/adminPreviewStability";

export const DEV_SERVER_STATUS_EVENT = "lovable:dev-server-status";
export const DEV_SERVER_PENDING_RELOAD_KEY = "lovable_dev_server_pending_reload";
export const DEV_SERVER_LAST_RELOAD_KEY = "lovable_dev_server_last_reload";

declare global {
  interface Window {
    __lovableDevReloadGuardInstalled?: boolean;
  }
}

const dispatchUpdateReady = () => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(DEV_SERVER_STATUS_EVENT, {
      detail: { status: "update_ready" as const },
    }),
  );
};

export const clearPendingReloadFlag = () => {
  try {
    sessionStorage.removeItem(DEV_SERVER_PENDING_RELOAD_KEY);
  } catch {
    // ignore storage failures
  }
};

export const markDevServerPendingReload = () => {
  try {
    sessionStorage.setItem(DEV_SERVER_PENDING_RELOAD_KEY, "1");
  } catch {
    // ignore storage failures
  }
};

const tryPatchReload = (target: object, reload: () => void) => {
  try {
    Object.defineProperty(target, "reload", {
      configurable: true,
      writable: true,
      value: reload,
    });
    return true;
  } catch {
    try {
      (target as { reload?: () => void }).reload = reload;
      return (target as { reload?: () => void }).reload === reload;
    } catch {
      return false;
    }
  }
};

export const installSensitiveRouteReloadGuard = () => {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  if (window.__lovableDevReloadGuardInstalled) return;

  window.__lovableDevReloadGuardInstalled = true;

  try {
    const originalReload = window.location.reload.bind(window.location);
    const guardedReload = () => {
      try {
        if (!isSensitivePreviewRouteWindow()) {
          originalReload();
          return;
        }

        markDevServerPendingReload();
        dispatchUpdateReady();

        console.info("[DevReloadGuard] Prevented forced reload on sensitive preview route", {
          href: window.location.href,
          pathname: window.location.pathname,
        });
      } catch (err) {
        console.warn("[DevReloadGuard] Error in guarded reload, falling back", err);
        try { originalReload(); } catch { /* last resort */ }
      }
    };

    const locationPrototype = Object.getPrototypeOf(window.location);
    const patched =
      tryPatchReload(window.location, guardedReload) ||
      (locationPrototype ? tryPatchReload(locationPrototype, guardedReload) : false);

    if (!patched) {
      console.warn("[DevReloadGuard] Failed to patch window.location.reload; forced Vite reloads may still occur.");
    }

    // Fallback: intercept beforeunload to catch Vite-triggered navigations
    window.addEventListener("beforeunload", (e) => {
      try {
        if (isSensitivePreviewRouteWindow()) {
          markDevServerPendingReload();
          dispatchUpdateReady();
          e.preventDefault();
          e.returnValue = "";
        }
      } catch {
        // silently ignore
      }
    });
  } catch (err) {
    console.warn("[DevReloadGuard] Failed to install reload guard", err);
  }
};
