import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * WhatsApp Automation Trigger
 * Processes CRM events and fires matching automation rules.
 * Called from the frontend or via database triggers when events occur.
 * 
 * Provider-agnostic: uses wa_message_queue + wa-queue-processor for delivery.
 */

interface TriggerPayload {
  event: string;
  leadId?: string;
  phone?: string;
  name?: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing config" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const payload: TriggerPayload = await req.json();

    if (!payload.event) {
      return new Response(JSON.stringify({ error: "event required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Automation trigger: ${payload.event}`, payload);

    // 1. Find matching active rules
    const { data: rules } = await supabase
      .from("wa_automation_rules")
      .select("*")
      .eq("trigger_event", payload.event)
      .eq("is_active", true);

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ triggered: 0, message: "No matching rules" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Resolve phone number
    let phone = payload.phone;
    let leadName = payload.name || "Customer";
    let leadId = payload.leadId;

    if (!phone && leadId) {
      const { data: lead } = await supabase
        .from("leads")
        .select("phone, name, city, car_model, email")
        .eq("id", leadId)
        .single();
      if (lead) {
        phone = lead.phone;
        leadName = lead.name || leadName;
      }
    }

    if (!phone) {
      return new Response(JSON.stringify({ error: "No phone number available" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Check opt-out
    const cleanPhone = phone.replace(/\D/g, "").replace(/^91/, "");
    const { data: optOut } = await supabase
      .from("wa_opt_outs")
      .select("id")
      .or(`phone.eq.${cleanPhone},phone.eq.91${cleanPhone}`)
      .limit(1);

    if (optOut && optOut.length > 0) {
      return new Response(JSON.stringify({ triggered: 0, message: "User opted out" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Process each matching rule
    let triggered = 0;
    const variables = {
      name: leadName,
      phone: phone,
      car_model: payload.data?.car_model || payload.data?.car_name || "your dream car",
      city: payload.data?.city || "",
      price: payload.data?.price || "",
      variant: payload.data?.variant_name || "",
      emi: payload.data?.emi_amount || "",
      brand: payload.data?.car_brand || "",
      ...payload.data,
    };

    for (const rule of rules) {
      // Check cooldown: don't re-send if recently sent for same lead+rule
      if (leadId) {
        const cooldownCutoff = new Date(Date.now() - (rule.cooldown_hours || 24) * 3600000).toISOString();
        const { data: recent } = await supabase
          .from("wa_message_queue")
          .select("id")
          .eq("lead_id", leadId)
          .eq("automation_rule_id", rule.id)
          .gte("created_at", cooldownCutoff)
          .limit(1);

        if (recent && recent.length > 0) {
          console.log(`Skipping rule ${rule.name}: cooldown active for lead ${leadId}`);
          // Update suppressed count
          await supabase.from("wa_automation_rules")
            .update({ total_suppressed: (rule.total_suppressed || 0) + 1 })
            .eq("id", rule.id);
          continue;
        }
      }

      // Check max sends per lead
      if (leadId && rule.max_sends_per_lead > 0) {
        const { count } = await supabase
          .from("wa_message_queue")
          .select("id", { count: "exact", head: true })
          .eq("lead_id", leadId)
          .eq("automation_rule_id", rule.id)
          .in("status", ["sent", "delivered", "read"]);

        if ((count || 0) >= rule.max_sends_per_lead) {
          console.log(`Skipping rule ${rule.name}: max sends reached for lead ${leadId}`);
          await supabase.from("wa_automation_rules")
            .update({ total_suppressed: (rule.total_suppressed || 0) + 1 })
            .eq("id", rule.id);
          continue;
        }
      }

      // Build personalized message
      let messageContent = rule.message_content || "";

      // If rule has a template, fetch it
      if (rule.template_id) {
        const { data: tmpl } = await supabase
          .from("whatsapp_templates")
          .select("content")
          .eq("id", rule.template_id)
          .single();
        if (tmpl) messageContent = tmpl.content;
      }

      // Replace variables
      for (const [key, value] of Object.entries(variables)) {
        messageContent = messageContent.replace(
          new RegExp(`\\{${key}\\}`, "gi"),
          String(value || "")
        );
      }

      // Calculate scheduled send time (with delay)
      const sendAt = rule.delay_minutes > 0
        ? new Date(Date.now() + rule.delay_minutes * 60000).toISOString()
        : null;

      // Queue the message
      await supabase.from("wa_message_queue").insert({
        phone,
        lead_id: leadId || null,
        automation_rule_id: rule.id,
        message_content: messageContent,
        status: "queued",
        priority: 3, // Higher priority than campaigns
        scheduled_at: sendAt,
        variables_data: variables,
      });

      // Update rule stats
      await supabase.from("wa_automation_rules")
        .update({
          total_triggered: (rule.total_triggered || 0) + 1,
          last_triggered_at: new Date().toISOString(),
        })
        .eq("id", rule.id);

      triggered++;
    }

    // 5. Trigger the queue processor if messages were queued
    if (triggered > 0) {
      const processorUrl = `${SUPABASE_URL}/functions/v1/wa-queue-processor`;
      fetch(processorUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ batchSize: 10 }),
      }).catch(err => console.error("Failed to trigger processor:", err));
    }

    return new Response(JSON.stringify({
      success: true,
      triggered,
      event: payload.event,
      rulesChecked: rules.length,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Automation trigger error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
