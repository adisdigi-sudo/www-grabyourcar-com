/**
 * Visitor Tracker — custom analytics for GrabYourCar.
 *
 * Captures: session, source/UTM, page views, time-on-page, scroll depth,
 * custom events, and exposes a global helper for popup lead capture.
 *
 * All writes hit the public `visitor_*` Supabase tables.
 * Admin dashboards read these tables.
 */
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "gyc_visitor_session";
const VISITOR_KEY = "gyc_visitor_id";
const SESSION_TS = "gyc_visitor_session_ts";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

let currentPagePath: string | null = null;
let currentPageEnteredAt = 0;
let currentPageViewId: string | null = null;
let maxScrollDepth = 0;
let sessionStartedAt = 0;
let pageCount = 0;

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreate(key: string, prefix: string): string {
  if (typeof window === "undefined") return uid(prefix);
  let v = window.localStorage.getItem(key);
  if (!v) {
    v = uid(prefix);
    try {
      window.localStorage.setItem(key, v);
    } catch {
      // storage blocked
    }
  }
  return v;
}

export function getVisitorId(): string {
  return getOrCreate(VISITOR_KEY, "v");
}

export function getSessionKey(): string {
  if (typeof window === "undefined") return uid("s");
  const tsRaw = window.sessionStorage.getItem(SESSION_TS);
  const lastTs = tsRaw ? parseInt(tsRaw, 10) : 0;
  const now = Date.now();
  let key = window.sessionStorage.getItem(SESSION_KEY);

  if (!key || now - lastTs > SESSION_TIMEOUT_MS) {
    key = uid("s");
    try {
      window.sessionStorage.setItem(SESSION_KEY, key);
      window.sessionStorage.setItem(SESSION_TS, String(now));
    } catch {
      // ignore
    }
  } else {
    try {
      window.sessionStorage.setItem(SESSION_TS, String(now));
    } catch {
      // ignore
    }
  }
  return key;
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

let sessionInitPromise: Promise<void> | null = null;

async function ensureSession(): Promise<void> {
  if (sessionInitPromise) return sessionInitPromise;
  if (typeof window === "undefined") return;

  const sessionKey = getSessionKey();
  const visitorId = getVisitorId();

  // Already initialized this tab session?
  const initFlag = `${sessionKey}_init`;
  if (window.sessionStorage.getItem(initFlag) === "1") return;

  sessionInitPromise = (async () => {
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
        // ignore
      }
    }
  })();

  return sessionInitPromise;
}

async function flushPageView() {
  if (!currentPagePath || !currentPageViewId) return;
  const timeSpent = Math.round((Date.now() - currentPageEnteredAt) / 1000);
  await supabase
    .from("visitor_page_views")
    .update({
      time_spent_seconds: timeSpent,
      scroll_depth: maxScrollDepth,
      left_at: new Date().toISOString(),
    })
    .eq("id", currentPageViewId);

  // Update session totals
  const sessionKey = getSessionKey();
  pageCount += 1;
  const totalTime = Math.round((Date.now() - sessionStartedAt) / 1000);
  await supabase
    .from("visitor_sessions")
    .update({
      page_count: pageCount,
      total_time_seconds: totalTime,
      exit_page: currentPagePath,
      last_active_at: new Date().toISOString(),
      is_bounced: pageCount <= 1 && totalTime < 15,
    })
    .eq("session_key", sessionKey);
}

export async function trackPageView(pathname: string, title?: string): Promise<void> {
  if (typeof window === "undefined") return;
  await ensureSession();

  // Flush previous page view first
  if (currentPagePath && currentPagePath !== pathname) {
    await flushPageView();
  } else if (currentPagePath === pathname) {
    return; // already tracked
  }

  const sessionKey = getSessionKey();
  currentPagePath = pathname;
  currentPageEnteredAt = Date.now();
  maxScrollDepth = 0;
  if (sessionStartedAt === 0) sessionStartedAt = Date.now();

  const { data } = await supabase
    .from("visitor_page_views")
    .insert({
      session_key: sessionKey,
      page_path: pathname,
      page_title: title || document.title,
      time_spent_seconds: 0,
      scroll_depth: 0,
    })
    .select("id")
    .single();

  currentPageViewId = data?.id ?? null;
}

export async function trackEvent(
  type: string,
  label?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (typeof window === "undefined") return;
  await ensureSession();
  const sessionKey = getSessionKey();
  await supabase.from("visitor_events").insert({
    session_key: sessionKey,
    event_type: type,
    event_label: label || null,
    page_path: window.location.pathname,
    metadata: (metadata || {}) as never,
  });
}

export async function captureLead(payload: {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  source: string; // e.g. "exit_popup", "time_popup", "riya_chat"
}): Promise<void> {
  if (typeof window === "undefined") return;
  if (!payload.phone && !payload.email) return;
  await ensureSession();
  const sessionKey = getSessionKey();
  const visitorId = getVisitorId();
  const params = new URLSearchParams(window.location.search);
  const src = detectSource(document.referrer || "", params);

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

  // Mirror onto the session for fast filtering
  await supabase
    .from("visitor_sessions")
    .update({
      captured_phone: payload.phone || null,
      captured_email: payload.email || null,
      captured_name: payload.name || null,
    })
    .eq("session_key", sessionKey);
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
    if (!currentPagePath || !currentPageViewId) return;
    const timeSpent = Math.round((Date.now() - currentPageEnteredAt) / 1000);
    const sessionKey = getSessionKey();
    const totalTime = Math.round((Date.now() - sessionStartedAt) / 1000);

    // Use sendBeacon for reliable unload delivery via REST
    const url = `https://ynoiwioypxpurwdbjvyt.supabase.co/rest/v1/visitor_page_views?id=eq.${currentPageViewId}`;
    const headers = new Blob(
      [
        JSON.stringify({
          time_spent_seconds: timeSpent,
          scroll_depth: maxScrollDepth,
          left_at: new Date().toISOString(),
        }),
      ],
      { type: "application/json" },
    );
    try {
      navigator.sendBeacon?.(url, headers);
    } catch {
      // ignore
    }

    // Best-effort session update
    void supabase
      .from("visitor_sessions")
      .update({
        page_count: pageCount + 1,
        total_time_seconds: totalTime,
        exit_page: currentPagePath,
        ended_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      })
      .eq("session_key", sessionKey);
  };
  window.addEventListener("beforeunload", flush);
  window.addEventListener("pagehide", flush);
}

let booted = false;
export function bootVisitorTracker() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  void ensureSession();
  setupScrollTracking();
  setupUnloadFlush();
}
