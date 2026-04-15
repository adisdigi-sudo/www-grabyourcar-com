import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

/**
 * Meta Lead Webhook — Receives leads from:
 * 1. Meta Lead Ads (Facebook/Instagram instant forms)
 * 2. Google Ads click-to-lead webhooks
 * 3. Any external ad platform via standard JSON payload
 *
 * Security: Validates X-Webhook-Secret header for external pushes.
 * For Meta Lead Ads, validates hub.verify_token for webhook verification.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "grabyourcar_verify";

  // Meta webhook verification (GET request)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json();
    const results: Array<{ success: boolean; lead_id?: string; error?: string }> = [];

    // Detect platform type
    const platform = detectPlatform(body, req);

    if (platform === "meta") {
      // Meta Lead Ads format: { entry: [{ changes: [{ value: { leadgen_id, ... } }] }] }
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field === "leadgen") {
            const leadData = change.value;
            try {
              const result = await processMetaLead(supabase, leadData, SUPABASE_URL, SERVICE_KEY);
              results.push({ success: true, lead_id: result });
            } catch (e) {
              results.push({ success: false, error: String(e) });
            }
          }
        }
      }
    } else if (platform === "google") {
      // Google Ads webhook format
      try {
        const result = await processGoogleLead(supabase, body, SUPABASE_URL, SERVICE_KEY);
        results.push({ success: true, lead_id: result });
      } catch (e) {
        results.push({ success: false, error: String(e) });
      }
    } else {
      // Generic ad platform — standard JSON payload
      try {
        const result = await processGenericAdLead(supabase, body, platform, SUPABASE_URL, SERVICE_KEY);
        results.push({ success: true, lead_id: result });
      } catch (e) {
        results.push({ success: false, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Meta lead webhook error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function detectPlatform(body: Record<string, unknown>, req: Request): string {
  // Meta sends { object: "page", entry: [...] }
  if (body.object === "page" && Array.isArray(body.entry)) return "meta";
  // Google Ads sends with specific headers or fields
  if (body.google_key || body.gclid || req.headers.get("x-goog-channel-id")) return "google";
  // Check custom header
  const platformHeader = req.headers.get("x-ad-platform");
  if (platformHeader) return platformHeader.toLowerCase();
  // Default
  return body.platform as string || "unknown";
}

async function forwardToIntakeEngine(supabaseUrl: string, serviceKey: string, payload: Record<string, unknown>) {
  const response = await fetch(`${supabaseUrl}/functions/v1/lead-intake-engine`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Intake engine failed");
  return data.lead_id;
}

async function processMetaLead(
  supabase: ReturnType<typeof createClient>,
  leadData: Record<string, unknown>,
  supabaseUrl: string,
  serviceKey: string,
): Promise<string> {
  // Extract fields from Meta lead form data
  const fieldData = (leadData.field_data || []) as Array<{ name: string; values: string[] }>;
  const getField = (name: string) => {
    const field = fieldData.find((f) =>
      f.name.toLowerCase().includes(name.toLowerCase())
    );
    return field?.values?.[0] || "";
  };

  const name = getField("full_name") || getField("name") || "Meta Lead";
  const phone = getField("phone") || getField("phone_number") || getField("mobile");
  const email = getField("email");
  const city = getField("city") || getField("location");

  if (!phone) throw new Error("No phone number in Meta lead data");

  const payload = {
    name,
    phone,
    email,
    city,
    source: "meta_lead_ads",
    lead_source_type: "Meta",
    ad_platform: "meta",
    ad_campaign_id: String(leadData.ad_id || ""),
    fbclid: String(leadData.leadgen_id || ""),
    utm_source: "facebook",
    utm_medium: "paid",
    utm_campaign: String(leadData.form_id || ""),
    vertical: getField("interest") || getField("service") || "car",
    serviceCategory: getField("service_category") || getField("interest") || "",
    message_text: `Meta Lead Ad - Form: ${leadData.form_id || "unknown"}`,
    type: "ad_lead",
    body: {
      name,
      phone,
      email,
      city,
      source: "meta_lead_ads",
      lead_source_type: "Meta",
      vertical: getField("interest") || "car",
    },
  };

  // Log the raw ad lead
  await supabase.from("ad_campaigns").upsert(
    {
      platform: "meta",
      campaign_id: String(leadData.ad_id || "unknown"),
      campaign_name: `Meta Lead Form ${leadData.form_id || ""}`,
      leads_generated: 1,
    },
    { onConflict: "platform,campaign_id", ignoreDuplicates: false }
  ).then(() => {}).catch(() => {});

  return forwardToIntakeEngine(supabaseUrl, serviceKey, payload);
}

async function processGoogleLead(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
  supabaseUrl: string,
  serviceKey: string,
): Promise<string> {
  const leadInfo = (body.lead_form_submission_data || body.user_column_data || body) as Record<string, unknown>;
  const columnData = (leadInfo.column_data || []) as Array<{ column_id: string; string_value: string }>;
  const getColumn = (id: string) => {
    const col = columnData.find((c) => c.column_id.toLowerCase().includes(id.toLowerCase()));
    return col?.string_value || "";
  };

  const name = getColumn("FULL_NAME") || getColumn("name") || body.name as string || "Google Lead";
  const phone = getColumn("PHONE_NUMBER") || getColumn("phone") || body.phone as string || "";
  const email = getColumn("EMAIL") || body.email as string || "";
  const city = getColumn("CITY") || body.city as string || "";

  if (!phone) throw new Error("No phone number in Google lead data");

  const payload = {
    name,
    phone,
    email,
    city,
    source: "google_ads",
    lead_source_type: "Google",
    ad_platform: "google",
    ad_campaign_id: String(body.campaign_id || ""),
    gclid: String(body.gclid || body.gcl_id || ""),
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: String(body.campaign_name || body.campaign_id || ""),
    vertical: body.vertical as string || "car",
    serviceCategory: body.service_category as string || "",
    message_text: `Google Ads Lead - Campaign: ${body.campaign_name || body.campaign_id || "unknown"}`,
    type: "ad_lead",
    body: {
      name,
      phone,
      email,
      city,
      source: "google_ads",
      lead_source_type: "Google",
    },
  };

  return forwardToIntakeEngine(supabaseUrl, serviceKey, payload);
}

async function processGenericAdLead(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
  platform: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<string> {
  const name = (body.name || body.full_name || body.customer_name || "Ad Lead") as string;
  const phone = (body.phone || body.phone_number || body.mobile) as string || "";
  const email = (body.email || "") as string;
  const city = (body.city || body.location || "") as string;

  if (!phone) throw new Error("No phone number in ad lead data");

  const payload = {
    name,
    phone,
    email,
    city,
    source: `${platform}_ads`,
    lead_source_type: platform.charAt(0).toUpperCase() + platform.slice(1),
    ad_platform: platform,
    ad_campaign_id: String(body.campaign_id || ""),
    utm_source: body.utm_source as string || platform,
    utm_medium: body.utm_medium as string || "paid",
    utm_campaign: body.utm_campaign as string || "",
    vertical: body.vertical as string || "car",
    serviceCategory: body.service_category as string || "",
    message_text: body.message as string || `${platform} Ad Lead`,
    type: "ad_lead",
    body: { name, phone, email, city, source: `${platform}_ads` },
  };

  return forwardToIntakeEngine(supabaseUrl, serviceKey, payload);
}
