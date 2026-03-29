import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, channel, phone, email, message, subject, name, logEvent, vertical } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if channel is active
    const { data: provider } = await supabase
      .from("channel_providers")
      .select("*")
      .eq("channel", channel)
      .single();

    if (!provider?.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          status: "not_configured",
          error: `${channel} channel is not configured or inactive`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Health check action
    if (action === "health_check") {
      const channels: Record<string, any> = {};
      const { data: providers } = await supabase.from("channel_providers").select("*");
      for (const p of providers || []) {
        channels[p.channel] = { active: p.is_active, provider: p.provider_name };
      }
      return new Response(
        JSON.stringify({ success: true, channels }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: any = { success: false };

    // ── WhatsApp adapter ──
    if (channel === "whatsapp") {
      const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
      const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

      if (!accessToken || !phoneNumberId) {
        return new Response(
          JSON.stringify({ success: false, error: "WhatsApp API credentials not configured" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const waResponse = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "text",
            text: { body: message },
          }),
        }
      );

      const waData = await waResponse.json();

      if (waResponse.ok && waData.messages?.[0]?.id) {
        result = { success: true, messageId: waData.messages[0].id };

        // Log to wa_message_logs
        await supabase.from("wa_message_logs").insert({
          phone,
          customer_name: name || null,
          message_type: "text",
          message_content: message,
          trigger_event: logEvent || "omni_send",
          status: "sent",
          provider: "meta",
          channel: "whatsapp",
          provider_message_id: waData.messages[0].id,
          sent_at: new Date().toISOString(),
        });
      } else {
        result = {
          success: false,
          error: waData.error?.message || "WhatsApp API send failed",
        };
      }
    }

    // ── Email adapter (Resend) ──
    else if (channel === "email") {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");

      if (!resendApiKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Email (Resend) API key not configured" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "GrabYourCar <noreply@grabyourcar.com>",
          to: [email],
          subject: subject || "Message from GrabYourCar",
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#1a1a1a;">Hi ${name || ""},</h2>
            <div style="color:#333;line-height:1.6;">${message.replace(/\n/g, "<br/>")}</div>
            <hr style="margin-top:30px;border:none;border-top:1px solid #eee;"/>
            <p style="color:#999;font-size:12px;">GrabYourCar — Your Trusted Automotive Partner</p>
          </div>`,
        }),
      });

      const emailData = await emailResponse.json();

      if (emailResponse.ok && emailData.id) {
        result = { success: true, messageId: emailData.id };

        // Log
        await supabase.from("wa_message_logs").insert({
          phone: email || "email",
          customer_name: name || null,
          message_type: "email",
          message_content: message,
          trigger_event: logEvent || "omni_email",
          status: "sent",
          provider: "resend",
          channel: "email",
          provider_message_id: emailData.id,
          sent_at: new Date().toISOString(),
        });
      } else {
        result = {
          success: false,
          error: emailData.message || "Email send failed",
        };
      }
    }

    // ── RCS adapter (stub) ──
    else if (channel === "rcs") {
      result = {
        success: false,
        status: "not_configured",
        error: "RCS provider not yet integrated. Coming soon.",
      };
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("omni-channel-send error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
