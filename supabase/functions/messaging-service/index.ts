import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Messaging Service — Provider-Agnostic Abstraction Layer
 *
 * Delegates all WhatsApp sends to `whatsapp-send` (the central gateway).
 *
 * Supports:
 *   - send_template: Send an approved template by name
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

function normalizeTemplateVariables(variables?: Record<string, string>) {
  if (!variables) return undefined;

  const entries = Object.entries(variables).filter(([, value]) => value !== undefined && value !== null && String(value).trim().length > 0);
  if (entries.length === 0) return undefined;

  return entries.reduce<Record<string, string>>((acc, [key, value], index) => {
    const normalizedKey = /^var_\d+$/.test(key) || /^\d+$/.test(key) ? key.replace(/^\d+$/, (match) => `var_${match}`) : key;
    acc[normalizedKey || `var_${index + 1}`] = String(value);
    return acc;
  }, {});
}

type ServiceRequest = SendTemplateRequest | SendTextRequest | TriggerEventRequest;

// ── Send via whatsapp-send gateway ──
async function sendViaGateway(
  supabaseUrl: string,
  serviceRoleKey: string,
  phone: string,
  payload: { messageType: "text"; message: string } | { messageType: "template"; template_name: string; template_variables?: Record<string, string> },
  context?: { name?: string; logEvent?: string; lead_id?: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const body: Record<string, unknown> = {
    to: phone,
    ...payload,
    name: context?.name,
    logEvent: context?.logEvent,
    lead_id: context?.lead_id,
  };

  const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  return {
    success: result.success === true,
    messageId: result.messageId,
    error: result.error,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing backend config" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const request: ServiceRequest = await req.json();

    // ── Route: trigger_event ──
    if (request.action === "trigger_event") {
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

        const variables: Record<string, string> = { name: resolvedName, ...data };

        // Send immediately (no delay) or mark as scheduled
        if (trigger.delay_seconds === 0) {
          const normalizedVariables = normalizeTemplateVariables(variables);
          const result = await sendViaGateway(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
            resolvedPhone,
            { messageType: "template", template_name: template.template_name, template_variables: normalizedVariables },
            { name: resolvedName, logEvent: `trigger:${event}`, lead_id }
          );

          // whatsapp-send already logs, but update with trigger context if needed
          if (!result.success) {
            console.warn(`Trigger ${event} send failed:`, result.error);
          }
        } else {
          // Schedule for later — log as scheduled
          await supabase.from("wa_message_logs").insert({
            phone: resolvedPhone,
            customer_name: resolvedName,
            template_name: template.template_name,
            template_id: template.id,
            message_type: "template",
            trigger_event: event,
            lead_id: lead_id || null,
            variables,
            status: "scheduled",
            provider: "pending",
          });
        }

        triggered++;
      }

      return new Response(JSON.stringify({ success: true, triggered, event }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Route: send_template ──
    if (request.action === "send_template") {
      const normalizedVariables = normalizeTemplateVariables(request.variables);
      const result = await sendViaGateway(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        request.phone,
        { messageType: "template", template_name: request.template_name, template_variables: normalizedVariables },
        { name: request.customer_name, logEvent: "messaging_service_template", lead_id: request.lead_id }
      );

      return new Response(JSON.stringify({ success: result.success, ...result }), {
        status: result.success ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Route: send_text ──
    if (request.action === "send_text") {
      const result = await sendViaGateway(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        request.phone,
        { messageType: "text", message: request.message },
        { name: request.customer_name, logEvent: "messaging_service_text", lead_id: request.lead_id }
      );

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
