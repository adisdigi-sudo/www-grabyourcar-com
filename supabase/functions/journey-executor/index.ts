import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Journey Executor — Direct Meta WhatsApp Cloud API
 * Processes pending cross-vertical triggers and sends WhatsApp messages.
 */

// Fallback messages if DB templates not found
const JOURNEY_MESSAGES_FALLBACK: Record<string, (name: string) => string> = {
  car_to_insurance: (name) =>
    `Hi ${name}! 🚗 Congratulations on your car inquiry with Grabyourcar! Did you know we also offer the best car insurance deals? Protect your new ride with comprehensive coverage at unbeatable rates. Reply YES to get a free quote!`,
  car_to_loan: (name) =>
    `Hey ${name}! 💰 Looking at cars on Grabyourcar? We can help you get pre-approved for a car loan with the lowest EMIs! Check your eligibility in 2 minutes — no documents needed. Reply YES to know more!`,
  loan_to_car: (name) =>
    `Hi ${name}! 🎉 Great news — your car loan eligibility looks strong! Now let's find your dream car. Browse 75+ models on Grabyourcar with the best deals. Reply YES and our advisor will share personalized recommendations!`,
  insurance_to_accessories: (name) =>
    `Hey ${name}! 🛡️ Your car is insured — now make it stunning! Check out premium car accessories on Grabyourcar: seat covers, dash cams, alloy wheels & more. Reply YES for exclusive member discounts!`,
  car_to_accessories: (name) =>
    `Hi ${name}! 🚗✨ Complete your car purchase with premium accessories! We have 500+ products — floor mats, perfumes, phone holders & more. Reply YES for a special first-order discount!`,
  loan_to_insurance: (name) =>
    `Hey ${name}! 💳 Since you're exploring car financing, don't forget about insurance! Grabyourcar offers the best insurance deals bundled with your loan. Reply YES for a combined quote!`,
};

async function getJourneyMessage(supabase: any, triggerType: string, name: string): Promise<string> {
  const slug = `journey_${triggerType}`;
  const { data } = await supabase
    .from("crm_message_templates")
    .select("body_text")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  if (data?.body_text) {
    return data.body_text.replace(/\{\{name\}\}/g, name);
  }
  const fallback = JOURNEY_MESSAGES_FALLBACK[triggerType];
  return fallback ? fallback(name) : `Hi ${name}, we have something special for you from Grabyourcar!`;
}

async function sendViaMeta(
  token: string,
  phoneNumberId: string,
  to: string,
  message: string
): Promise<boolean> {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body: message },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("Meta API send failed:", errText);
    return false;
  }

  const result = await resp.json();
  return !!result.messages?.[0]?.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { action = "execute_pending", trigger_id } = await req.json().catch(() => ({}));
    const results = { processed: 0, sent: 0, failed: 0 };

    let triggersToProcess: any[] = [];

    if (action === "execute_single" && trigger_id) {
      const { data } = await supabase
        .from("customer_journey_triggers")
        .select("*, unified_customers(phone, customer_name, city)")
        .eq("id", trigger_id).limit(1);
      triggersToProcess = data || [];
    } else {
      const { data } = await supabase
        .from("customer_journey_triggers")
        .select("*, unified_customers(phone, customer_name, city)")
        .eq("status", "pending")
        .order("created_at", { ascending: true }).limit(100);
      triggersToProcess = data || [];
    }

    for (const trigger of triggersToProcess) {
      results.processed++;

      const customer = trigger.unified_customers;
      if (!customer?.phone) {
        await supabase.from("customer_journey_triggers").update({ status: "failed" }).eq("id", trigger.id);
        results.failed++;
        continue;
      }

      const phone = customer.phone.replace(/\D/g, "").replace(/^91/, "");
      if (phone.length < 10) {
        await supabase.from("customer_journey_triggers").update({ status: "failed" }).eq("id", trigger.id);
        results.failed++;
        continue;
      }

      const name = customer.customer_name || "there";
      const messageGen = JOURNEY_MESSAGES[trigger.trigger_type];
      const messageText = messageGen ? messageGen(name) : trigger.recommendation;

      let sendSuccess = false;
      if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
        sendSuccess = await sendViaMeta(WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, `91${phone}`, messageText);
      } else {
        console.log(`[DEMO] Would send to ${phone}: ${messageText.substring(0, 80)}...`);
        sendSuccess = true;
      }

      if (sendSuccess) {
        await supabase.from("customer_journey_triggers").update({
          status: "sent",
          sent_at: new Date().toISOString(),
        }).eq("id", trigger.id);

        await supabase.from("unified_activity_timeline").insert({
          customer_id: trigger.customer_id,
          vertical: "marketing",
          event_type: "journey_message_sent",
          event_data: {
            trigger_type: trigger.trigger_type,
            trigger_event: trigger.trigger_event,
            message_preview: messageText.substring(0, 100),
            provider: "meta",
          },
        });

        results.sent++;
      } else {
        await supabase.from("customer_journey_triggers").update({ status: "failed" }).eq("id", trigger.id);
        results.failed++;
      }

      await new Promise(r => setTimeout(r, 200));
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Journey executor error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
