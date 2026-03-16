import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const clients = [
  { name: "Parag", car: "MG Gloster", phone: "9582306727" },
  { name: "Lokesh", car: "Maruti S-Presso", phone: "8860806436" },
  { name: "Lakshay", car: "VW Virtus", phone: "9812031059" },
  { name: "Manikant", car: "Toyota Hycross", phone: "9871026150" },
  { name: "Sanchit", car: "Toyota Hycross", phone: "9999615950" },
  { name: "Renu", car: "Toyota Hycross", phone: "9654696613" },
  { name: "Taranbir", car: "Toyota Hyryder", phone: "9910749905" },
  { name: "Rahul", car: "Mahindra Scorpio", phone: "9323020006" },
  { name: "Shweta Dhir", car: "Toyota Hyryder", phone: "9811260155" },
  { name: "Madhur Malhotra", car: "Toyota Hyryder", phone: "9811021944" },
  { name: "Ankur Gupta", car: "BYD Atto", phone: "9717998888" },
  { name: "Vidit Gupta", car: "Toyota Velfire", phone: "9811787282" },
  { name: "Rakesh Gupta", car: "BMW X1", phone: "9953007760" },
  { name: "Shishender Kataria", car: "Hyundai Creta", phone: "9034192008" },
  { name: "Shreyansh Mittal", car: "Toyota Hyryder", phone: "9267975769" },
  { name: "Mayank Tanwar", car: "Mahindra Thar", phone: "9999029998" },
  { name: "Prabh Khera", car: "Mahindra Thar", phone: "9818200313" },
  { name: "Ahluwalia", car: "Toyota Hycross", phone: "9911991147" },
  { name: "Ayush", car: "Toyota Fortuner", phone: "7503341403" },
  { name: "Mohit", car: "Hyundai Creta", phone: "8950544435" },
  { name: "Funkyy", car: "Toyota Hycross", phone: "9818284935" },
  { name: "Shivyank Udyog", car: "Toyota Fortuner", phone: "9899016617" },
  { name: "Isha", car: "MG Hector", phone: "7206607985" },
  { name: "Udit Jain", car: "Toyota Hycross", phone: "8076732734" },
  { name: "Himanshu Sharma", car: "Toyota Fortuner", phone: "9582279204" },
  { name: "Ujjwal Bhati", car: "Toyota Fortuner", phone: "9599745311" },
  { name: "Advocate Sidarth Arora", car: "Mahindra XUV700", phone: "9560601768" },
  { name: "Khushboo", car: "Hyundai Creta", phone: "7011158564" },
  { name: "Gautam", car: "Hyundai Tucson", phone: "9871774224" },
  { name: "Rajat Suri", car: "MG Hector", phone: "9810108221" },
  { name: "Akhilesh Maurya", car: "Mercedes E-Class", phone: "9873255531" },
  { name: "Inder", car: "Kia Sonet", phone: "9873255594" },
  { name: "Harsh Mahajan", car: "Toyota Hycross", phone: "9362142258" },
];

const REVIEW_LINK = "https://share.google/xBBnueLfRt6stD8MO";

function buildMessage(name: string, car: string): string {
  return `Hi ${name}! 😊

Thank you so much for choosing *GrabYourCar* for your *${car}*! 🚗 We truly appreciate your trust and support — it means the world to us! 🙏

We'd love to hear about your experience! Could you please take a moment to leave us a quick review on Google? Your feedback helps us serve you and others even better! ⭐

👉 ${REVIEW_LINK}

Thank you so much, ${name}! Wishing you many happy miles ahead! 🛣️✨

— Team GrabYourCar 💚`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const results: { name: string; phone: string; status: string; error?: string }[] = [];

    for (const client of clients) {
      const fullPhone = `91${client.phone}`;
      const message = buildMessage(client.name, client.car);

      try {
        const resp = await fetch(
          `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: fullPhone,
              type: "text",
              text: { preview_url: true, body: message },
            }),
          }
        );

        const result = await resp.json();
        const success = resp.ok && result.messages?.[0]?.id;

        // Log to wa_message_logs
        await supabase.from("wa_message_logs").insert({
          phone: client.phone,
          customer_name: client.name,
          message_type: "text",
          message_content: message,
          trigger_event: "review_request",
          provider: "meta",
          provider_message_id: result.messages?.[0]?.id || null,
          status: success ? "sent" : "failed",
          sent_at: success ? new Date().toISOString() : null,
          error_message: success ? null : JSON.stringify(result.error || result),
        });

        results.push({
          name: client.name,
          phone: client.phone,
          status: success ? "sent" : "failed",
          error: success ? undefined : result.error?.message,
        });

        // Rate limit: 200ms between messages
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        results.push({
          name: client.name,
          phone: client.phone,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown",
        });
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status !== "sent").length;

    console.log(`Review request bulk send: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ success: true, total: clients.length, sent, failed, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Bulk review request error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
