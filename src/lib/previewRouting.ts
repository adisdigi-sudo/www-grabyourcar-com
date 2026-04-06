const PREVIEW_QUERY_PARAM_PREFIX = "__lovable";

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