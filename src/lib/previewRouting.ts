const PREVIEW_QUERY_PARAM_PREFIX = "__lovable";

// Internal cache-bust / recovery params that should never appear in the user-visible URL.
// These are added by chunk-load recovery, dev tooling, etc. We strip them on app boot.
const INTERNAL_TRANSIENT_PARAMS = ["__v"];

/**
 * Removes internal transient query params (e.g. `__v` cache-buster from chunk recovery)
 * from the current URL using history.replaceState — silent, no navigation.
 * Safe to call multiple times.
 */
export const stripInternalTransientParams = () => {
  if (typeof window === "undefined") return;

  try {
    const url = new URL(window.location.href);
    let changed = false;

    INTERNAL_TRANSIENT_PARAMS.forEach((key) => {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    });

    if (changed) {
      const newUrl = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState(window.history.state, "", newUrl);
    }
  } catch {
    // ignore — non-fatal cosmetic cleanup
  }
};

export const appendPreviewQueryParams = (targetUrl: URL, sourceUrl = window.location.href) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const currentUrl = new URL(sourceUrl, window.location.origin);

    currentUrl.searchParams.forEach((value, key) => {
      if (key.startsWith(PREVIEW_QUERY_PARAM_PREFIX) && !targetUrl.searchParams.has(key)) {
        targetUrl.searchParams.set(key, value);
      }
    });
  } catch {
    // ignore malformed preview urls and fall back to plain routing
  }
};

export const withPreviewParams = (target: string) => {
  if (typeof window === "undefined") {
    return target;
  }

  try {
    const targetUrl = new URL(target, window.location.origin);
    appendPreviewQueryParams(targetUrl);
    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  } catch {
    return target;
  }
};