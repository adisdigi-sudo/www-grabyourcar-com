// One-click Meta WhatsApp Cloud API connector
// Validates phone + WABA, registers phone, subscribes webhook, encrypts token,
// upserts whatsapp_accounts, and syncs message templates.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_GRAPH = "https://graph.facebook.com/v21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Step = { step: string; ok: boolean; message?: string; data?: any };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function metaGet(path: string, token: string) {
  const r = await fetch(`${META_GRAPH}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await r.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: r.ok, status: r.status, data };
}

async function metaPost(path: string, token: string, body: any) {
  const r = await fetch(`${META_GRAPH}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: r.ok, status: r.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const steps: Step[] = [];

  try {
    // ---- Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    // ---- Body
    const body = await req.json().catch(() => ({}));
    const phone_number_id = String(body?.phone_number_id || "").trim();
    const waba_id = String(body?.waba_id || "").trim();
    const access_token = String(body?.access_token || "").trim();

    if (!phone_number_id || !waba_id || !access_token) {
      return json({ error: "phone_number_id, waba_id and access_token are required" }, 400);
    }

    // ---- Step 1: Validate phone
    const phoneRes = await metaGet(
      `/${phone_number_id}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,code_verification_status,platform_type,throughput`,
      access_token,
    );
    if (!phoneRes.ok) {
      steps.push({ step: "validate_phone", ok: false, message: phoneRes.data?.error?.message || "Invalid phone_number_id or token" });
      return json({ success: false, steps, error: "Phone validation failed", details: phoneRes.data }, 400);
    }
    steps.push({ step: "validate_phone", ok: true, data: phoneRes.data });

    // ---- Step 2: Fetch WABA info
    const wabaRes = await metaGet(`/${waba_id}?fields=name,currency,timezone_id`, access_token);
    if (!wabaRes.ok) {
      steps.push({ step: "fetch_waba", ok: false, message: wabaRes.data?.error?.message || "Invalid WABA ID" });
      return json({ success: false, steps, error: "WABA fetch failed", details: wabaRes.data }, 400);
    }
    steps.push({ step: "fetch_waba", ok: true, data: wabaRes.data });

    // ---- Step 3: Register phone (skip if already registered)
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const regRes = await metaPost(`/${phone_number_id}/register`, access_token, {
      messaging_product: "whatsapp",
      pin,
    });
    let phone_registered = false;
    if (regRes.ok) {
      phone_registered = true;
      steps.push({ step: "register_phone", ok: true, message: "Registered for Cloud API" });
    } else if (regRes.data?.error?.code === 133005 || /already.*registered/i.test(regRes.data?.error?.message || "")) {
      phone_registered = true;
      steps.push({ step: "register_phone", ok: true, message: "Already registered — skipped" });
    } else {
      steps.push({ step: "register_phone", ok: false, message: regRes.data?.error?.message || "Register failed" });
    }

    // ---- Step 4: Subscribe app to WABA webhooks
    const subRes = await metaPost(`/${waba_id}/subscribed_apps`, access_token, {});
    const webhook_subscribed = !!subRes.ok;
    steps.push({
      step: "subscribe_webhook",
      ok: webhook_subscribed,
      message: webhook_subscribed ? "App subscribed to WABA" : (subRes.data?.error?.message || "Subscribe failed"),
    });

    // ---- Step 5: Encrypt token + pin
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: encTokRow, error: encTokErr } = await admin.rpc("encrypt_token", { plain_token: access_token });
    if (encTokErr) throw new Error(`encrypt_token failed: ${encTokErr.message}`);
    const { data: encPinRow } = await admin.rpc("encrypt_token", { plain_token: pin });
    steps.push({ step: "encrypt_secrets", ok: true });

    // ---- Step 6: Webhook verify token
    const webhook_verify_token = crypto.randomUUID().replace(/-/g, "");

    // ---- Step 7: Upsert account
    const phoneInfo = phoneRes.data || {};
    const wabaInfo = wabaRes.data || {};
    const { data: account, error: upErr } = await admin
      .from("whatsapp_accounts")
      .upsert(
        {
          user_id: userId,
          phone_number_id,
          waba_id,
          display_phone_number: phoneInfo.display_phone_number ?? null,
          verified_name: phoneInfo.verified_name ?? null,
          business_name: wabaInfo.name ?? null,
          quality_rating: phoneInfo.quality_rating ?? null,
          messaging_limit: phoneInfo.messaging_limit_tier ?? null,
          code_verification_status: phoneInfo.code_verification_status ?? null,
          platform_type: phoneInfo.platform_type ?? null,
          throughput_level: phoneInfo.throughput?.level ?? null,
          encrypted_access_token: encTokRow,
          encrypted_pin: encPinRow ?? null,
          webhook_verify_token,
          webhook_subscribed,
          phone_registered,
          status: "active",
          last_synced_at: new Date().toISOString(),
          last_sync_error: null,
          setup_completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,phone_number_id" },
      )
      .select()
      .single();
    if (upErr) throw new Error(`save account failed: ${upErr.message}`);
    steps.push({ step: "save_account", ok: true });

    // ---- Step 8: Sync templates
    let templates_synced = 0;
    const tplRes = await metaGet(
      `/${waba_id}/message_templates?fields=id,name,category,language,components,status,quality_score,rejected_reason&limit=200`,
      access_token,
    );
    if (tplRes.ok && Array.isArray(tplRes.data?.data)) {
      const rows = tplRes.data.data.map((t: any) => ({
        user_id: userId,
        whatsapp_account_id: account.id,
        meta_template_id: t.id ?? null,
        name: t.name,
        category: t.category ?? null,
        language: t.language ?? "en",
        components: t.components ?? [],
        status: t.status ?? null,
        rejection_reason: t.rejected_reason ?? null,
        quality_score: t.quality_score ?? null,
        synced_at: new Date().toISOString(),
      }));
      if (rows.length) {
        const { error: tplErr } = await admin
          .from("message_templates")
          .upsert(rows, { onConflict: "whatsapp_account_id,name,language" });
        if (tplErr) {
          steps.push({ step: "sync_templates", ok: false, message: tplErr.message });
        } else {
          templates_synced = rows.length;
          steps.push({ step: "sync_templates", ok: true, message: `${rows.length} templates synced` });
        }
      } else {
        steps.push({ step: "sync_templates", ok: true, message: "No templates found" });
      }
    } else {
      steps.push({ step: "sync_templates", ok: false, message: tplRes.data?.error?.message || "Could not fetch templates" });
    }

    const webhook_url = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;

    // strip secrets from response
    const safe = { ...account, encrypted_access_token: undefined, encrypted_pin: undefined };

    return json({
      success: true,
      account: safe,
      templates_synced,
      webhook_url,
      webhook_verify_token,
      pin_set: phone_registered,
      steps,
    });
  } catch (err) {
    console.error("whatsapp-connect error", err);
    steps.push({ step: "exception", ok: false, message: (err as Error).message });
    return json({ success: false, error: (err as Error).message, steps }, 500);
  }
});
