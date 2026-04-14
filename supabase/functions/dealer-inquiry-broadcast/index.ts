import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhone(phone: string): { full: string; short: string; valid: boolean } {
  const clean = phone.replace(/\D/g, "").replace(/^0+/, "");
  let short = clean;
  if (clean.startsWith("91") && clean.length === 12) short = clean.slice(2);
  return { full: `91${short}`, short, valid: /^[6-9]\d{9}$/.test(short) };
}

/**
 * Send a Meta-approved template message (opens 24-hour window)
 */
async function sendTemplate(
  token: string,
  phoneNumberId: string,
  to: string,
  templateName: string,
  variables?: string[]
): Promise<{ success: boolean; provider_message_id?: string; error?: string }> {
  const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;

  const components: unknown[] = [];
  if (variables && variables.length > 0) {
    components.push({
      type: "body",
      parameters: variables.map((val) => ({ type: "text", text: val })),
    });
  }

  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      ...(components.length > 0 ? { components } : {}),
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  const result = await resp.json();
  if (resp.ok && result.messages?.[0]?.id) {
    return { success: true, provider_message_id: result.messages[0].id };
  }
  return { success: false, error: result.error?.message || JSON.stringify(result) };
}

/**
 * Send a free-text message (only works within 24-hour window)
 */
async function sendText(
  token: string,
  phoneNumberId: string,
  to: string,
  message: string
): Promise<{ success: boolean; provider_message_id?: string; error?: string }> {
  const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body: message },
    }),
  });

  const result = await resp.json();
  if (resp.ok && result.messages?.[0]?.id) {
    return { success: true, provider_message_id: result.messages[0].id };
  }
  return { success: false, error: result.error?.message || JSON.stringify(result) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const {
      phones, message, brand, model, variant, color,
      ai_followup_enabled, ai_followup_script, ai_followup_delay_minutes,
      recipients,
      template_name,       // Meta-approved template name (e.g. "grabyourcarintroduction")
      template_variables,  // Array of variable values for the template
      send_mode,           // "template_only" | "template_then_text" | "text_only"
    } = await req.json();

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return new Response(JSON.stringify({ error: "phones array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine send mode
    const mode = send_mode || (template_name ? "template_then_text" : "text_only");
    const metaTemplate = template_name || "grabyourcarintroduction";

    // Create campaign record
    const campaignName = `${brand || "All"} ${model || ""} ${variant || ""} — ${new Date().toLocaleDateString("en-IN")}`.trim();
    const { data: campaign } = await supabase.from("dealer_inquiry_campaigns").insert({
      campaign_name: campaignName,
      brand: brand || null,
      model: model || null,
      variant: variant || null,
      color: color || null,
      message_template: message || metaTemplate,
      total_dealers: phones.length,
      ai_followup_enabled: ai_followup_enabled || false,
      ai_followup_script: ai_followup_script || null,
      ai_followup_delay_minutes: ai_followup_delay_minutes || 3,
      status: "sending",
    }).select("id").single();

    let sent = 0, failed = 0;
    const errors: string[] = [];
    const recipientRows: any[] = [];

    for (let i = 0; i < phones.length; i++) {
      const rawPhone = phones[i];
      const phone = normalizePhone(rawPhone);
      const recipientInfo = recipients?.[i] || {};

      if (!phone.valid) {
        failed++;
        errors.push(`Invalid: ${rawPhone}`);
        recipientRows.push({
          campaign_id: campaign?.id,
          dealer_rep_id: recipientInfo.dealer_rep_id || null,
          dealer_name: recipientInfo.dealer_name || null,
          rep_name: recipientInfo.rep_name || null,
          phone: rawPhone,
          send_status: "invalid",
        });
        continue;
      }

      try {
        let templateResult = { success: true, provider_message_id: undefined as string | undefined, error: undefined as string | undefined };
        let textResult = { success: true, provider_message_id: undefined as string | undefined, error: undefined as string | undefined };

        // Step 1: Send approved template (opens 24-hour window)
        if (mode === "template_only" || mode === "template_then_text") {
          templateResult = await sendTemplate(
            WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
            phone.full, metaTemplate, template_variables || []
          );
          
          if (!templateResult.success) {
            failed++;
            errors.push(`${rawPhone}: Template failed - ${templateResult.error}`);
            recipientRows.push({
              campaign_id: campaign?.id,
              dealer_rep_id: recipientInfo.dealer_rep_id || null,
              dealer_name: recipientInfo.dealer_name || null,
              rep_name: recipientInfo.rep_name || null,
              phone: rawPhone,
              send_status: "failed",
            });
            await new Promise(r => setTimeout(r, 200));
            continue;
          }
        }

        // Step 2: Send detailed text message (after template opens window)
        if (mode === "template_then_text" && message && message.trim()) {
          // Wait 1.5s for template to be delivered and window to open
          await new Promise(r => setTimeout(r, 1500));
          textResult = await sendText(
            WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
            phone.full, message
          );
          // Text failure is non-critical if template succeeded
          if (!textResult.success) {
            console.warn(`Text follow-up failed for ${rawPhone}: ${textResult.error}`);
          }
        } else if (mode === "text_only" && message) {
          textResult = await sendText(
            WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
            phone.full, message
          );
        }

        const overallSuccess = templateResult.success || textResult.success;
        if (overallSuccess) {
          sent++;
          recipientRows.push({
            campaign_id: campaign?.id,
            dealer_rep_id: recipientInfo.dealer_rep_id || null,
            dealer_name: recipientInfo.dealer_name || null,
            rep_name: recipientInfo.rep_name || null,
            phone: rawPhone,
            send_status: "sent",
            sent_at: new Date().toISOString(),
          });
        } else {
          failed++;
          errors.push(`${rawPhone}: ${textResult.error || "Send error"}`);
          recipientRows.push({
            campaign_id: campaign?.id,
            dealer_rep_id: recipientInfo.dealer_rep_id || null,
            dealer_name: recipientInfo.dealer_name || null,
            rep_name: recipientInfo.rep_name || null,
            phone: rawPhone,
            send_status: "failed",
          });
        }
      } catch (e) {
        failed++;
        errors.push(`${rawPhone}: ${e instanceof Error ? e.message : "Send error"}`);
        recipientRows.push({
          campaign_id: campaign?.id,
          dealer_rep_id: recipientInfo.dealer_rep_id || null,
          phone: rawPhone,
          send_status: "failed",
        });
      }

      await new Promise(r => setTimeout(r, 200));
    }

    // Insert recipient tracking rows
    if (campaign?.id && recipientRows.length > 0) {
      await supabase.from("dealer_inquiry_recipients").insert(recipientRows);
    }

    // Update campaign counts
    if (campaign?.id) {
      await supabase.from("dealer_inquiry_campaigns").update({
        sent_count: sent,
        failed_count: failed,
        status: sent > 0 ? "sent" : "failed",
      }).eq("id", campaign.id);
    }

    // Schedule AI follow-up if enabled
    if (ai_followup_enabled && campaign?.id && sent > 0) {
      const delayMs = (ai_followup_delay_minutes || 3) * 60 * 1000;
      const followupUrl = `${SUPABASE_URL}/functions/v1/dealer-ai-followup`;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
      
      setTimeout(async () => {
        try {
          await fetch(followupUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${anonKey}` },
            body: JSON.stringify({ campaign_id: campaign.id }),
          });
          console.log(`AI follow-up triggered for campaign ${campaign.id}`);
        } catch (e) {
          console.error("Failed to trigger AI follow-up:", e);
        }
      }, delayMs);

      console.log(`AI follow-up scheduled in ${ai_followup_delay_minutes} minutes for campaign ${campaign.id}`);
    }

    // Legacy log
    await supabase.from("dealer_broadcast_logs").insert({
      broadcast_type: "dealer_inquiry",
      message_template: message || metaTemplate,
      recipient_count: phones.length,
      sent_by: "admin",
      status: failed === phones.length ? "failed" : "sent",
      details: { brand, model, variant, color, sent, failed, campaign_id: campaign?.id, mode, template: metaTemplate, errors: errors.slice(0, 20) },
    });

    console.log(`Dealer inquiry broadcast (${mode}): ${sent} sent, ${failed} failed / ${phones.length}`);

    return new Response(JSON.stringify({
      success: true,
      campaign_id: campaign?.id,
      summary: { total: phones.length, sent, failed, mode },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Dealer inquiry broadcast error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
