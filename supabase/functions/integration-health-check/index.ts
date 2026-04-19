// Integration Health Check — supports two modes:
// 1. { keys: ["WHATSAPP_ACCESS_TOKEN", ...] } -> returns { statuses: { KEY: "ok" | "missing" } }
// 2. { provider: "all" | <ProviderId>, dryRun, recipientEmail } -> deep ping per provider
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL_DEFAULT = "support@grabyourcar.com";

type ProviderId =
  | "meta_whatsapp"
  | "lovable_ai"
  | "lovable_email"
  | "twilio_sms"
  | "supabase_db"
  | "surepass_rc"
  | "razorpay";

interface TestResult {
  provider: ProviderId;
  status: "success" | "failure" | "warning" | "skipped";
  message: string;
  details?: Record<string, unknown>;
  duration_ms: number;
}

const ok = (provider: ProviderId, message: string, details?: Record<string, unknown>, start = Date.now()): TestResult =>
  ({ provider, status: "success", message, details, duration_ms: Date.now() - start });
const fail = (provider: ProviderId, message: string, details?: Record<string, unknown>, start = Date.now()): TestResult =>
  ({ provider, status: "failure", message, details, duration_ms: Date.now() - start });

async function testMetaWhatsApp(): Promise<TestResult> {
  const start = Date.now();
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) return fail("meta_whatsapp", "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID", undefined, start);
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}?fields=display_phone_number,verified_name`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return fail("meta_whatsapp", data?.error?.message || `Meta ${res.status}`, data, start);
    return ok("meta_whatsapp", `WhatsApp ready (${data?.display_phone_number || "—"})`, data, start);
  } catch (e) {
    return fail("meta_whatsapp", e instanceof Error ? e.message : "unknown", undefined, start);
  }
}

async function testLovableAI(): Promise<TestResult> {
  const start = Date.now();
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return fail("lovable_ai", "Missing LOVABLE_API_KEY", undefined, start);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "user", content: "ping" }], max_tokens: 4 }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return fail("lovable_ai", `Gateway ${res.status}`, { body: text.slice(0, 200) }, start);
    }
    return ok("lovable_ai", "Lovable AI reachable", undefined, start);
  } catch (e) {
    return fail("lovable_ai", e instanceof Error ? e.message : "unknown", undefined, start);
  }
}

async function testLovableEmail(): Promise<TestResult> {
  const start = Date.now();
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return fail("lovable_email", "Missing RESEND_API_KEY", undefined, start);
  try {
    const res = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) return fail("lovable_email", `Resend ${res.status}`, undefined, start);
    return ok("lovable_email", "Resend API reachable", undefined, start);
  } catch (e) {
    return fail("lovable_email", e instanceof Error ? e.message : "unknown", undefined, start);
  }
}

async function testTwilioSMS(): Promise<TestResult> {
  const start = Date.now();
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const tok = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!sid || !tok) return fail("twilio_sms", "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN", undefined, start);
  try {
    const auth = btoa(`${sid}:${tok}`);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) return fail("twilio_sms", `Twilio ${res.status}`, undefined, start);
    return ok("twilio_sms", "Twilio account reachable", undefined, start);
  } catch (e) {
    return fail("twilio_sms", e instanceof Error ? e.message : "unknown", undefined, start);
  }
}

async function testSupabaseDB(): Promise<TestResult> {
  const start = Date.now();
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return fail("supabase_db", "Missing SUPABASE_URL/SERVICE_ROLE_KEY", undefined, start);
  try {
    const supabase = createClient(url, key);
    const { count, error } = await supabase.from("business_verticals").select("*", { count: "exact", head: true });
    if (error) return fail("supabase_db", error.message, undefined, start);
    return ok("supabase_db", `DB reachable — ${count ?? 0} verticals`, { vertical_count: count }, start);
  } catch (e) {
    return fail("supabase_db", e instanceof Error ? e.message : "unknown", undefined, start);
  }
}

async function testSurepass(): Promise<TestResult> {
  const start = Date.now();
  const token = Deno.env.get("SUREPASS_API_TOKEN");
  if (!token) return fail("surepass_rc", "Missing SUREPASS_API_TOKEN", undefined, start);
  try {
    const res = await fetch("https://kyc-api.surepass.io/api/v1/rc/rc-full", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id_number: "INVALID_TEST" }),
    });
    if (res.status === 401 || res.status === 403) return fail("surepass_rc", "Surepass token unauthorized", undefined, start);
    return ok("surepass_rc", `Surepass reachable (HTTP ${res.status})`, { status_code: res.status }, start);
  } catch (e) {
    return fail("surepass_rc", e instanceof Error ? e.message : "unknown", undefined, start);
  }
}

async function testRazorpay(): Promise<TestResult> {
  const start = Date.now();
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) return fail("razorpay", "Missing RAZORPAY keys", undefined, start);
  try {
    const auth = btoa(`${keyId}:${keySecret}`);
    const res = await fetch("https://api.razorpay.com/v1/payments?count=1", { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) return fail("razorpay", `Razorpay ${res.status}`, undefined, start);
    const mode = keyId.startsWith("rzp_live_") ? "LIVE" : "TEST";
    return ok("razorpay", `Razorpay ${mode}`, { mode }, start);
  } catch (e) {
    return fail("razorpay", e instanceof Error ? e.message : "unknown", undefined, start);
  }
}

const TESTERS: Record<ProviderId, () => Promise<TestResult>> = {
  meta_whatsapp: testMetaWhatsApp,
  lovable_ai: testLovableAI,
  lovable_email: testLovableEmail,
  twilio_sms: testTwilioSMS,
  supabase_db: testSupabaseDB,
  surepass_rc: testSurepass,
  razorpay: testRazorpay,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));

    // MODE 1 — secret presence check (used by APIStatusDashboard)
    if (Array.isArray(body?.keys)) {
      const statuses: Record<string, "ok" | "missing"> = {};
      for (const k of body.keys) {
        if (typeof k !== "string" || !/^[A-Z0-9_]+$/.test(k)) {
          statuses[String(k)] = "missing";
          continue;
        }
        const v = Deno.env.get(k);
        statuses[k] = v && v.length > 0 ? "ok" : "missing";
      }
      return new Response(JSON.stringify({ ok: true, statuses }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE 2 — provider deep ping
    const provider = body.provider as ProviderId | "all" | undefined;
    const userId = body.userId as string | undefined;
    const userEmail = body.userEmail as string | undefined;

    const providersToTest: ProviderId[] = provider && provider !== "all"
      ? [provider]
      : (Object.keys(TESTERS) as ProviderId[]);

    const results: TestResult[] = [];
    for (const p of providersToTest) {
      const fn = TESTERS[p];
      if (!fn) continue;
      results.push(await fn());
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceKey) {
      try {
        const supabase = createClient(supabaseUrl, serviceKey);
        await supabase.from("integration_health_logs").insert(
          results.map((r) => ({
            provider: r.provider,
            status: r.status,
            message: r.message,
            details: r.details ?? {},
            duration_ms: r.duration_ms,
            tested_by: userId ?? null,
            tested_by_email: userEmail ?? null,
          })),
        );
      } catch (_) { /* ignore log persistence errors */ }
    }

    return new Response(
      JSON.stringify({ ok: true, results, tested_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[integration-health-check] error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
