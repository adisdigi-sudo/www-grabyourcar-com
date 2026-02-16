import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Welcome Sync — Triggered after OTP verification
 * 
 * 1. Upserts user into unified_customers
 * 2. Triggers welcome WhatsApp message
 * 3. Logs the interaction in unified_activity_timeline
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { phone, name, source, city } = await req.json();

    if (!phone) {
      return new Response(JSON.stringify({ error: "Phone required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize phone
    const cleanPhone = phone.replace(/\D/g, "").replace(/^0+/, "");
    const fullPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const shortPhone = fullPhone.startsWith("91") ? fullPhone.slice(2) : fullPhone;

    // Check if customer already exists
    const { data: existing } = await supabase
      .from("unified_customers")
      .select("id, otp_verified, customer_name")
      .eq("phone", fullPhone)
      .maybeSingle();

    let customerId: string;
    const customerName = name || existing?.customer_name || "Customer";
    const isNewCustomer = !existing;

    if (existing) {
      // Update existing
      customerId = existing.id;
      const updates: Record<string, unknown> = {
        otp_verified: true,
        otp_verified_at: new Date().toISOString(),
        last_activity_type: "otp_verification",
        last_activity_at: new Date().toISOString(),
        total_interactions: (existing as any).total_interactions ? (existing as any).total_interactions + 1 : 1,
      };
      if (name && !existing.customer_name) updates.customer_name = name;
      if (source) updates.latest_source = source;

      await supabase.from("unified_customers").update(updates).eq("id", customerId);
    } else {
      // Create new customer
      const { data: newCustomer, error: insertError } = await supabase
        .from("unified_customers")
        .insert({
          phone: fullPhone,
          customer_name: customerName,
          otp_verified: true,
          otp_verified_at: new Date().toISOString(),
          first_source: source || "website",
          latest_source: source || "website",
          city: city || null,
          engagement_score: 10,
          total_interactions: 1,
          last_activity_type: "otp_verification",
          last_activity_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      customerId = newCustomer.id;
    }

    // Log activity
    await supabase.from("unified_activity_timeline").insert({
      customer_id: customerId,
      activity_type: "otp_verified",
      service_category: "platform",
      title: isNewCustomer ? "New customer joined via OTP" : "Returning customer verified",
      description: `Verified via ${source || "website"}`,
      metadata: { phone: fullPhone, source },
    });

    // Trigger welcome WhatsApp (only for new customers)
    if (isNewCustomer) {
      try {
        const FINBITE_API_KEY = (Deno.env.get("FINBITE_API_KEY") || "").trim();
        const FINBITE_WHATSAPP_CLIENT = (Deno.env.get("FINBITE_WHATSAPP_CLIENT") || "").trim();

        if (FINBITE_API_KEY && FINBITE_WHATSAPP_CLIENT) {
          // Log the welcome message
          await supabase.from("wa_message_logs").insert({
            phone: fullPhone,
            customer_name: customerName,
            message_type: "text",
            message_content: `Hi ${customerName}! 👋 Welcome to Grabyourcar. We're excited to help you find the perfect car and related services. Explore new cars, insurance, loans & more — all in one place. Let us know how we can assist you!`,
            trigger_event: "welcome_otp",
            status: "queued",
            provider: "finbite",
          });

          // Send via Finbite v2
          const response = await fetch("https://app.finbite.in/api/v2/whatsapp-business/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${FINBITE_API_KEY}`,
              "X-Phone-ID": FINBITE_WHATSAPP_CLIENT,
            },
            body: JSON.stringify({
              to: fullPhone,
              phoneNoId: FINBITE_WHATSAPP_CLIENT,
              type: "text",
              text: {
                body: `Hi ${customerName}! 👋 Welcome to Grabyourcar.\n\nWe're excited to help you find the perfect car and related services.\n\n🚗 Explore New Cars\n🛡️ Car Insurance\n💰 Car Loans\n🔧 Accessories\n\nAll in one place. Let us know how we can assist you!`,
              },
            }),
          });

          const result = await response.json();
          console.log("Welcome WhatsApp sent:", JSON.stringify(result));
        }
      } catch (err) {
        console.error("Welcome WhatsApp error:", err);
        // Non-blocking — don't fail the sync
      }
    }

    return new Response(JSON.stringify({
      success: true,
      customer_id: customerId,
      is_new: isNewCustomer,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Welcome sync error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
