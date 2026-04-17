import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * AI Communication Brain
 * 
 * Autonomous AI system that:
 * 1. Scans all 11 verticals every 15 min
 * 2. Picks high-priority customers needing outreach
 * 3. Uses Lovable AI (Gemini) to decide WHO/WHAT/WHEN
 * 4. Auto-sends if confidence >= threshold
 * 5. Otherwise queues for manager approval
 * 6. Logs everything for learning
 */

interface VerticalScan {
  vertical: string;
  table: string;
  phoneCol: string;
  nameCol: string;
  stageCol: string;
  contactedCol?: string;
}

const VERTICAL_SCANS: VerticalScan[] = [
  { vertical: 'sales',         table: 'leads',                phoneCol: 'phone',   nameCol: 'name',           stageCol: 'status' },
  { vertical: 'insurance',     table: 'insurance_clients',    phoneCol: 'phone',   nameCol: 'customer_name',  stageCol: 'pipeline_stage' },
  { vertical: 'loans',         table: 'loan_applications',    phoneCol: 'phone',   nameCol: 'customer_name',  stageCol: 'pipeline_stage' },
  { vertical: 'rentals',       table: 'rental_bookings',      phoneCol: 'phone',   nameCol: 'customer_name',  stageCol: 'booking_status' },
  { vertical: 'hsrp',          table: 'hsrp_bookings',        phoneCol: 'mobile',  nameCol: 'owner_name',     stageCol: 'order_status' },
  { vertical: 'accessories',   table: 'accessory_orders',     phoneCol: 'shipping_phone', nameCol: 'shipping_name', stageCol: 'order_status' },
];

async function callAI(prompt: string, model: string, apiKey: string): Promise<any> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: `You are an expert customer engagement AI for Grabyourcar (India's car ecosystem: sales, insurance, loans, rentals, accessories, HSRP plates).
Your job: decide if a customer needs outreach, what to say, and how confident you are.

RULES:
- Reply in customer's likely language (Hindi/English/Hinglish based on Indian context)
- Be warm, helpful, NOT pushy
- Reference their specific interest (car model, policy type, loan stage)
- Keep WhatsApp messages under 300 characters
- For high-intent leads (recent activity, asked for quote): confidence 85-95
- For dormant leads (no activity 7+ days): confidence 60-75
- For just-contacted leads (< 4 hours ago): confidence < 50 (skip)
- ALWAYS return valid JSON matching the schema`,
        },
        { role: "user", content: prompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "decide_outreach",
          description: "Decide if and how to reach out to this customer",
          parameters: {
            type: "object",
            properties: {
              should_contact: { type: "boolean", description: "Whether to contact this customer now" },
              channel: { type: "string", enum: ["whatsapp", "email", "skip"], description: "Best channel for this customer" },
              message: { type: "string", description: "Personalized message to send (in customer's likely language)" },
              subject: { type: "string", description: "Email subject (only if channel=email)" },
              reasoning: { type: "string", description: "Why you chose this action (1-2 sentences)" },
              confidence: { type: "number", minimum: 0, maximum: 100, description: "Confidence score 0-100" },
              urgency: { type: "string", enum: ["high", "medium", "low"], description: "How urgent this outreach is" },
            },
            required: ["should_contact", "channel", "message", "reasoning", "confidence", "urgency"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "decide_outreach" } },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${txt.substring(0, 200)}`);
  }

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in AI response");
  return JSON.parse(toolCall.function.arguments);
}

async function sendWhatsApp(token: string, phoneId: string, to: string, message: string): Promise<boolean> {
  const cleanPhone = to.replace(/\D/g, "").replace(/^91/, "");
  if (cleanPhone.length < 10) return false;

  const resp = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: `91${cleanPhone}`,
      type: "text",
      text: { preview_url: false, body: message },
    }),
  });

  if (!resp.ok) {
    console.error("WA send failed:", await resp.text());
    return false;
  }
  const result = await resp.json();
  return !!result.messages?.[0]?.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const summary = { scanned: 0, decisions: 0, auto_sent: 0, queued: 0, skipped: 0, failed: 0, by_vertical: {} as Record<string, number> };

  try {
    // Load config
    const { data: config } = await supabase.from("ai_brain_config").select("*").limit(1).single();
    if (!config?.is_enabled) {
      return new Response(JSON.stringify({ ok: true, disabled: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Business hours check
    if (config.business_hours_only) {
      const istHour = (new Date().getUTCHours() + 5.5) % 24;
      if (istHour < config.business_start_hour || istHour >= config.business_end_hour) {
        return new Response(JSON.stringify({ ok: true, outside_business_hours: true, ist_hour: istHour }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const enabledVerticals = new Set(config.enabled_verticals || []);
    const threshold = Number(config.auto_send_threshold) || 90;
    const maxPerRun = Number(config.max_decisions_per_run) || 50;
    const model = config.ai_model || "google/gemini-2.5-flash";

    // Scan each vertical
    for (const scan of VERTICAL_SCANS) {
      if (!enabledVerticals.has(scan.vertical)) continue;
      if (summary.decisions >= maxPerRun) break;

      try {
        // Pull leads from last 30 days, not contacted in last 24h
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: rows, error } = await supabase
          .from(scan.table)
          .select("*")
          .gte("created_at", since)
          .order("updated_at", { ascending: false })
          .limit(20);

        if (error) {
          console.error(`Scan ${scan.vertical} error:`, error.message);
          continue;
        }
        if (!rows || rows.length === 0) continue;

        summary.scanned += rows.length;

        for (const row of rows) {
          if (summary.decisions >= maxPerRun) break;
          const phone = (row[scan.phoneCol] as string)?.toString().trim();
          if (!phone || phone.length < 10) continue;

          // Check: did we already decide for this customer in last 24h?
          const { data: recent } = await supabase
            .from("ai_brain_decisions")
            .select("id")
            .eq("customer_phone", phone)
            .eq("vertical", scan.vertical)
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(1);
          if (recent && recent.length > 0) continue;

          const name = row[scan.nameCol] || "Customer";
          const stage = row[scan.stageCol] || "unknown";

          // Build context for AI
          const context = `
Vertical: ${scan.vertical}
Customer: ${name}
Stage: ${stage}
Created: ${row.created_at}
Last updated: ${row.updated_at}
Days since created: ${Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000)}
${row.vehicle_make ? `Vehicle: ${row.vehicle_make} ${row.vehicle_model || ''}` : ''}
${row.budget ? `Budget: ₹${row.budget}` : ''}
${row.notes ? `Notes: ${row.notes.substring(0, 200)}` : ''}
${row.policy_expiry_date ? `Policy expires: ${row.policy_expiry_date}` : ''}
${row.contact_attempts ? `Previous contact attempts: ${row.contact_attempts}` : ''}

Decide if this customer needs outreach right now. Be smart — don't spam.`;

          let decision: any;
          try {
            decision = await callAI(context, model, LOVABLE_API_KEY);
          } catch (err: any) {
            console.error(`AI decide failed for ${phone}:`, err.message);
            summary.failed++;
            continue;
          }

          if (!decision.should_contact || decision.channel === "skip" || decision.confidence < 50) {
            summary.skipped++;
            continue;
          }

          summary.decisions++;
          summary.by_vertical[scan.vertical] = (summary.by_vertical[scan.vertical] || 0) + 1;

          const shouldAutoSend = decision.confidence >= threshold && decision.channel === "whatsapp";
          let status: string = shouldAutoSend ? "auto_sent" : "pending";
          let sentAt: string | null = null;
          let errorMsg: string | null = null;

          // Auto-send if high confidence
          if (shouldAutoSend && WA_TOKEN && WA_PHONE_ID) {
            const sent = await sendWhatsApp(WA_TOKEN, WA_PHONE_ID, phone, decision.message);
            if (sent) {
              sentAt = new Date().toISOString();
              summary.auto_sent++;
            } else {
              status = "failed";
              errorMsg = "WhatsApp send failed";
              summary.failed++;
            }
          } else {
            summary.queued++;
          }

          // Log decision
          await supabase.from("ai_brain_decisions").insert({
            customer_phone: phone,
            customer_name: name,
            customer_id: row.customer_id || null,
            vertical: scan.vertical,
            source_table: scan.table,
            source_record_id: row.id,
            action_type: decision.channel,
            message_channel: decision.channel,
            message_content: decision.message,
            message_subject: decision.subject || null,
            reasoning: decision.reasoning,
            confidence_score: decision.confidence,
            status,
            auto_send: shouldAutoSend,
            sent_at: sentAt,
            ai_model_used: model,
            error_message: errorMsg,
            context_snapshot: { stage, urgency: decision.urgency, days_old: Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86400000) },
          });

          await new Promise(r => setTimeout(r, 250)); // gentle pacing
        }
      } catch (vErr: any) {
        console.error(`Vertical ${scan.vertical} error:`, vErr.message);
      }
    }

    // Update last run
    await supabase.from("ai_brain_config").update({
      last_run_at: new Date().toISOString(),
      last_run_summary: summary,
    }).eq("id", config.id);

    return new Response(JSON.stringify({ ok: true, summary }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("AI Brain fatal:", err);
    return new Response(JSON.stringify({ error: err.message, summary }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
