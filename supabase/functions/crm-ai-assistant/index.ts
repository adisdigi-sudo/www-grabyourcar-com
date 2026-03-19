import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    // Verify user is admin
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    // Use service role for data queries
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check admin
    const { data: isAdminResult } = await supabase.rpc("is_admin", { _user_id: userId });
    if (!isAdminResult) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, context } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather CRM context data
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    const [leadsRes, dealsRes, insuranceRes, recentLeadsRes] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("deals").select("id, deal_value, deal_status", { count: "exact" }).gte("created_at", monthAgo),
      supabase.from("insurance_clients").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("id, customer_name, source, status, priority, created_at").gte("created_at", weekAgo).order("created_at", { ascending: false }).limit(20),
    ]);

    const crmSnapshot = `
CRM SNAPSHOT:
- Total leads: ${leadsRes.count || 0}
- Insurance clients: ${insuranceRes.count || 0}
- Deals this month: ${dealsRes.data?.length || 0}
- Won deals value: ₹${(dealsRes.data?.filter((d: any) => d.deal_status === "closed").reduce((s: number, d: any) => s + (d.deal_value || 0), 0) || 0).toLocaleString("en-IN")}
- Recent leads (7 days): ${recentLeadsRes.data?.length || 0}
${recentLeadsRes.data?.slice(0, 5).map((l: any) => `  • ${l.customer_name} (${l.source || "unknown"}) - ${l.status}`).join("\n") || ""}
`;

    const systemPrompt = `You are GrabYourCar's CRM AI Assistant. You help admin staff with:
- Lead analysis and follow-up suggestions
- Sales performance insights
- Draft WhatsApp messages and emails for customers
- Quick data lookups and summaries
- Workflow optimization suggestions

${crmSnapshot}
${context ? `Additional context: ${context}` : ""}

Be concise, data-driven, and action-oriented. Use bullet points. Include specific numbers when available.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "I couldn't process that request.";

    return new Response(JSON.stringify({ response: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("CRM Assistant error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
