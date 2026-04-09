import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Auto-Close Pipeline Engine
 * 
 * Evaluates leads against auto_close_rules and advances pipeline stages
 * when conditions are met. Also handles AI-based qualification assessment.
 * 
 * Triggered by pg_cron every hour or manually.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "evaluate";

    if (action === "evaluate") {
      // Get active auto-close rules
      const { data: rules } = await supabase
        .from("auto_close_rules")
        .select("*")
        .eq("is_active", true);

      if (!rules?.length) {
        return respond({ processed: 0, message: "No active auto-close rules" });
      }

      let advanced = 0;
      let notified = 0;

      for (const rule of rules) {
        // Find leads matching the from_stage
        const conditions = rule.conditions as Record<string, any>;
        let query = supabase.from("leads").select("*")
          .eq("status", rule.from_stage)
          .order("created_at", { ascending: false })
          .limit(100);

        // Apply condition filters
        if (conditions.min_score) {
          query = query.gte("lead_score", conditions.min_score);
        }
        if (conditions.has_phone) {
          query = query.not("phone", "is", null);
        }
        if (conditions.has_email) {
          query = query.not("email", "is", null);
        }
        if (conditions.min_contact_attempts) {
          // Check via notes or other signals
        }
        if (conditions.vertical) {
          query = query.eq("service_category", conditions.vertical);
        }

        const { data: leads } = await query;
        if (!leads?.length) continue;

        for (const lead of leads) {
          // Check AI qualification if configured
          let qualifies = true;

          if (conditions.require_ai_qualification && LOVABLE_API_KEY) {
            qualifies = await aiQualifyLead(LOVABLE_API_KEY, lead, rule);
          }

          if (!qualifies) continue;

          // Advance the pipeline
          const { error: updateErr } = await supabase.from("leads").update({
            status: rule.to_stage,
            notes: `${lead.notes || ""}\n[Auto-Close] Advanced from ${rule.from_stage} → ${rule.to_stage} (Rule: ${rule.description || rule.id})`,
            updated_at: new Date().toISOString(),
          }).eq("id", lead.id);

          if (!updateErr) {
            advanced++;

            // Notify assigned executive
            if (rule.auto_notify && lead.assigned_to) {
              try {
                await fetch(`${SUPABASE_URL}/functions/v1/wa-automation-trigger`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${SERVICE_KEY}`,
                  },
                  body: JSON.stringify({
                    event: "lead_stage_advanced",
                    leadId: lead.id,
                    phone: lead.assigned_to,
                    name: lead.customer_name,
                    data: {
                      from_stage: rule.from_stage,
                      to_stage: rule.to_stage,
                      lead_name: lead.customer_name,
                      lead_phone: lead.phone,
                    },
                  }),
                });
                notified++;
              } catch (e) {
                console.error("Notification failed:", e);
              }
            }
          }
        }
      }

      return respond({ processed: advanced, notified, rules_evaluated: rules.length });
    }

    if (action === "qualify_lead") {
      // Single lead AI qualification
      const { lead_id } = body;
      if (!lead_id) throw new Error("lead_id required");
      if (!LOVABLE_API_KEY) throw new Error("AI not configured");

      const { data: lead } = await supabase.from("leads").select("*").eq("id", lead_id).single();
      if (!lead) throw new Error("Lead not found");

      const qualification = await aiQualifyLeadDetailed(LOVABLE_API_KEY, lead);

      // Update lead score
      await supabase.from("lead_scores").upsert({
        lead_id,
        score: qualification.score,
        segment: qualification.segment,
        reason: qualification.reason,
        recommended_action: qualification.recommended_action,
        scored_at: new Date().toISOString(),
      }, { onConflict: "lead_id" });

      await supabase.from("leads").update({
        lead_score: qualification.score,
        lead_segment: qualification.segment,
      }).eq("id", lead_id);

      return respond({ qualification });
    }

    return respond({ error: "Invalid action" }, 400);
  } catch (error) {
    console.error("Auto-close error:", error);
    return respond({ error: String(error) }, 500);
  }
});

async function aiQualifyLead(apiKey: string, lead: any, rule: any): Promise<boolean> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You are a lead qualification engine. Return ONLY 'true' or 'false'.",
          },
          {
            role: "user",
            content: `Should this lead be advanced from "${rule.from_stage}" to "${rule.to_stage}"?
Lead: ${lead.customer_name}, Phone: ${lead.phone}, Source: ${lead.source}, Notes: ${lead.notes?.substring(0, 200)}
Rule conditions: ${JSON.stringify(rule.conditions)}
Answer ONLY true or false.`,
          },
        ],
        max_tokens: 10,
        temperature: 0.1,
      }),
    });

    const data = await resp.json();
    const answer = data.choices?.[0]?.message?.content?.trim()?.toLowerCase();
    return answer === "true";
  } catch {
    return false;
  }
}

async function aiQualifyLeadDetailed(apiKey: string, lead: any) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are a lead qualification AI for GrabYourCar (Indian car dealership). Score leads 0-100 and provide actionable insights.`,
        },
        {
          role: "user",
          content: `Qualify this lead:
Name: ${lead.customer_name}
Phone: ${lead.phone}
Source: ${lead.source}
Car Interest: ${lead.car_model || "N/A"}
City: ${lead.city || "N/A"}
Budget: ${lead.budget_min || "N/A"} - ${lead.budget_max || "N/A"}
Timeline: ${lead.buying_timeline || "N/A"}
Status: ${lead.status}
Notes: ${lead.notes?.substring(0, 300) || "None"}
Created: ${lead.created_at}`,
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "qualify_lead",
          description: "Return lead qualification result",
          parameters: {
            type: "object",
            properties: {
              score: { type: "number", minimum: 0, maximum: 100 },
              segment: { type: "string", enum: ["hot_buyer", "warm_prospect", "nurture", "cold"] },
              reason: { type: "string" },
              recommended_action: { type: "string" },
              next_step: { type: "string" },
            },
            required: ["score", "segment", "reason", "recommended_action"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "qualify_lead" } },
      max_tokens: 500,
    }),
  });

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("AI qualification failed");
  return JSON.parse(toolCall.function.arguments);
}

function respond(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
