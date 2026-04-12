import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing config" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { campaignId, action } = await req.json();

    if (!campaignId) {
      return new Response(JSON.stringify({ error: "campaignId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch campaign
    const { data: campaign, error: cErr } = await supabase
      .from("wa_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (cErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const campaignChannel = campaign.channel || "whatsapp";

    // Handle pause/resume/cancel
    if (action === "pause") {
      await supabase.from("wa_campaigns").update({ status: "paused", paused_at: new Date().toISOString() }).eq("id", campaignId);
      await supabase.from("wa_message_queue").update({ status: "cancelled" }).eq("campaign_id", campaignId).eq("status", "queued");
      return new Response(JSON.stringify({ success: true, action: "paused" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "cancel") {
      await supabase.from("wa_campaigns").update({ status: "cancelled" }).eq("id", campaignId);
      await supabase.from("wa_message_queue").update({ status: "cancelled" }).eq("campaign_id", campaignId).in("status", ["queued", "processing"]);
      return new Response(JSON.stringify({ success: true, action: "cancelled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Launch campaign
    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      return new Response(JSON.stringify({ error: `Cannot launch campaign in ${campaign.status} status` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build leads query from segment_rules
    const segmentRules = campaign.segment_rules || [];
    let leadsQuery = supabase.from("leads").select("id, name, phone, email, priority, service_category, created_at, city, car_model");

    for (const rule of segmentRules) {
      if (!rule.field || !rule.operator || rule.value === undefined) continue;
      switch (rule.operator) {
        case "equals": leadsQuery = leadsQuery.eq(rule.field, rule.value); break;
        case "not_equals": leadsQuery = leadsQuery.neq(rule.field, rule.value); break;
        case "contains": leadsQuery = leadsQuery.ilike(rule.field, `%${rule.value}%`); break;
        case "in": leadsQuery = leadsQuery.in(rule.field, Array.isArray(rule.value) ? rule.value : [rule.value]); break;
        case "gte": leadsQuery = leadsQuery.gte(rule.field, rule.value); break;
        case "lte": leadsQuery = leadsQuery.lte(rule.field, rule.value); break;
      }
    }

    const { data: leads, error: leadsErr } = await leadsQuery;

    if (leadsErr || !leads || leads.length === 0) {
      await supabase.from("wa_campaigns").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", campaignId);
      return new Response(JSON.stringify({ error: "No matching leads found", details: leadsErr }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get opt-outs (for WhatsApp)
    const { data: optOuts } = await supabase.from("wa_opt_outs").select("phone");
    const optOutSet = new Set((optOuts || []).map(o => o.phone));

    const messageContent = campaign.message_content || (campaignChannel === "email" ? "Hello from GrabYourCar!" : "Hello from GrabYourCar! 🚗");

    // Filter leads based on channel
    let validLeads: any[];
    if (campaignChannel === "email") {
      // For email campaigns, filter leads with valid emails
      validLeads = leads.filter(l => l.email && l.email.includes("@"));
    } else {
      // For WhatsApp/RCS, filter by phone
      validLeads = leads.filter(l => {
        if (!l.phone) return false;
        const clean = l.phone.replace(/\D/g, "").replace(/^91/, "");
        return !optOutSet.has(clean) && !optOutSet.has(`91${clean}`) && /^[6-9]\d{9}$/.test(clean);
      });
    }

    // ─── STRICT META CATEGORY ENFORCEMENT ───
    // Determine meta_category for this campaign
    const campaignMetaCategory = campaign.meta_category || "marketing"; // default bulk = marketing
    console.log(`📋 Campaign category: ${campaignMetaCategory}`);

    // For marketing campaigns, template MUST be approved marketing template
    // For utility campaigns, template MUST be approved utility template
    if (campaign.template_id) {
      const { data: tpl } = await supabase
        .from("wa_templates")
        .select("category, status")
        .eq("id", campaign.template_id)
        .single();
      
      if (tpl && tpl.status !== "approved") {
        await supabase.from("wa_campaigns").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", campaignId);
        return new Response(JSON.stringify({ error: `Template not approved (status: ${tpl.status}). Only approved templates can be used in campaigns.` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (tpl && tpl.category !== campaignMetaCategory) {
        console.warn(`⚠️ Template category (${tpl.category}) differs from campaign category (${campaignMetaCategory})`);
      }
    }

    // Create queue entries
    const queueEntries = validLeads.map((lead) => {
      const personalizedMsg = messageContent
        .replace(/\{name\}/gi, lead.name || "Customer")
        .replace(/\{phone\}/gi, lead.phone || "")
        .replace(/\{city\}/gi, lead.city || "")
        .replace(/\{car_model\}/gi, lead.car_model || "your dream car")
        .replace(/\{email\}/gi, lead.email || "");

      return {
        campaign_id: campaignId,
        lead_id: lead.id,
        phone: campaignChannel === "email" ? lead.email : lead.phone,
        message_content: personalizedMsg,
        media_url: campaign.media_url || null,
        media_type: campaign.media_type || null,
        status: "queued",
        priority: 5,
        meta_category: campaignMetaCategory,
        variables_data: { name: lead.name, phone: lead.phone, city: lead.city, email: lead.email, channel: campaignChannel },
      };
    });

    // Insert in batches of 100
    for (let i = 0; i < queueEntries.length; i += 100) {
      const batch = queueEntries.slice(i, i + 100);
      await supabase.from("wa_message_queue").insert(batch);
    }

    // Update campaign status
    await supabase.from("wa_campaigns").update({
      status: "queued",
      total_queued: validLeads.length,
      estimated_recipients: leads.length,
      started_at: new Date().toISOString(),
    }).eq("id", campaignId);

    console.log(`Campaign ${campaignId} (${campaignChannel}) launched: ${validLeads.length} messages queued`);

    // Trigger queue processor
    const processorUrl = `${SUPABASE_URL}/functions/v1/wa-queue-processor`;
    const processorResponse = await fetch(processorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ campaignId, batchSize: campaign.batch_size || 50 }),
    });

    if (!processorResponse.ok) {
      console.error("Failed to trigger processor:", await processorResponse.text());
    }

    return new Response(JSON.stringify({
      success: true,
      channel: campaignChannel,
      queued: validLeads.length,
      filtered: leads.length - validLeads.length,
      totalLeads: leads.length,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Campaign launcher error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
