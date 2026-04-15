import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const respond = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: jsonHeaders,
  });

const readJsonSafely = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

/**
 * Omni-Channel Send — Routes messages to the right channel handler.
 * WhatsApp → delegates to whatsapp-send (provider-agnostic)
 * Email → direct Resend / Lovable Cloud
 * RCS → stub (coming soon)
 */

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

    // Health check
    if (action === "health_check") {
      const channels: Record<string, any> = {};
      const { data: providers } = await supabase.from("channel_providers").select("*");
      for (const p of providers || []) {
        channels[p.channel] = { active: p.is_active, provider: p.provider_name };
      }
      return new Response(
        JSON.stringify({ ok: true, success: true, channels }),
        { status: 200, headers: jsonHeaders }
      );
    }

    // Check if channel is active
    const { data: provider } = await supabase
      .from("channel_providers")
      .select("*")
      .eq("channel", channel)
      .single();

    if (!provider?.is_active) {
      return respond({
        ok: false,
        success: false,
        fallback: false,
        status: "not_configured",
        error: `${channel} channel is not configured or inactive`,
      });
    }

    let result: any = { success: false };

    // ── WhatsApp — delegate to whatsapp-send ──
    if (channel === "whatsapp") {
      const waResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          to: phone,
          message,
          messageType: "text",
          name,
          logEvent: logEvent || "omni_send",
        }),
      });

      result = (await readJsonSafely(waResponse)) || {
        ok: false,
        success: false,
        error: `Invalid WhatsApp response (${waResponse.status})`,
      };

      if (!waResponse.ok && result.success !== false) {
        result = {
          ok: false,
          success: false,
          error: `WhatsApp send failed (${waResponse.status})`,
        };
      }
    }

    // ── Email adapter (Resend) ──
    else if (channel === "email") {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");

      if (!resendApiKey) {
          return respond({ ok: false, success: false, fallback: false, error: "Email (Resend) API key not configured" });
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

          try {
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
          } catch (logError) {
            console.error("Failed to log omni email send (non-fatal):", logError);
          }
      } else {
        result = { success: false, error: emailData.message || "Email send failed" };
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

    return respond({ ok: Boolean(result?.success), fallback: false, ...result });
  } catch (err) {
    console.error("omni-channel-send error:", err);
    return respond({
      ok: false,
      success: false,
      fallback: false,
      status: "runtime_error",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});
