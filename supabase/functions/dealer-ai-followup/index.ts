import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhone(phone: string): string {
  const clean = phone.replace(/\D/g, "").replace(/^0+/, "");
  let short = clean;
  if (clean.startsWith("91") && clean.length === 12) short = clean.slice(2);
  return `91${short}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      return new Response(JSON.stringify({ error: "WhatsApp not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get campaign details
    const { data: campaign } = await supabase
      .from("dealer_inquiry_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (!campaign || !campaign.ai_followup_enabled) {
      return new Response(JSON.stringify({ error: "Campaign not found or AI follow-up disabled" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recipients whose first message was actually delivered/read and haven't had AI follow-up
    const { data: recipients } = await supabase
      .from("dealer_inquiry_recipients")
      .select("*")
      .eq("campaign_id", campaign_id)
      .in("send_status", ["delivered", "read"])
      .eq("ai_followup_sent", false);

    if (!recipients || recipients.length === 0) {
      console.log("No eligible recipients for AI follow-up");
      return new Response(JSON.stringify({ message: "No recipients to follow up" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate AI follow-up message using the campaign's script
    const carInfo = [campaign.brand, campaign.model, campaign.variant, campaign.color].filter(Boolean).join(" ");
    const script = campaign.ai_followup_script || "Ask about best discount, availability, and delivery timeline.";

    // ─── Custom template path ───
    // If the script looks like a finished message (contains {brand} or {model} or is long-ish prose), treat it as the literal template.
    const isCustomTemplate = /\{(rep_name|dealer|brand|model|variant|color)\}/i.test(script);

    let aiMessage = "";

    if (isCustomTemplate) {
      // User-defined template — leave as-is, will personalize per recipient below
      aiMessage = script;
    } else if (LOVABLE_API_KEY) {
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You write extremely SHORT WhatsApp follow-ups for car dealers. HARD RULES:\n- Maximum 3 lines, under 280 characters total.\n- Greet by name in line 1 (e.g. "Hi {name},").\n- Line 2: one direct ask covering the points.\n- Line 3: short sign-off "— GrabYourCar".\n- Use *bold* sparingly, no emoji spam (max 1).\n- No fluff, no thank-you paragraphs.`,
              },
              {
                role: "user",
                content: `Car: ${carInfo || "the vehicle"}\nAsk these points in ONE short line: ${script}`,
              },
            ],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          aiMessage = (aiData.choices?.[0]?.message?.content || "").trim();
        }
      } catch (e) {
        console.error("AI generation failed:", e);
      }
    }

    // Fallback if AI fails — short version
    if (!aiMessage) {
      const points = script.split(/\d+\)/).filter(Boolean).map((q: string) => q.trim()).slice(0, 3).join(", ");
      aiMessage = `Hi {rep_name}, quick follow-up on *${carInfo || "our inquiry"}* — please share ${points || "best price & availability"}.\n— GrabYourCar`;
    }

    // ─── HARD ENFORCE SHORT FORMAT ───
    // Strip numbered/bulleted lists → flatten into one comma-joined line
    function enforceShort(text: string): string {
      let t = text.trim();

      // Detect numbered list (1. ... 2. ... or 1) ...) — flatten to one line
      const hasList = /(^|\n)\s*\d+[\.\)]\s+/.test(t) || /(^|\n)\s*[\-•*]\s+/.test(t);
      if (hasList) {
        // Pull greeting (first line if it has a comma/name)
        const lines = t.split(/\n+/).map(l => l.trim()).filter(Boolean);
        const greet = /^(hi|hello|hey)\b/i.test(lines[0]) ? lines.shift()! : "";
        // Extract bullet/numbered items
        const items = lines
          .filter(l => /^(\d+[\.\)]|[\-•*])\s+/.test(l))
          .map(l => l.replace(/^(\d+[\.\)]|[\-•*])\s+/, "").replace(/\*+/g, "").trim())
          // remove sub-questions/parentheticals
          .map(l => l.split("?")[0].split(":")[0].trim())
          .slice(0, 3);
        const ask = items.length
          ? `quick check — please share ${items.join(", ")}.`
          : `quick follow-up please.`;
        t = [greet, ask, "— GrabYourCar"].filter(Boolean).join("\n");
      }

      // Hard char cap
      if (t.length > 320) {
        t = t.slice(0, 300).replace(/\s+\S*$/, "") + "…\n— GrabYourCar";
      }
      return t.trim();
    }

    aiMessage = enforceShort(aiMessage);

    let followupSent = 0;
    let followupFailed = 0;

    for (const recipient of recipients) {
      const phone = normalizePhone(recipient.phone);

      // Personalize with dealer/rep/brand variables
      let personalizedMsg = aiMessage
        .replace(/\{rep_name\}/gi, recipient.rep_name || "there")
        .replace(/\{dealer(?:_name)?\}/gi, recipient.dealer_name || "Team")
        .replace(/\{brand\}/gi, campaign.brand || "")
        .replace(/\{model\}/gi, campaign.model || "")
        .replace(/\{variant\}/gi, campaign.variant || "")
        .replace(/\{color\}/gi, campaign.color || "")
        .trim();

      // If template doesn't already greet, prepend short greeting
      if (recipient.rep_name && !/^hi\b|^hello\b|^hey\b/i.test(personalizedMsg)) {
        personalizedMsg = `Hi ${recipient.rep_name}, ${personalizedMsg}`;
      }

      try {
        const url = `https://graph.facebook.com/v25.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phone,
            type: "text",
            text: { preview_url: false, body: personalizedMsg },
          }),
        });

        const result = await resp.json();
        if (resp.ok && result.messages?.[0]?.id) {
          followupSent++;
          await supabase.from("dealer_inquiry_recipients").update({
            ai_followup_sent: true,
            ai_followup_sent_at: new Date().toISOString(),
          }).eq("id", recipient.id);
        } else {
          followupFailed++;
          console.error(`Follow-up failed for ${recipient.phone}:`, result.error?.message);
        }
      } catch (e) {
        followupFailed++;
        console.error(`Follow-up error for ${recipient.phone}:`, e);
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 500));
    }

    // Update campaign status
    await supabase.from("dealer_inquiry_campaigns").update({
      status: "completed",
    }).eq("id", campaign_id);

    console.log(`AI follow-up complete: ${followupSent} sent, ${followupFailed} failed for campaign ${campaign_id}`);

    return new Response(JSON.stringify({
      success: true,
      summary: { total: recipients.length, sent: followupSent, failed: followupFailed },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Dealer AI follow-up error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
