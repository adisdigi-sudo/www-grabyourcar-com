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

async function hasOpenConversationWindow(supabase: any, phone: string): Promise<boolean> {
  const now = new Date();

  const { data: convo } = await supabase
    .from("wa_conversations")
    .select("window_expires_at")
    .eq("phone", phone)
    .maybeSingle();

  if (convo?.window_expires_at && new Date(convo.window_expires_at) > now) {
    return true;
  }

  const { data: legacy } = await supabase
    .from("whatsapp_conversations")
    .select("last_message_at")
    .eq("phone_number", phone)
    .maybeSingle();

  return Boolean(
    legacy?.last_message_at &&
    now.getTime() - new Date(legacy.last_message_at).getTime() < 24 * 60 * 60 * 1000,
  );
}

async function resolveApprovedTemplateName(supabase: any, preferredTemplate?: string | null): Promise<string | null> {
  const candidates = [preferredTemplate, "grabyourcarintroduction", "insurancefollowup", "welcome_new_lead"]
    .filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const { data } = await supabase
      .from("wa_templates")
      .select("name")
      .eq("name", candidate)
      .eq("status", "approved")
      .limit(1);

    if (data?.[0]?.name) return data[0].name;
  }

  const { data: fallback } = await supabase
    .from("wa_templates")
    .select("name")
    .eq("status", "approved")
    .limit(1);

  return fallback?.[0]?.name || null;
}

function mergeTrackingData(existing: Record<string, unknown> | null, updates: Record<string, unknown>) {
  return {
    ...(existing && typeof existing === "object" ? existing : {}),
    ...updates,
  };
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

  // Only add components if there are actual variables
  const hasVars = variables && variables.length > 0 && variables.some(v => v && v.trim() !== "");
  
  const templateObj: Record<string, unknown> = {
    name: templateName,
    language: { code: "en" },
  };

  if (hasVars) {
    templateObj.components = [{
      type: "body",
      parameters: variables!.filter(v => v && v.trim()).map((val) => ({ type: "text", text: val })),
    }];
  }

  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: templateObj,
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
    const approvedTemplate = await resolveApprovedTemplateName(supabase, metaTemplate);

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
        const windowOpen = await hasOpenConversationWindow(supabase, phone.full);
        const shouldAutoOpenWindow = mode === "text_only" && !windowOpen;
        const shouldSendTemplate = mode === "template_only" || mode === "template_then_text" || shouldAutoOpenWindow;
        const requiresTextMessage = (mode === "text_only" || mode === "template_then_text") && Boolean(message && message.trim());
        const actualMode = shouldAutoOpenWindow ? "template_then_text" : mode;
        const activeTemplateName = shouldSendTemplate ? approvedTemplate : null;

        if (shouldSendTemplate && !activeTemplateName) {
          failed++;
          errors.push(`${rawPhone}: No approved Meta template is available to open the chat window`);
          recipientRows.push({
            campaign_id: campaign?.id,
            dealer_rep_id: recipientInfo.dealer_rep_id || null,
            dealer_name: recipientInfo.dealer_name || null,
            rep_name: recipientInfo.rep_name || null,
            phone: rawPhone,
            send_status: "failed",
            qualification_data: mergeTrackingData(null, {
              requested_mode: mode,
              actual_mode: actualMode,
              conversation_window_open: windowOpen,
              opener_template_name: null,
              last_error: "No approved template available",
            }),
          });
          continue;
        }

        let templateResult = { success: !shouldSendTemplate, provider_message_id: undefined as string | undefined, error: undefined as string | undefined };
        let textResult = { success: !requiresTextMessage, provider_message_id: undefined as string | undefined, error: undefined as string | undefined };

        // Step 1: Send approved template (opens 24-hour window when needed)
        if (shouldSendTemplate && activeTemplateName) {
          templateResult = await sendTemplate(
            WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
            phone.full, activeTemplateName, template_variables || []
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
              qualification_data: mergeTrackingData(null, {
                requested_mode: mode,
                actual_mode: actualMode,
                conversation_window_open: windowOpen,
                opener_template_name: activeTemplateName,
                provider_message_id: templateResult.provider_message_id || null,
                template_provider_message_id: templateResult.provider_message_id || null,
                text_provider_message_id: null,
                last_error: templateResult.error || "Template send failed",
              }),
            });
            await new Promise(r => setTimeout(r, 200));
            continue;
          }
        }

        // Step 2: Send detailed text message (after template opens window if required)
        if (requiresTextMessage) {
          if (shouldSendTemplate) {
            // Wait 1.5s for template to be accepted and the chat window to open
            await new Promise(r => setTimeout(r, 1500));
          }
          textResult = await sendText(
            WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
            phone.full, message
          );
        }

        const overallSuccess = requiresTextMessage ? textResult.success : templateResult.success;
        if (overallSuccess) {
          sent++;
          recipientRows.push({
            campaign_id: campaign?.id,
            dealer_rep_id: recipientInfo.dealer_rep_id || null,
            dealer_name: recipientInfo.dealer_name || null,
            rep_name: recipientInfo.rep_name || null,
            phone: rawPhone,
            send_status: "submitted",
            sent_at: new Date().toISOString(),
            qualification_data: mergeTrackingData(null, {
              requested_mode: mode,
              actual_mode: actualMode,
              conversation_window_open: windowOpen,
              opener_template_name: activeTemplateName,
              provider_message_id: textResult.provider_message_id || templateResult.provider_message_id || null,
              template_provider_message_id: templateResult.provider_message_id || null,
              text_provider_message_id: textResult.provider_message_id || null,
            }),
          });
        } else {
          failed++;
          errors.push(`${rawPhone}: ${textResult.error || templateResult.error || "Send error"}`);
          recipientRows.push({
            campaign_id: campaign?.id,
            dealer_rep_id: recipientInfo.dealer_rep_id || null,
            dealer_name: recipientInfo.dealer_name || null,
            rep_name: recipientInfo.rep_name || null,
            phone: rawPhone,
            send_status: "failed",
            qualification_data: mergeTrackingData(null, {
              requested_mode: mode,
              actual_mode: actualMode,
              conversation_window_open: windowOpen,
              opener_template_name: activeTemplateName,
              provider_message_id: textResult.provider_message_id || templateResult.provider_message_id || null,
              template_provider_message_id: templateResult.provider_message_id || null,
              text_provider_message_id: textResult.provider_message_id || null,
              last_error: textResult.error || templateResult.error || "Send error",
            }),
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
          qualification_data: mergeTrackingData(null, {
            requested_mode: mode,
            actual_mode: mode,
            last_error: e instanceof Error ? e.message : "Send error",
          }),
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
        status: sent > 0 ? "sending" : "failed",
      }).eq("id", campaign.id);
    }

    const followupScheduled = Boolean(ai_followup_enabled && campaign?.id && sent > 0);

    // Schedule AI follow-up if enabled and at least one message really sent
    if (followupScheduled) {
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
      details: { brand, model, variant, color, sent, failed, campaign_id: campaign?.id, mode, template: metaTemplate, followup_scheduled: followupScheduled, errors: errors.slice(0, 20) },
    });

    console.log(`Dealer inquiry broadcast (${mode}): ${sent} submitted, ${failed} failed / ${phones.length}`);

    return new Response(JSON.stringify({
      success: true,
      campaign_id: campaign?.id,
      summary: { total: phones.length, sent, failed, mode },
      followup_scheduled: followupScheduled,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Dealer inquiry broadcast error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
