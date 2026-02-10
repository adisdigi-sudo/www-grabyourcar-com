import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FINBITE_API_URL = "https://api.finbite.in/v1/whatsapp/send";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FINBITE_CLIENT_ID = Deno.env.get("FINBITE_CLIENT_ID");
    const FINBITE_API_KEY = Deno.env.get("FINBITE_API_KEY");
    const FINBITE_WHATSAPP_CLIENT = Deno.env.get("FINBITE_WHATSAPP_CLIENT");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!FINBITE_CLIENT_ID || !FINBITE_API_KEY || !FINBITE_WHATSAPP_CLIENT) {
      return new Response(
        JSON.stringify({ error: "WhatsApp not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Database not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { broadcastId } = await req.json();

    if (!broadcastId) {
      return new Response(
        JSON.stringify({ error: "broadcastId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch broadcast details
    const { data: broadcast, error: bErr } = await supabase
      .from("whatsapp_broadcasts")
      .select("*")
      .eq("id", broadcastId)
      .single();

    if (bErr || !broadcast) {
      return new Response(
        JSON.stringify({ error: "Broadcast not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Update status to sending
    await supabase
      .from("whatsapp_broadcasts")
      .update({ status: "sending", started_at: new Date().toISOString() })
      .eq("id", broadcastId);

    // 3. Fetch leads based on segment filters
    const segmentFilters = broadcast.segment_filters || {};
    const targetSegment = broadcast.target_segment || {};
    let leadsQuery = supabase.from("leads").select("id, name, phone, priority, service_category, created_at");

    // Apply segment filters
    const segmentValue = targetSegment.segment || "all";
    if (segmentValue === "hot") {
      leadsQuery = leadsQuery.eq("priority", "high");
    } else if (segmentValue === "warm") {
      leadsQuery = leadsQuery.eq("priority", "medium");
    } else if (segmentValue === "new_week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      leadsQuery = leadsQuery.gte("created_at", oneWeekAgo.toISOString());
    } else if (segmentValue === "finance") {
      leadsQuery = leadsQuery.eq("service_category", "finance");
    }

    const { data: leads, error: leadsErr } = await leadsQuery;

    if (leadsErr || !leads || leads.length === 0) {
      await supabase
        .from("whatsapp_broadcasts")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", broadcastId);

      return new Response(
        JSON.stringify({ error: "No leads found for this segment", details: leadsErr }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update total recipients
    await supabase
      .from("whatsapp_broadcasts")
      .update({ total_recipients: leads.length })
      .eq("id", broadcastId);

    // 4. Send messages to each lead
    const messageTemplate = broadcast.message_content || "Hello from GrabYourCar! 🚗";
    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;
    const results: Array<{ leadId: string; phone: string; status: string; error?: string }> = [];

    for (const lead of leads) {
      if (!lead.phone) {
        failedCount++;
        results.push({ leadId: lead.id, phone: "", status: "failed", error: "No phone number" });
        continue;
      }

      // Personalize message with lead name
      const personalizedMsg = messageTemplate
        .replace(/\{name\}/gi, lead.name || "Customer")
        .replace(/\{phone\}/gi, lead.phone || "");

      // Clean phone number
      const cleanPhone = lead.phone.replace(/\D/g, "").replace(/^0+/, "");
      let normalizedPhone = cleanPhone;
      if (cleanPhone.startsWith("91") && cleanPhone.length === 12) {
        normalizedPhone = cleanPhone.slice(2);
      }

      if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
        failedCount++;
        results.push({ leadId: lead.id, phone: lead.phone, status: "failed", error: "Invalid phone" });
        continue;
      }

      try {
        // Send via Finbite API
        const formData = new URLSearchParams();
        formData.append("client_id", FINBITE_CLIENT_ID);
        formData.append("api_key", FINBITE_API_KEY);
        formData.append("whatsapp_client", FINBITE_WHATSAPP_CLIENT);
        formData.append("phone", normalizedPhone);
        formData.append("country_code", "91");
        formData.append("msg", personalizedMsg);
        formData.append("msg_type", "0");

        const response = await fetch(FINBITE_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const result = await response.json();
          if (response.ok && result.status !== false && !result.error) {
            sentCount++;
            deliveredCount++;
            results.push({ leadId: lead.id, phone: normalizedPhone, status: "sent" });

            // Save recipient record
            await supabase.from("broadcast_recipients").insert({
              broadcast_id: broadcastId,
              lead_id: lead.id,
              phone: normalizedPhone,
              status: "sent",
              sent_at: new Date().toISOString(),
            });
          } else {
            failedCount++;
            results.push({ leadId: lead.id, phone: normalizedPhone, status: "failed", error: JSON.stringify(result) });

            await supabase.from("broadcast_recipients").insert({
              broadcast_id: broadcastId,
              lead_id: lead.id,
              phone: normalizedPhone,
              status: "failed",
              error_message: JSON.stringify(result).substring(0, 500),
            });
          }
        } else {
          const text = await response.text();
          failedCount++;
          results.push({ leadId: lead.id, phone: normalizedPhone, status: "failed", error: "Non-JSON response" });

          await supabase.from("broadcast_recipients").insert({
            broadcast_id: broadcastId,
            lead_id: lead.id,
            phone: normalizedPhone,
            status: "failed",
            error_message: text.substring(0, 500),
          });
        }
      } catch (sendError) {
        failedCount++;
        const errMsg = sendError instanceof Error ? sendError.message : "Unknown error";
        results.push({ leadId: lead.id, phone: normalizedPhone, status: "failed", error: errMsg });

        await supabase.from("broadcast_recipients").insert({
          broadcast_id: broadcastId,
          lead_id: lead.id,
          phone: normalizedPhone,
          status: "failed",
          error_message: errMsg.substring(0, 500),
        });
      }

      // Rate limiting — small delay between messages to avoid API throttling
      await new Promise(resolve => setTimeout(resolve, 200));

      // Update progress every 10 messages
      if ((sentCount + failedCount) % 10 === 0) {
        await supabase
          .from("whatsapp_broadcasts")
          .update({ sent_count: sentCount, delivered_count: deliveredCount, failed_count: failedCount })
          .eq("id", broadcastId);
      }
    }

    // 5. Final update
    await supabase
      .from("whatsapp_broadcasts")
      .update({
        status: failedCount === leads.length ? "failed" : "completed",
        completed_at: new Date().toISOString(),
        sent_count: sentCount,
        delivered_count: deliveredCount,
        failed_count: failedCount,
        total_recipients: leads.length,
      })
      .eq("id", broadcastId);

    console.log(`Broadcast ${broadcastId} completed: ${sentCount} sent, ${failedCount} failed out of ${leads.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: leads.length,
          sent: sentCount,
          delivered: deliveredCount,
          failed: failedCount,
        },
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Broadcast send error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
