const SENSITIVE_PREVIEW_ROUTE_PREFIXES = ["/crm", "/admin", "/workspace", "/document-viewer"];

export const isSensitivePreviewRoutePath = (pathname: string) =>
  SENSITIVE_PREVIEW_ROUTE_PREFIXES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

export const isEmbeddedPreviewWindow = () => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.top !== window;
  } catch {
    return false;
  }
};

export const isSensitivePreviewRouteWindow = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const { hostname, pathname } = window.location;
  return hostname.startsWith("admin.") || isSensitivePreviewRoutePath(pathname);
};

export const shouldStabilizeStartupShellWindow = () =>
  isSensitivePreviewRouteWindow() || isEmbeddedPreviewWindow();

export const shouldAvoidDevAutoReload = () => import.meta.env.DEV && isSensitivePreviewRouteWindow();