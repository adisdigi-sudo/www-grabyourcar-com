import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing configuration" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, leadIds } = await req.json();

    if (action === "score") {
      // Fetch leads to score (either specific IDs or recent unscored)
      let query = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(50);
      if (leadIds?.length) {
        query = supabase.from("leads").select("*").in("id", leadIds);
      }
      const { data: leads, error } = await query;
      if (error) throw error;
      if (!leads?.length) {
        return new Response(JSON.stringify({ scored: 0, message: "No leads to score" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build AI prompt for batch scoring
      const leadsForAI = leads.map((l: any) => ({
        id: l.id,
        customer_name: l.customer_name,
        phone: l.phone,
        source: l.source,
        status: l.status,
        car_model: l.car_model,
        car_brand: l.car_brand,
        budget_min: l.budget_min,
        budget_max: l.budget_max,
        buying_timeline: l.buying_timeline,
        city: l.city,
        created_at: l.created_at,
        last_contacted_at: l.last_contacted_at,
        notes: l.notes?.substring(0, 100),
      }));

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are an AI lead scoring engine for an Indian car dealership (GrabYourCar). Score each lead 0-100 based on:
- Purchase intent signals (budget mentioned, specific car interest, timeline urgency)
- Engagement quality (source reliability, contact completeness)
- Recency (newer leads score higher)
- Follow-up status (contacted leads show engagement)

Also assign a segment: "hot_buyer" (score 80+), "warm_prospect" (50-79), "nurture" (25-49), "cold" (0-24).
And provide a one-line recommended action.`,
            },
            {
              role: "user",
              content: `Score these leads and return results. Leads:\n${JSON.stringify(leadsForAI, null, 2)}`,
            },
          ],
          tools: [{
            type: "function",
            function: {
              name: "score_leads",
              description: "Return scored leads with AI-generated scores, segments, and actions",
              parameters: {
                type: "object",
                properties: {
                  scores: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        lead_id: { type: "string" },
                        score: { type: "number", minimum: 0, maximum: 100 },
                        segment: { type: "string", enum: ["hot_buyer", "warm_prospect", "nurture", "cold"] },
                        reason: { type: "string" },
                        recommended_action: { type: "string" },
                      },
                      required: ["lead_id", "score", "segment", "reason", "recommended_action"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["scores"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "score_leads" } },
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const text = await response.text();
        console.error("AI error:", status, text);
        throw new Error("AI scoring failed");
      }

      const aiResult = await response.json();
      const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in AI response");

      const { scores } = JSON.parse(toolCall.function.arguments);

      // Update leads with scores — write to dedicated lead_scores table + leads columns
      let updated = 0;
      for (const s of scores) {
        // Upsert into lead_scores table
        await supabase.from("lead_scores").upsert({
          lead_id: s.lead_id,
          score: s.score,
          segment: s.segment,
          reason: s.reason,
          recommended_action: s.recommended_action,
          scored_at: new Date().toISOString(),
          scored_by: "ai_batch",
        }, { onConflict: "lead_id" });

        // Also update leads table for quick access
        const { error: updateError } = await supabase
          .from("leads")
          .update({
            lead_score: s.score,
            lead_segment: s.segment,
          })
          .eq("id", s.lead_id);
        if (!updateError) updated++;
      }

      return new Response(JSON.stringify({ scored: updated, scores }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "segment-summary") {
      // Get segment distribution
      const { data: leads } = await supabase.from("leads").select("notes, status, source, created_at");

      const segments = { hot_buyer: 0, warm_prospect: 0, nurture: 0, cold: 0, unscored: 0 };
      const sources: Record<string, number> = {};

      (leads || []).forEach((l: any) => {
        const match = l.notes?.match(/\[AI Score: (\d+)\/100/);
        const score = match ? parseInt(match[1]) : null;
        if (score === null) segments.unscored++;
        else if (score >= 80) segments.hot_buyer++;
        else if (score >= 50) segments.warm_prospect++;
        else if (score >= 25) segments.nurture++;
        else segments.cold++;

        const src = l.source || "unknown";
        sources[src] = (sources[src] || 0) + 1;
      });

      return new Response(JSON.stringify({ segments, sources, total: leads?.length || 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lead-scoring error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
