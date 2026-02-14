import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Messaging Service — Provider-Agnostic Abstraction Layer
 * 
 * Website → messaging-service → Provider (Finbite today, any tomorrow)
 * 
 * Supports:
 *   - send_template: Send a Finbite-approved template by name
 *   - send_text: Send a plain text message
 *   - trigger_event: Fire an event that auto-maps to the right template
 */

interface SendTemplateRequest {
  action: "send_template";
  phone: string;
  template_name: string;
  variables?: Record<string, string>;
  lead_id?: string;
  customer_name?: string;
}

interface SendTextRequest {
  action: "send_text";
  phone: string;
  message: string;
  lead_id?: string;
  customer_name?: string;
}

interface TriggerEventRequest {
  action: "trigger_event";
  event: string;
  phone?: string;
  lead_id?: string;
  name?: string;
  data?: Record<string, string>;
}

type ServiceRequest = SendTemplateRequest | SendTextRequest | TriggerEventRequest;

// ---- Provider Adapter Interface ----
async function sendViaFinbiteV2(
  phone: string,
  apiKey: string,
  phoneId: string,
  payload: { type: "text"; message: string } | { type: "template"; template_name: string; variables?: Record<string, string> }
): Promise<{ success: boolean; provider_message_id?: string; error?: string }> {
  const BASE_URL = "https://app.finbite.in/api/v2/whatsapp-business/messages";

  // Normalize phone to include country code
  const cleanPhone = phone.replace(/\D/g, "").replace(/^0+/, "");
  let fullPhone = cleanPhone;
  if (!cleanPhone.startsWith("91") && cleanPhone.length === 10) {
    fullPhone = `91${cleanPhone}`;
  }

  let body: Record<string, unknown>;

  if (payload.type === "template") {
    // Template message via Finbite v2 — exact body format per API docs
    body = {
      to: fullPhone,
      phoneNoId: phoneId,
      type: "template",
      name: payload.template_name,
      language: "en_US",
    };
  } else {
    // Text message via Finbite v2
    body = {
      to: fullPhone,
      phoneNoId: phoneId,
      type: "text",
      text: { body: payload.message },
    };
  }

  console.log("Finbite v2 request:", JSON.stringify(body));

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "X-Phone-ID": phoneId,
    },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const result = await response.json();
    console.log("Finbite v2 response:", JSON.stringify(result));

    if (response.ok && !result.error) {
      return {
        success: true,
        provider_message_id: result.messages?.[0]?.id || result.message_id || null,
      };
    }
    return { success: false, error: JSON.stringify(result) };
  }

  const text = await response.text();
  console.error("Finbite v2 non-JSON:", text.substring(0, 300));
  return { success: false, error: `Non-JSON response (${response.status})` };
}

// Fallback: try v1 API format
async function sendViaFinbiteV1(
  phone: string,
  clientId: string,
  apiKey: string,
  waClient: string,
  message: string
): Promise<{ success: boolean; provider_message_id?: string; error?: string }> {
  const cleanPhone = phone.replace(/\D/g, "").replace(/^0+/, "");
  let normalizedPhone = cleanPhone;
  if (cleanPhone.startsWith("91") && cleanPhone.length === 12) {
    normalizedPhone = cleanPhone.slice(2);
  }

  const formData = new URLSearchParams();
  formData.append("client_id", clientId);
  formData.append("api_key", apiKey);
  formData.append("whatsapp_client", waClient);
  formData.append("phone", normalizedPhone);
  formData.append("country_code", "91");
  formData.append("msg", message);
  formData.append("msg_type", "0");

  const response = await fetch("https://wbiztool.com/api/v1/send_msg/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const result = await response.json();
    if (response.ok && result.status !== false && !result.error) {
      return { success: true, provider_message_id: result.message_id || null };
    }
    return { success: false, error: JSON.stringify(result) };
  }

  const text = await response.text();
  return { success: false, error: `Non-JSON (${response.status})` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const FINBITE_API_KEY = (Deno.env.get("FINBITE_API_KEY") || "").trim();
  const FINBITE_WHATSAPP_CLIENT = (Deno.env.get("FINBITE_WHATSAPP_CLIENT") || "").trim();
  const FINBITE_CLIENT_ID = (Deno.env.get("FINBITE_CLIENT_ID") || "").trim();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing backend config" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const request: ServiceRequest = await req.json();

    // ---- Route: trigger_event ----
    if (request.action === "trigger_event") {
      // Delegate to wa-automation-trigger (which now uses this service)
      // But also check wa_event_triggers for template-based triggers
      const { event, phone, lead_id, name, data } = request;

      // Find matching event triggers
      const { data: triggers } = await supabase
        .from("wa_event_triggers")
        .select("*, wa_template_catalog(*)")
        .eq("event_name", event)
        .eq("is_active", true);

      if (!triggers || triggers.length === 0) {
        return new Response(JSON.stringify({ triggered: 0, message: "No matching triggers" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Resolve phone
      let resolvedPhone = phone;
      let resolvedName = name || "Customer";
      if (!resolvedPhone && lead_id) {
        const { data: lead } = await supabase
          .from("leads")
          .select("phone, name")
          .eq("id", lead_id)
          .single();
        if (lead) {
          resolvedPhone = lead.phone;
          resolvedName = lead.name || resolvedName;
        }
      }

      if (!resolvedPhone) {
        return new Response(JSON.stringify({ error: "No phone number" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let triggered = 0;
      for (const trigger of triggers) {
        const template = trigger.wa_template_catalog;
        if (!template) continue;

        // Check cooldown
        if (lead_id) {
          const cooldownCutoff = new Date(Date.now() - (trigger.cooldown_hours || 24) * 3600000).toISOString();
          const { data: recent } = await supabase
            .from("wa_message_logs")
            .select("id")
            .eq("lead_id", lead_id)
            .eq("template_name", template.template_name)
            .gte("created_at", cooldownCutoff)
            .limit(1);

          if (recent && recent.length > 0) continue;
        }

        // Build variables from mapping
        const variables: Record<string, string> = {
          name: resolvedName,
          ...data,
        };

        // Log the message
        const { data: logEntry } = await supabase.from("wa_message_logs").insert({
          phone: resolvedPhone,
          customer_name: resolvedName,
          template_name: template.template_name,
          template_id: template.id,
          message_type: "template",
          trigger_event: event,
          lead_id: lead_id || null,
          variables,
          status: trigger.delay_seconds > 0 ? "scheduled" : "queued",
          provider: "finbite",
        }).select("id").single();

        // If no delay, send immediately
        if (trigger.delay_seconds === 0 && FINBITE_API_KEY && FINBITE_WHATSAPP_CLIENT) {
          const result = await sendViaFinbiteV2(
            resolvedPhone,
            FINBITE_API_KEY,
            FINBITE_WHATSAPP_CLIENT,
            { type: "template", template_name: template.template_name, variables }
          );

          await supabase.from("wa_message_logs").update({
            status: result.success ? "sent" : "failed",
            provider_message_id: result.provider_message_id || null,
            error_message: result.error || null,
            sent_at: result.success ? new Date().toISOString() : null,
            failed_at: result.success ? null : new Date().toISOString(),
          }).eq("id", logEntry?.id);
        }

        triggered++;
      }

      return new Response(JSON.stringify({ success: true, triggered, event }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Route: send_template ----
    if (request.action === "send_template") {
      if (!FINBITE_API_KEY || !FINBITE_WHATSAPP_CLIENT) {
        return new Response(JSON.stringify({ error: "WhatsApp not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log first
      const { data: logEntry } = await supabase.from("wa_message_logs").insert({
        phone: request.phone,
        customer_name: request.customer_name || null,
        template_name: request.template_name,
        message_type: "template",
        lead_id: request.lead_id || null,
        variables: request.variables || {},
        status: "queued",
        provider: "finbite",
      }).select("id").single();

      // Send
      const result = await sendViaFinbiteV2(
        request.phone,
        FINBITE_API_KEY,
        FINBITE_WHATSAPP_CLIENT,
        { type: "template", template_name: request.template_name, variables: request.variables }
      );

      await supabase.from("wa_message_logs").update({
        status: result.success ? "sent" : "failed",
        provider_message_id: result.provider_message_id || null,
        error_message: result.error || null,
        sent_at: result.success ? new Date().toISOString() : null,
        failed_at: result.success ? null : new Date().toISOString(),
      }).eq("id", logEntry?.id);

      return new Response(JSON.stringify({ success: result.success, ...result }), {
        status: result.success ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Route: send_text ----
    if (request.action === "send_text") {
      if (!FINBITE_API_KEY || !FINBITE_WHATSAPP_CLIENT) {
        return new Response(JSON.stringify({ error: "WhatsApp not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log
      const { data: logEntry } = await supabase.from("wa_message_logs").insert({
        phone: request.phone,
        customer_name: request.customer_name || null,
        message_type: "text",
        message_content: request.message,
        lead_id: request.lead_id || null,
        status: "queued",
        provider: "finbite",
      }).select("id").single();

      // Try v2 first, fallback to v1
      let result = await sendViaFinbiteV2(
        request.phone,
        FINBITE_API_KEY,
        FINBITE_WHATSAPP_CLIENT,
        { type: "text", message: request.message }
      );

      // Fallback to v1 if v2 fails
      if (!result.success && FINBITE_CLIENT_ID) {
        console.log("v2 failed, trying v1 fallback...");
        result = await sendViaFinbiteV1(
          request.phone,
          FINBITE_CLIENT_ID,
          FINBITE_API_KEY,
          FINBITE_WHATSAPP_CLIENT,
          request.message
        );
      }

      await supabase.from("wa_message_logs").update({
        status: result.success ? "sent" : "failed",
        provider_message_id: result.provider_message_id || null,
        error_message: result.error || null,
        sent_at: result.success ? new Date().toISOString() : null,
        failed_at: result.success ? null : new Date().toISOString(),
      }).eq("id", logEntry?.id);

      return new Response(JSON.stringify({ success: result.success, ...result }), {
        status: result.success ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: send_template, send_text, trigger_event" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Messaging service error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
