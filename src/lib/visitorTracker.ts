/**
 * Visitor Tracker — custom analytics for GrabYourCar.
 *
 * IMPORTANT: All tracking calls are fire-and-forget. They MUST never block
 * UI rendering, never throw, and never propagate errors to the page. If the
 * backend is slow/unreachable or RLS rejects an insert, the site continues
 * to work seamlessly.
 */
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "gyc_visitor_session";
const VISITOR_KEY = "gyc_visitor_id";
const SESSION_TS = "gyc_visitor_session_ts";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

let currentPagePath: string | null = null;
let currentPageEnteredAt = 0;
// Client-generated id so we can update without needing SELECT permission.
let currentPageViewClientId: string | null = null;
let maxScrollDepth = 0;
let sessionStartedAt = 0;
let pageCount = 0;

const safe = (fn: () => Promise<unknown> | unknown) => {
  try {
    const r = fn();
    if (r && typeof (r as Promise<unknown>).then === "function") {
      (r as Promise<unknown>).catch(() => {
        /* swallow */
      });
    }
  } catch {
    /* swallow */
  }
};

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreate(key: string, prefix: string): string {
  if (typeof window === "undefined") return uid(prefix);
  try {
    let v = window.localStorage.getItem(key);
    if (!v) {
      v = uid(prefix);
      window.localStorage.setItem(key, v);
    }
    return v;
  } catch {
    return uid(prefix);
  }
}

export function getVisitorId(): string {
  return getOrCreate(VISITOR_KEY, "v");
}

export function getSessionKey(): string {
  if (typeof window === "undefined") return uid("s");
  try {
    const tsRaw = window.sessionStorage.getItem(SESSION_TS);
    const lastTs = tsRaw ? parseInt(tsRaw, 10) : 0;
    const now = Date.now();
    let key = window.sessionStorage.getItem(SESSION_KEY);
    if (!key || now - lastTs > SESSION_TIMEOUT_MS) {
      key = uid("s");
      window.sessionStorage.setItem(SESSION_KEY, key);
    }
    window.sessionStorage.setItem(SESSION_TS, String(now));
    return key;
  } catch {
    return uid("s");
  }
}

function detectSource(referrer: string, urlParams: URLSearchParams) {
  const utm_source = urlParams.get("utm_source") || undefined;
  const utm_medium = urlParams.get("utm_medium") || undefined;
  const utm_campaign = urlParams.get("utm_campaign") || undefined;
  const gclid = urlParams.get("gclid");
  const fbclid = urlParams.get("fbclid");

  if (utm_source) {
    return { source: utm_source, medium: utm_medium || "cpc", utm_source, utm_medium, utm_campaign };
  }
  if (gclid) return { source: "google", medium: "cpc", utm_source: "google", utm_medium: "cpc" };
  if (fbclid) return { source: "facebook", medium: "cpc", utm_source: "facebook", utm_medium: "cpc" };

  if (!referrer) return { source: "direct", medium: "(none)" };

  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes("google.")) return { source: "google", medium: "organic" };
    if (host.includes("bing.") || host.includes("duckduckgo.")) return { source: host.split(".")[0], medium: "organic" };
    if (host.includes("facebook.") || host.includes("fb.")) return { source: "facebook", medium: "social" };
    if (host.includes("instagram.")) return { source: "instagram", medium: "social" };
    if (host.includes("youtube.")) return { source: "youtube", medium: "social" };
    if (host.includes("whatsapp.") || host.includes("wa.me")) return { source: "whatsapp", medium: "social" };
    if (host.includes("linkedin.")) return { source: "linkedin", medium: "social" };
    if (host.includes("twitter.") || host.includes("t.co") || host.includes("x.com"))
      return { source: "twitter", medium: "social" };
    if (host.includes("grabyourcar")) return { source: "internal", medium: "internal" };
    return { source: host.replace(/^www\./, ""), medium: "referral" };
  } catch {
    return { source: "direct", medium: "(none)" };
  }
}

function detectDevice(ua: string) {
  const lower = ua.toLowerCase();
  let device_type: string;
  if (/mobile|iphone|android.*mobile/.test(lower)) device_type = "mobile";
  else if (/tablet|ipad/.test(lower)) device_type = "tablet";
  else device_type = "desktop";

  let browser = "other";
  if (lower.includes("edg/")) browser = "edge";
  else if (lower.includes("chrome/")) browser = "chrome";
  else if (lower.includes("safari/") && !lower.includes("chrome/")) browser = "safari";
  else if (lower.includes("firefox/")) browser = "firefox";

  let os = "other";
  if (lower.includes("windows")) os = "windows";
  else if (lower.includes("mac os")) os = "macos";
  else if (lower.includes("android")) os = "android";
  else if (lower.includes("iphone") || lower.includes("ipad")) os = "ios";
  else if (lower.includes("linux")) os = "linux";

  return { device_type, browser, os };
}

let sessionInitialized = false;

function ensureSession(): void {
  if (sessionInitialized || typeof window === "undefined") return;
  sessionInitialized = true;

  safe(async () => {
    const sessionKey = getSessionKey();
    const visitorId = getVisitorId();
    const initFlag = `${sessionKey}_init`;
    try {
      if (window.sessionStorage.getItem(initFlag) === "1") return;
    } catch {
      /* ignore */
    }

    const params = new URLSearchParams(window.location.search);
    const src = detectSource(document.referrer || "", params);
    const dev = detectDevice(navigator.userAgent);

    sessionStartedAt = Date.now();

    const { error } = await supabase.from("visitor_sessions").insert({
      session_key: sessionKey,
      visitor_id: visitorId,
      source: src.source,
      medium: src.medium,
      campaign: src.utm_campaign || null,
      referrer: document.referrer || null,
      landing_page: window.location.pathname + window.location.search,
      utm_source: src.utm_source || null,
      utm_medium: src.utm_medium || null,
      utm_campaign: src.utm_campaign || null,
      utm_term: params.get("utm_term") || null,
      utm_content: params.get("utm_content") || null,
      device_type: dev.device_type,
      browser: dev.browser,
      os: dev.os,
      user_agent: navigator.userAgent.slice(0, 500),
      page_count: 0,
      total_time_seconds: 0,
      is_bounced: true,
    });

    if (!error) {
      try {
        window.sessionStorage.setItem(initFlag, "1");
      } catch {
        /* ignore */
      }
    }
  });
}

function flushPageView() {
  if (!currentPagePath || !currentPageViewClientId) return;
  const timeSpent = Math.round((Date.now() - currentPageEnteredAt) / 1000);
  const sessionKey = getSessionKey();
  const clientId = currentPageViewClientId;
  const path = currentPagePath;
  const scroll = maxScrollDepth;

  safe(async () => {
    await supabase
      .from("visitor_page_views")
      .update({
        time_spent_seconds: timeSpent,
        scroll_depth: scroll,
        left_at: new Date().toISOString(),
      })
      .eq("session_key", sessionKey)
      .eq("client_id", clientId);
  });

  pageCount += 1;
  const totalTime = Math.round((Date.now() - sessionStartedAt) / 1000);
  safe(async () => {
    await supabase
      .from("visitor_sessions")
      .update({
        page_count: pageCount,
        total_time_seconds: totalTime,
        exit_page: path,
        last_active_at: new Date().toISOString(),
        is_bounced: pageCount <= 1 && totalTime < 15,
      })
      .eq("session_key", sessionKey);
  });
}

export function trackPageView(pathname: string, title?: string): void {
  if (typeof window === "undefined") return;
  ensureSession();

  if (currentPagePath === pathname) return;
  if (currentPagePath && currentPagePath !== pathname) flushPageView();

  const sessionKey = getSessionKey();
  currentPagePath = pathname;
  currentPageEnteredAt = Date.now();
  maxScrollDepth = 0;
  if (sessionStartedAt === 0) sessionStartedAt = Date.now();

  const clientId = uid("pv");
  currentPageViewClientId = clientId;

  safe(async () => {
    await supabase.from("visitor_page_views").insert({
      session_key: sessionKey,
      page_path: pathname,
      page_title: title || document.title,
      time_spent_seconds: 0,
      scroll_depth: 0,
      client_id: clientId,
    });
  });
}

export function trackEvent(
  type: string,
  label?: string,
  metadata?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  ensureSession();
  const sessionKey = getSessionKey();
  safe(async () => {
    await supabase.from("visitor_events").insert({
      session_key: sessionKey,
      event_type: type,
      event_label: label || null,
      page_path: window.location.pathname,
      metadata: (metadata || {}) as never,
    });
  });
}

export function captureLead(payload: {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  source: string;
}): void {
  if (typeof window === "undefined") return;
  if (!payload.phone && !payload.email) return;
  ensureSession();
  const sessionKey = getSessionKey();
  const visitorId = getVisitorId();
  const params = new URLSearchParams(window.location.search);
  const src = detectSource(document.referrer || "", params);

  safe(async () => {
    await supabase.from("visitor_captured_leads").insert({
      session_key: sessionKey,
      visitor_id: visitorId,
      name: payload.name || null,
      phone: payload.phone || null,
      email: payload.email || null,
      message: payload.message || null,
      capture_source: payload.source,
      capture_page: window.location.pathname,
      source: src.source,
      utm_source: src.utm_source || null,
      utm_campaign: src.utm_campaign || null,
      pages_viewed: pageCount,
      time_on_site_seconds: Math.round((Date.now() - sessionStartedAt) / 1000),
    });
  });

  safe(async () => {
    await supabase
      .from("visitor_sessions")
      .update({
        captured_phone: payload.phone || null,
        captured_email: payload.email || null,
        captured_name: payload.name || null,
      })
      .eq("session_key", sessionKey);
  });
}

function setupScrollTracking() {
  if (typeof window === "undefined") return;
  const onScroll = () => {
    const h = document.documentElement;
    const scrolled = h.scrollTop + window.innerHeight;
    const total = h.scrollHeight;
    if (total <= 0) return;
    const pct = Math.min(100, Math.round((scrolled / total) * 100));
    if (pct > maxScrollDepth) maxScrollDepth = pct;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
}

function setupUnloadFlush() {
  if (typeof window === "undefined") return;
  const flush = () => {
    try {
      if (currentPagePath && currentPageViewClientId) flushPageView();
    } catch {
      /* ignore */
    }
  };
  window.addEventListener("beforeunload", flush);
  window.addEventListener("pagehide", flush);
}

let booted = false;
export function bootVisitorTracker() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  // Defer all setup off the critical path
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void })
    .requestIdleCallback;
  const run = () => {
    ensureSession();
    setupScrollTracking();
    setupUnloadFlush();
  };
  if (typeof idle === "function") idle(run);
  else window.setTimeout(run, 1500);
}
