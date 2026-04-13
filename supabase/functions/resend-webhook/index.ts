import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const eventType = body.type;
    const data = body.data;

    if (!eventType || !data) {
      return new Response(JSON.stringify({ error: "Invalid webhook payload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendId = data.email_id || data.id;
    const recipientEmail = Array.isArray(data.to) ? data.to[0] : data.to;

    // Insert event with bounce_type
    await supabase.from("email_events").insert({
      resend_id: resendId,
      event_type: eventType,
      recipient_email: recipientEmail,
      link_url: data.click?.link || null,
      user_agent: data.click?.userAgent || null,
      ip_address: data.click?.ipAddress || null,
      bounce_type: data.bounce?.type || null,
      metadata: data,
    });

    // Find matching email_log
    const { data: logEntry } = await supabase
      .from("email_logs")
      .select("id, campaign_id")
      .eq("resend_id", resendId)
      .maybeSingle();

    if (logEntry) {
      const updates: Record<string, unknown> = {};

      if (eventType === "email.delivered") {
        updates.status = "delivered";
        updates.delivered_at = new Date().toISOString();
      }
      if (eventType === "email.opened") {
        updates.opened_at = new Date().toISOString();
      }
      if (eventType === "email.clicked") {
        updates.clicked_at = new Date().toISOString();
      }
      if (eventType === "email.bounced") {
        updates.bounced_at = new Date().toISOString();
        updates.status = "bounced";
        updates.error_message = data.bounce?.message || "Bounced";
      }
      if (eventType === "email.complained") {
        updates.status = "complained";
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("email_logs").update(updates).eq("id", logEntry.id);
      }

      // Increment campaign counters
      if (logEntry.campaign_id) {
        if (eventType === "email.opened") {
          await supabase.rpc("increment_campaign_counter", { p_campaign_id: logEntry.campaign_id, p_column: "open_count" });
        }
        if (eventType === "email.clicked") {
          await supabase.rpc("increment_campaign_counter", { p_campaign_id: logEntry.campaign_id, p_column: "click_count" });
        }

        // Update email_events with campaign_id
        await supabase.from("email_events")
          .update({ campaign_id: logEntry.campaign_id, email_log_id: logEntry.id })
          .eq("resend_id", resendId)
          .eq("event_type", eventType)
          .order("created_at", { ascending: false })
          .limit(1);
      }
    }

    // Update subscriber engagement scores
    if (recipientEmail) {
      if (eventType === "email.opened") {
        await supabase.from("email_subscribers")
          .update({ last_opened_at: new Date().toISOString() })
          .eq("email", recipientEmail);
      }
      if (eventType === "email.clicked") {
        await supabase.from("email_subscribers")
          .update({ last_clicked_at: new Date().toISOString() })
          .eq("email", recipientEmail);
      }
      if (eventType === "email.bounced") {
        await supabase.from("email_subscribers")
          .update({ subscribed: false, unsubscribed_at: new Date().toISOString() })
          .eq("email", recipientEmail);
        // Add to suppressed list
        await supabase.from("suppressed_emails")
          .upsert({ email: recipientEmail, reason: "bounced", source: "resend_webhook" }, { onConflict: "email" });
      }
      if (eventType === "email.complained") {
        await supabase.from("email_subscribers")
          .update({ subscribed: false, unsubscribed_at: new Date().toISOString() })
          .eq("email", recipientEmail);
        await supabase.from("suppressed_emails")
          .upsert({ email: recipientEmail, reason: "complained", source: "resend_webhook" }, { onConflict: "email" });
      }
    }

    console.log(`✅ Processed ${eventType} for ${resendId} (${recipientEmail})`);
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Resend webhook error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
