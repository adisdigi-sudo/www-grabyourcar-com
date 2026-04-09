import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhone(phone: string): string {
  const clean = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (clean.startsWith("91") && clean.length === 12) return clean;
  if (clean.length === 10 && /^[6-9]/.test(clean)) return `91${clean}`;
  return clean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { campaign_id } = await req.json();
    if (!campaign_id) throw new Error("campaign_id required");

    const { data: campaign, error: cErr } = await supabase
      .from("omni_campaigns").select("*").eq("id", campaign_id).single();
    if (cErr || !campaign) throw new Error("Campaign not found");

    const channel = campaign.channel;
    await supabase.from("omni_campaigns").update({ status: "sending", started_at: new Date().toISOString() }).eq("id", campaign_id);

    // Get subscribers
    let query = supabase.from("email_subscribers").select("*").eq("subscribed", true);
    const sf = campaign.segment_filter as Record<string, unknown> | null;
    if (sf?.tags && Array.isArray(sf.tags) && sf.tags.length > 0) {
      query = query.overlaps("tags", sf.tags);
    }
    const { data: subscribers } = await query;
    if (!subscribers || subscribers.length === 0) {
      await supabase.from("omni_campaigns").update({ status: "completed", total_recipients: 0, completed_at: new Date().toISOString() }).eq("id", campaign_id);
      return new Response(JSON.stringify({ success: true, sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("omni_campaigns").update({ total_recipients: subscribers.length }).eq("id", campaign_id);

    let sentCount = 0, failedCount = 0;
    const batchSize = campaign.batch_size || 50;
    const batchDelay = (campaign.batch_delay_seconds || 0) * 1000;

    if (channel === "email") {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");
      const resend = new Resend(resendApiKey);
      const fromLine = `${campaign.from_name || "GrabYourCar"} <${campaign.from_email || "noreply@grabyourcar.com"}>`;

      for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize);
        const payloads = batch.map(sub => ({
          from: fromLine,
          to: [sub.email],
          subject: (campaign.subject || "Update from GrabYourCar").replace(/\{name\}/g, sub.name || "Customer"),
          html: (campaign.html_content || campaign.message_body || "").replace(/\{name\}/g, sub.name || "Customer"),
        }));

        try {
          const result = await resend.batch.send(payloads);
          const logs = batch.map((sub, idx) => {
            const emailId = (result.data as any)?.data?.[idx]?.id;
            if (emailId) sentCount++; else failedCount++;
            return {
              campaign_id, channel: "email", recipient_email: sub.email, recipient_name: sub.name,
              status: emailId ? "sent" : "failed", external_id: emailId, sent_at: emailId ? new Date().toISOString() : null,
            };
          });
          await supabase.from("omni_campaign_messages").insert(logs);
        } catch (e) {
          failedCount += batch.length;
        }
        if (batchDelay > 0 && i + batchSize < subscribers.length) await new Promise(r => setTimeout(r, batchDelay));
      }
    } else if (channel === "whatsapp") {
      const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
      const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
      if (!token || !phoneId) throw new Error("WhatsApp API not configured");

      for (const sub of subscribers) {
        if (!sub.phone) { failedCount++; continue; }
        const phone = normalizePhone(sub.phone);
        try {
          const body: Record<string, unknown> = {
            messaging_product: "whatsapp", recipient_type: "individual", to: phone,
          };

          if (campaign.wa_template_name) {
            body.type = "template";
            body.template = { name: campaign.wa_template_name, language: { code: "en" } };
          } else {
            body.type = "text";
            body.text = { preview_url: false, body: (campaign.message_body || "").replace(/\{name\}/g, sub.name || "Customer") };
          }

          const resp = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
          });
          const result = await resp.json();
          const msgId = result.messages?.[0]?.id;
          
          await supabase.from("omni_campaign_messages").insert({
            campaign_id, channel: "whatsapp", recipient_phone: phone, recipient_name: sub.name,
            status: msgId ? "sent" : "failed", external_id: msgId, sent_at: msgId ? new Date().toISOString() : null,
            error_message: msgId ? null : (result.error?.message || "Send failed"),
          });

          if (msgId) sentCount++; else failedCount++;
        } catch (e) {
          failedCount++;
          await supabase.from("omni_campaign_messages").insert({
            campaign_id, channel: "whatsapp", recipient_phone: phone, recipient_name: sub.name,
            status: "failed", error_message: (e as Error).message,
          });
        }
        await new Promise(r => setTimeout(r, 200)); // Rate limit
      }
    } else if (channel === "rcs") {
      // RCS via Twilio — placeholder until Twilio is configured
      for (const sub of subscribers) {
        if (!sub.phone) { failedCount++; continue; }
        failedCount++; // RCS requires Twilio config
        await supabase.from("omni_campaign_messages").insert({
          campaign_id, channel: "rcs", recipient_phone: normalizePhone(sub.phone), recipient_name: sub.name,
          status: "failed", error_message: "RCS provider not configured — connect Twilio in Integrations",
        });
      }
    }

    await supabase.from("omni_campaigns").update({
      status: "completed", sent_count: sentCount, failed_count: failedCount, completed_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    console.log(`Omni campaign ${campaign.name} (${channel}): ${sentCount} sent, ${failedCount} failed`);
    return new Response(JSON.stringify({ success: true, sent: sentCount, failed: failedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Omni campaign error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
