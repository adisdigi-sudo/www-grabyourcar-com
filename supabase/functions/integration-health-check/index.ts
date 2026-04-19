// Integration Health Check — single edge function to test all 7 core providers
// Returns structured status JSON + persists results to integration_health_logs

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_PHONE = "919855924442"; // E.164 without +
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

async function testMetaWhatsApp(dryRun: boolean): Promise<TestResult> {
  const start = Date.now();
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  if (!token || !phoneId) {
    return {
      provider: "meta_whatsapp",
      status: "failure",
      message: "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID",
      duration_ms: Date.now() - start,
    };
  }

  try {
    if (dryRun) {
      // Just verify credentials by fetching phone number info
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${phoneId}?fields=display_phone_number,verified_name`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      if (!res.ok) {
        return {
          provider: "meta_whatsapp",
          status: "failure",
          message: data?.error?.message ?? `Graph API error ${res.status}`,
          details: data,
          duration_ms: Date.now() - start,
        };
      }
      return {
        provider: "meta_whatsapp",
        status: "success",
        message: `Connected: ${data.verified_name ?? data.display_phone_number ?? "OK"}`,
        details: data,
        duration_ms: Date.now() - start,
      };
    }

    // Live test: send hello_world template
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: ADMIN_PHONE,
          type: "template",
          template: { name: "hello_world", language: { code: "en_US" } },
        }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      return {
        provider: "meta_whatsapp",
        status: "failure",
        message: data?.error?.message ?? `Send failed (${res.status})`,
        details: data,
        duration_ms: Date.now() - start,
      };
    }
    return {
      provider: "meta_whatsapp",
      status: "success",
      message: `Test message sent to ${ADMIN_PHONE}`,
      details: data,
      duration_ms: Date.now() - start,
    };
  } catch (e) {
    return {
      provider: "meta_whatsapp",
      status: "failure",
      message: e instanceof Error ? e.message : "Unknown error",
      duration_ms: Date.now() - start,
    };
  }
}

async function testLovableAI(): Promise<TestResult> {
  const start = Date.now();
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    return {
      provider: "lovable_ai",
      status: "failure",
      message: "LOVABLE_API_KEY not configured",
      duration_ms: Date.now() - start,
    };
  }
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: "Reply with just the word: OK" }],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        provider: "lovable_ai",
        status: res.status === 429 ? "warning" : "failure",
        message: data?.error?.message ?? `AI gateway ${res.status}`,
        details: data,
        duration_ms: Date.now() - start,
      };
    }
    const reply = data?.choices?.[0]?.message?.content ?? "";
    return {
      provider: "lovable_ai",
      status: "success",
      message: `AI replied: "${reply.trim().slice(0, 50)}"`,
      details: { model: data?.model, usage: data?.usage },
      duration_ms: Date.now() - start,
    };
  } catch (e) {
    return {
      provider: "lovable_ai",
      status: "failure",
      message: e instanceof Error ? e.message : "Unknown error",
      duration_ms: Date.now() - start,
    };
  }
}

async function testLovableEmail(dryRun: boolean, recipientEmail: string): Promise<TestResult> {
  const start = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");

  // If Resend secret exists, use it directly (works without Lovable email domain setup)
  if (resendKey && !dryRun) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "GrabYourCar <onboarding@resend.dev>",
          to: [recipientEmail],
          subject: "✅ Integration Health Check",
          html: `<p>This is a test email from your <strong>Integration Control Center</strong>.</p><p>If you received this, your Email API is working correctly.</p>`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          provider: "lovable_email",
          status: "failure",
          message: data?.message ?? `Resend ${res.status}`,
          details: data,
          duration_ms: Date.now() - start,
        };
      }
      return {
        provider: "lovable_email",
        status: "success",
        message: `Test email sent to ${recipientEmail} via Resend`,
        details: data,
        duration_ms: Date.now() - start,
      };
    } catch (e) {
      return {
        provider: "lovable_email",
        status: "failure",
        message: e instanceof Error ? e.message : "Unknown error",
        duration_ms: Date.now() - start,
      };
    }
  }

  if (dryRun || !resendKey) {
    return {
      provider: "lovable_email",
      status: resendKey ? "success" : "warning",
      message: resendKey
        ? "RESEND_API_KEY present (dry-run skipped actual send)"
        : "No email provider configured (RESEND_API_KEY missing)",
      duration_ms: Date.now() - start,
    };
  }

  return {
    provider: "lovable_email",
    status: "skipped",
    message: "No supported email provider available",
    duration_ms: Date.now() - start,
  };
}

async function testTwilioSMS(dryRun: boolean): Promise<TestResult> {
  const start = Date.now();
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!sid || !token) {
    return {
      provider: "twilio_sms",
      status: "failure",
      message: "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN",
      duration_ms: Date.now() - start,
    };
  }
  try {
    const auth = btoa(`${sid}:${token}`);
    if (dryRun) {
      // Verify credentials by fetching account info
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`,
        { headers: { Authorization: `Basic ${auth}` } },
      );
      const data = await res.json();
      if (!res.ok) {
        return {
          provider: "twilio_sms",
          status: "failure",
          message: data?.message ?? `Twilio ${res.status}`,
          details: data,
          duration_ms: Date.now() - start,
        };
      }
      return {
        provider: "twilio_sms",
        status: "success",
        message: `Twilio account verified: ${data.friendly_name} (${data.status})`,
        details: { sid: data.sid, status: data.status, type: data.type },
        duration_ms: Date.now() - start,
      };
    }
    return {
      provider: "twilio_sms",
      status: "warning",
      message: "Live SMS send requires a verified From number — using dry-run instead",
      duration_ms: Date.now() - start,
    };
  } catch (e) {
    return {
      provider: "twilio_sms",
      status: "failure",
      message: e instanceof Error ? e.message : "Unknown error",
      duration_ms: Date.now() - start,
    };
  }
}

async function testSupabaseDB(): Promise<TestResult> {
  const start = Date.now();
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return {
      provider: "supabase_db",
      status: "failure",
      message: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      duration_ms: Date.now() - start,
    };
  }
  try {
    const supabase = createClient(url, key);
    const { count, error } = await supabase
      .from("business_verticals")
      .select("*", { count: "exact", head: true });
    if (error) {
      return {
        provider: "supabase_db",
        status: "failure",
        message: error.message,
        details: error,
        duration_ms: Date.now() - start,
      };
    }
    return {
      provider: "supabase_db",
      status: "success",
      message: `Database connected — ${count ?? 0} verticals found`,
      details: { vertical_count: count },
      duration_ms: Date.now() - start,
    };
  } catch (e) {
    return {
      provider: "supabase_db",
      status: "failure",
      message: e instanceof Error ? e.message : "Unknown error",
      duration_ms: Date.now() - start,
    };
  }
}

async function testSurepass(): Promise<TestResult> {
  const start = Date.now();
  const token = Deno.env.get("SUREPASS_API_TOKEN");
  if (!token) {
    return {
      provider: "surepass_rc",
      status: "failure",
      message: "SUREPASS_API_TOKEN not configured",
      duration_ms: Date.now() - start,
    };
  }
  try {
    // Lightweight credential check — call a minimal endpoint
    const res = await fetch("https://kyc-api.surepass.io/api/v1/rc/rc-full", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id_number: "INVALID_TEST" }),
    });
    const data = await res.json().catch(() => ({}));
    // 401 = bad token; 400/422 = valid token but bad input (which is what we want for ping)
    if (res.status === 401 || res.status === 403) {
      return {
        provider: "surepass_rc",
        status: "failure",
        message: "Surepass token unauthorized",
        details: data,
        duration_ms: Date.now() - start,
      };
    }
    return {
      provider: "surepass_rc",
      status: "success",
      message: `Surepass API reachable (HTTP ${res.status})`,
      details: { status_code: res.status },
      duration_ms: Date.now() - start,
    };
  } catch (e) {
    return {
      provider: "surepass_rc",
      status: "failure",
      message: e instanceof Error ? e.message : "Unknown error",
      duration_ms: Date.now() - start,
    };
  }
}

async function testRazorpay(): Promise<TestResult> {
  const start = Date.now();
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) {
    return {
      provider: "razorpay",
      status: "failure",
      message: "Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET",
      duration_ms: Date.now() - start,
    };
  }
  try {
    const auth = btoa(`${keyId}:${keySecret}`);
    const res = await fetch("https://api.razorpay.com/v1/payments?count=1", {
      headers: { Authorization: `Basic ${auth}` },
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        provider: "razorpay",
        status: "failure",
        message: data?.error?.description ?? `Razorpay ${res.status}`,
        details: data,
        duration_ms: Date.now() - start,
      };
    }
    const mode = keyId.startsWith("rzp_live_") ? "LIVE" : "TEST";
    return {
      provider: "razorpay",
      status: "success",
      message: `Razorpay ${mode} mode connected`,
      details: { mode, key_prefix: keyId.slice(0, 12) },
      duration_ms: Date.now() - start,
    };
  } catch (e) {
    return {
      provider: "razorpay",
      status: "failure",
      message: e instanceof Error ? e.message : "Unknown error",
      duration_ms: Date.now() - start,
    };
  }
}

const TESTERS: Record<ProviderId, (dryRun: boolean, email: string) => Promise<TestResult>> = {
  meta_whatsapp: (dryRun) => testMetaWhatsApp(dryRun),
  lovable_ai: () => testLovableAI(),
  lovable_email: (dryRun, email) => testLovableEmail(dryRun, email),
  twilio_sms: (dryRun) => testTwilioSMS(dryRun),
  supabase_db: () => testSupabaseDB(),
  surepass_rc: () => testSurepass(),
  razorpay: () => testRazorpay(),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const provider = body.provider as ProviderId | "all" | undefined;
    const dryRun = body.dryRun === true;
    const recipientEmail = body.recipientEmail || ADMIN_EMAIL_DEFAULT;
    const userId = body.userId as string | undefined;
    const userEmail = body.userEmail as string | undefined;

    const providersToTest: ProviderId[] = provider && provider !== "all"
      ? [provider]
      : (Object.keys(TESTERS) as ProviderId[]);

    const results: TestResult[] = [];
    for (const p of providersToTest) {
      const fn = TESTERS[p];
      if (!fn) continue;
      const result = await fn(dryRun, recipientEmail);
      results.push(result);
    }

    // Persist to logs
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey);
      const rows = results.map((r) => ({
        provider: r.provider,
        status: r.status,
        message: r.message,
        details: r.details ?? {},
        duration_ms: r.duration_ms,
        tested_by: userId ?? null,
        tested_by_email: userEmail ?? null,
      }));
      await supabase.from("integration_health_logs").insert(rows);
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
