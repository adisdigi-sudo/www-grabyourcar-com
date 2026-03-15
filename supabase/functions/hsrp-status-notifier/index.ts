import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * HSRP Status Notifier — sends stage-specific WhatsApp messages
 * when pipeline_stage changes on hsrp_bookings.
 * 
 * Called from frontend when admin moves a card to a new stage.
 */

const STAGE_MESSAGES: Record<string, { emoji: string; title: string; body: string }> = {
  verification: {
    emoji: "📋",
    title: "Documents Under Verification",
    body: "Your HSRP/FASTag booking documents have been received and are being verified. We'll update you shortly.",
  },
  payment: {
    emoji: "💳",
    title: "Verification Complete — Payment Required",
    body: "Your documents have been verified! Please complete the payment of Rs.{amount} to proceed with your {service_type} order.",
  },
  scheduled: {
    emoji: "📅",
    title: "Installation Scheduled",
    body: "Your {service_type} installation has been scheduled for {scheduled_date}. Please keep your vehicle and documents ready.",
  },
  installation: {
    emoji: "🔧",
    title: "Installation In Progress",
    body: "Our technician is on the way for your {service_type} installation. Vehicle: {registration_number}.",
  },
  completed: {
    emoji: "✅",
    title: "Installation Complete!",
    body: "Your {service_type} has been successfully installed on {registration_number}. Thank you for choosing GrabYourCar! 🚗\n\nWe'd love your feedback — rate us on Google: https://g.page/grabyourcar",
  },
};

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
    const { booking_id, new_stage, old_stage } = await req.json();

    if (!booking_id || !new_stage) {
      return new Response(JSON.stringify({ error: "booking_id and new_stage required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Don't notify for same stage or new_booking stage
    if (new_stage === old_stage || new_stage === "new_booking") {
      return new Response(JSON.stringify({ sent: false, reason: "No notification for this stage" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch booking details
    const { data: booking, error: fetchError } = await supabase
      .from("hsrp_bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (fetchError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const template = STAGE_MESSAGES[new_stage];
    if (!template) {
      return new Response(JSON.stringify({ sent: false, reason: "No template for stage" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build message with variable substitution
    const variables: Record<string, string> = {
      name: booking.owner_name || "Customer",
      amount: (booking.payment_amount || 0).toLocaleString("en-IN"),
      service_type: booking.service_type || "HSRP",
      registration_number: booking.registration_number || "",
      tracking_id: booking.tracking_id || booking.id.slice(0, 8),
      scheduled_date: booking.scheduled_date
        ? new Date(booking.scheduled_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "TBD",
    };

    let messageBody = template.body;
    for (const [key, value] of Object.entries(variables)) {
      messageBody = messageBody.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }

    const fullMessage = `${template.emoji} *${template.title}*\n\nHi ${variables.name},\n\n${messageBody}\n\n📞 Need help? Call us or WhatsApp anytime.\n— Team GrabYourCar`;

    const phone = (booking.mobile || "").replace(/\D/g, "");
    if (!phone) {
      return new Response(JSON.stringify({ sent: false, reason: "No phone number" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check opt-out
    const cleanPhone = phone.replace(/^91/, "");
    const { data: optOut } = await supabase
      .from("wa_opt_outs")
      .select("id")
      .or(`phone.eq.${cleanPhone},phone.eq.91${cleanPhone}`)
      .limit(1);

    if (optOut && optOut.length > 0) {
      return new Response(JSON.stringify({ sent: false, reason: "User opted out" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via messaging-service
    const messagingUrl = `${SUPABASE_URL}/functions/v1/messaging-service`;
    const resp = await fetch(messagingUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        action: "send_text",
        phone: phone.startsWith("91") ? phone : `91${phone}`,
        message: fullMessage,
        lead_id: null,
        customer_name: booking.owner_name,
      }),
    });

    const result = await resp.json();
    console.log(`HSRP status notification for ${new_stage}:`, result);

    return new Response(JSON.stringify({
      sent: true,
      stage: new_stage,
      phone,
      message_preview: fullMessage.substring(0, 100),
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("HSRP status notifier error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
