import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Auto-Dialer Engine
 * 
 * Actions:
 * - create_campaign: Create a new dialer campaign
 * - import_contacts: Bulk import contacts into a campaign
 * - get_next_contact: Get next contact to call (for manual dialing flow)
 * - update_disposition: Update call result after dialing
 * - campaign_stats: Get campaign statistics
 * - auto_create_leads: Convert interested contacts to CRM leads
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "create_campaign": {
        const { name, description, vertical, assigned_team_member } = body;
        if (!name) throw new Error("Campaign name required");

        const { data, error } = await supabase.from("auto_dialer_campaigns").insert({
          name,
          description,
          vertical: vertical || "car",
          assigned_team_member,
          status: "draft",
        }).select().single();

        if (error) throw error;
        return respond({ campaign: data });
      }

      case "import_contacts": {
        const { campaign_id, contacts } = body;
        if (!campaign_id || !contacts?.length) throw new Error("campaign_id and contacts[] required");

        const rows = contacts.map((c: any) => ({
          campaign_id,
          phone: c.phone,
          name: c.name || null,
          email: c.email || null,
          city: c.city || null,
          call_status: "pending",
          extra_data: c.extra_data || null,
        }));

        const { error } = await supabase.from("auto_dialer_contacts").insert(rows);
        if (error) throw error;

        // Update campaign counts
        const { count } = await supabase
          .from("auto_dialer_contacts")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign_id);

        const { count: pendingCount } = await supabase
          .from("auto_dialer_contacts")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign_id)
          .eq("call_status", "pending");

        await supabase.from("auto_dialer_campaigns").update({
          total_contacts: count || 0,
          pending_contacts: pendingCount || 0,
          status: "active",
        }).eq("id", campaign_id);

        return respond({ imported: rows.length });
      }

      case "get_next_contact": {
        const { campaign_id } = body;
        if (!campaign_id) throw new Error("campaign_id required");

        const { data, error } = await supabase
          .from("auto_dialer_contacts")
          .select("*")
          .eq("campaign_id", campaign_id)
          .eq("call_status", "pending")
          .order("created_at")
          .limit(1)
          .single();

        if (error || !data) {
          return respond({ contact: null, message: "No pending contacts" });
        }

        // Mark as calling
        await supabase.from("auto_dialer_contacts")
          .update({ call_status: "calling", called_at: new Date().toISOString() })
          .eq("id", data.id);

        return respond({ contact: data });
      }

      case "update_disposition": {
        const { contact_id, disposition, notes, call_duration_seconds, follow_up_date } = body;
        if (!contact_id || !disposition) throw new Error("contact_id and disposition required");

        const statusMap: Record<string, string> = {
          interested: "completed",
          not_interested: "completed",
          no_answer: "no_answer",
          busy: "retry",
          wrong_number: "completed",
          callback: "callback",
        };

        await supabase.from("auto_dialer_contacts").update({
          call_status: statusMap[disposition] || "completed",
          disposition,
          notes,
          call_duration_seconds,
          follow_up_date: follow_up_date || null,
          updated_at: new Date().toISOString(),
        }).eq("id", contact_id);

        // Update campaign stats
        const { data: contact } = await supabase
          .from("auto_dialer_contacts")
          .select("campaign_id")
          .eq("id", contact_id)
          .single();

        if (contact) {
          await updateCampaignStats(supabase, contact.campaign_id);
        }

        return respond({ updated: true });
      }

      case "auto_create_leads": {
        const { campaign_id } = body;
        if (!campaign_id) throw new Error("campaign_id required");

        const { data: interested } = await supabase
          .from("auto_dialer_contacts")
          .select("*")
          .eq("campaign_id", campaign_id)
          .eq("disposition", "interested")
          .is("lead_id", null);

        if (!interested?.length) {
          return respond({ created: 0, message: "No interested contacts without leads" });
        }

        let created = 0;
        for (const contact of interested) {
          try {
            // Forward to lead intake
            const resp = await fetch(`${SUPABASE_URL}/functions/v1/lead-intake-engine`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SERVICE_KEY}`,
              },
              body: JSON.stringify({
                name: contact.name || "Dialer Lead",
                phone: contact.phone,
                email: contact.email,
                city: contact.city,
                source: "auto_dialer",
                type: "dialer_lead",
                lead_source_type: "Auto Dialer",
                message_text: contact.notes || "Interested via auto-dialer campaign",
                vertical: "car",
              }),
            });

            const result = await resp.json();
            if (result.lead_id) {
              await supabase.from("auto_dialer_contacts")
                .update({ lead_id: result.lead_id })
                .eq("id", contact.id);
              created++;
            }
          } catch (e) {
            console.error(`Failed to create lead for ${contact.phone}:`, e);
          }
        }

        return respond({ created });
      }

      case "campaign_stats": {
        const { campaign_id } = body;
        if (!campaign_id) throw new Error("campaign_id required");

        const { data: campaign } = await supabase
          .from("auto_dialer_campaigns")
          .select("*")
          .eq("id", campaign_id)
          .single();

        const { data: dispositions } = await supabase
          .from("auto_dialer_contacts")
          .select("disposition, call_status")
          .eq("campaign_id", campaign_id);

        const stats: Record<string, number> = {};
        (dispositions || []).forEach((d: any) => {
          const key = d.disposition || d.call_status || "unknown";
          stats[key] = (stats[key] || 0) + 1;
        });

        return respond({ campaign, disposition_breakdown: stats });
      }

      default:
        return respond({ error: "Invalid action. Use: create_campaign, import_contacts, get_next_contact, update_disposition, auto_create_leads, campaign_stats" }, 400);
    }
  } catch (error) {
    console.error("Auto-dialer error:", error);
    return respond({ error: String(error) }, 500);
  }
});

async function updateCampaignStats(supabase: any, campaignId: string) {
  const counts = await Promise.all([
    supabase.from("auto_dialer_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId),
    supabase.from("auto_dialer_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("call_status", "pending"),
    supabase.from("auto_dialer_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("call_status", "completed"),
    supabase.from("auto_dialer_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("disposition", "interested"),
    supabase.from("auto_dialer_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("disposition", "not_interested"),
    supabase.from("auto_dialer_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("disposition", "no_answer"),
  ]);

  await supabase.from("auto_dialer_campaigns").update({
    total_contacts: counts[0].count || 0,
    pending_contacts: counts[1].count || 0,
    completed_contacts: counts[2].count || 0,
    interested_contacts: counts[3].count || 0,
    not_interested_contacts: counts[4].count || 0,
    no_answer_contacts: counts[5].count || 0,
    updated_at: new Date().toISOString(),
  }).eq("id", campaignId);
}

function respond(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
