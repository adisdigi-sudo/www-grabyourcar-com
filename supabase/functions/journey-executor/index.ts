import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Journey Executor
 * Processes pending cross-vertical triggers and sends WhatsApp messages via Finbite.
 *
 * Actions:
 * - execute_pending: Process all pending triggers
 * - execute_single: Process a single trigger by ID
 */

const JOURNEY_MESSAGES: Record<string, (name: string) => string> = {
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const FINBITE_BEARER = Deno.env.get("FINBITE_BEARER_TOKEN");
  const FINBITE_CLIENT = Deno.env.get("FINBITE_WHATSAPP_CLIENT");
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { action = "execute_pending", trigger_id } = await req.json().catch(() => ({}));
    const results = { processed: 0, sent: 0, failed: 0 };

    let triggersToProcess: any[] = [];

    if (action === "execute_single" && trigger_id) {
      const { data } = await supabase
        .from("customer_journey_triggers")
        .select("*, unified_customers(phone, customer_name, city)")
        .eq("id", trigger_id)
        .limit(1);
      triggersToProcess = data || [];
    } else {
      // Get all pending triggers
      const { data } = await supabase
        .from("customer_journey_triggers")
        .select("*, unified_customers(phone, customer_name, city)")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(100);
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

      // Send via Finbite
      let sendSuccess = false;
      if (FINBITE_BEARER && FINBITE_CLIENT) {
        try {
          const finbiteResp = await fetch("https://app.finbite.in/api/v2/whatsapp-business/messages", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FINBITE_BEARER}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              phoneNoId: FINBITE_CLIENT,
              to: `91${phone}`,
              type: "text",
              text: { body: messageText },
            }),
          });
          sendSuccess = finbiteResp.ok;
          if (!sendSuccess) {
            console.error("Finbite send failed:", await finbiteResp.text());
          }
        } catch (e) {
          console.error("Finbite error:", e);
        }
      } else {
        // No Finbite config — mark as sent for demo
        console.log(`[DEMO] Would send to ${phone}: ${messageText.substring(0, 80)}...`);
        sendSuccess = true;
      }

      if (sendSuccess) {
        await supabase.from("customer_journey_triggers").update({
          status: "sent",
          sent_at: new Date().toISOString(),
        }).eq("id", trigger.id);

        // Log to activity timeline
        await supabase.from("unified_activity_timeline").insert({
          customer_id: trigger.customer_id,
          vertical: "marketing",
          event_type: "journey_message_sent",
          event_data: {
            trigger_type: trigger.trigger_type,
            trigger_event: trigger.trigger_event,
            message_preview: messageText.substring(0, 100),
          },
        });

        results.sent++;
      } else {
        await supabase.from("customer_journey_triggers").update({ status: "failed" }).eq("id", trigger.id);
        results.failed++;
      }

      // Rate limit: 200ms between messages
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
