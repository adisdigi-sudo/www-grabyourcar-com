import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CRM_TOOLS = [
  {
    type: "function",
    function: {
      name: "query_leads",
      description: "Query leads from the CRM database with filters like status, source, date range, city, priority.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Lead status: new, contacted, interested, quoted, booked, delivered, lost" },
          source: { type: "string", description: "Lead source: website, whatsapp, chatbot, phone, referral" },
          priority: { type: "string", description: "Lead priority: high, medium, low" },
          city: { type: "string", description: "Customer city" },
          days_back: { type: "number", description: "Get leads from last N days (default 7)" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_deals",
      description: "Query deals/sales pipeline data with filters.",
      parameters: {
        type: "object",
        properties: {
          deal_status: { type: "string", description: "Deal status: draft, active, closed, cancelled" },
          days_back: { type: "number", description: "Get deals from last N days" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stale_leads",
      description: "Find leads that haven't been contacted or followed up recently.",
      parameters: {
        type: "object",
        properties: {
          stale_days: { type: "number", description: "Consider stale if no activity for N days (default 3)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_whatsapp_message",
      description: "Draft a personalized WhatsApp follow-up message for a lead.",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string", description: "Customer name" },
          car_interest: { type: "string", description: "Car they're interested in" },
          context: { type: "string", description: "Additional context like last interaction, stage" },
          tone: { type: "string", enum: ["friendly", "urgent", "professional"], description: "Message tone" },
        },
        required: ["customer_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_performance_summary",
      description: "Get sales team performance metrics and KPIs.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month"], description: "Time period" },
        },
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Verify admin
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: isAdminResult } = await supabase.rpc("is_admin", { _user_id: userId });
    if (!isAdminResult) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, conversation_history } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are GrabYourCar's CRM AI Assistant — a smart data analyst and sales advisor.

You have tools to query the CRM database in real-time. USE THEM to answer questions with actual data.

Capabilities:
- Query leads by status, source, city, priority, date range
- Query deals/sales pipeline
- Find stale leads needing follow-up
- Draft personalized WhatsApp messages
- Generate performance summaries

Guidelines:
- Always use tools to get real data — never make up numbers
- Present data in markdown tables when showing lists
- Be concise and action-oriented
- Suggest next steps after every answer
- Use ₹ for currency, Indian number formatting`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history if provided
    if (conversation_history?.length) {
      messages.push(...conversation_history.slice(-10));
    }
    messages.push({ role: "user", content: query });

    // First call with tools
    const firstResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools: CRM_TOOLS,
        tool_choice: "auto",
        max_tokens: 2000,
      }),
    });

    if (!firstResponse.ok) {
      if (firstResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (firstResponse.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${firstResponse.status}`);
    }

    const firstData = await firstResponse.json();
    const firstChoice = firstData.choices?.[0];

    // Handle tool calls
    if (firstChoice?.finish_reason === "tool_calls" && firstChoice.message?.tool_calls?.length) {
      const toolResults: any[] = [];

      for (const tc of firstChoice.message.tool_calls) {
        let args: any;
        try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }

        let result: any;
        switch (tc.function.name) {
          case "query_leads":
            result = await queryLeads(supabase, args);
            break;
          case "query_deals":
            result = await queryDeals(supabase, args);
            break;
          case "get_stale_leads":
            result = await getStaleLeads(supabase, args);
            break;
          case "draft_whatsapp_message":
            result = draftWhatsAppMessage(args);
            break;
          case "get_performance_summary":
            result = await getPerformanceSummary(supabase, args);
            break;
          default:
            result = { error: "Unknown tool" };
        }

        toolResults.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }

      // Second call with tool results
      const secondResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [...messages, firstChoice.message, ...toolResults],
          max_tokens: 2000,
        }),
      });

      if (!secondResponse.ok) throw new Error(`AI error: ${secondResponse.status}`);
      const secondData = await secondResponse.json();
      const content = secondData.choices?.[0]?.message?.content?.trim() || "No response";

      return new Response(JSON.stringify({ response: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No tools — direct response
    const content = firstChoice?.message?.content?.trim() || "I couldn't process that.";
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

// ===== CRM TOOL IMPLEMENTATIONS =====
async function queryLeads(supabase: any, args: any) {
  const daysBack = args.days_back || 7;
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();
  const limit = Math.min(args.limit || 20, 50);

  let query = supabase.from("leads")
    .select("id, customer_name, phone, source, status, priority, service_category, city, created_at, notes")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (args.status) query = query.eq("status", args.status);
  if (args.source) query = query.eq("source", args.source);
  if (args.priority) query = query.eq("priority", args.priority);
  if (args.city) query = query.ilike("city", `%${args.city}%`);

  const { data, error, count } = await query;
  if (error) return { error: error.message };

  return {
    total: data?.length || 0,
    period: `Last ${daysBack} days`,
    leads: (data || []).map((l: any) => ({
      name: l.customer_name,
      phone: l.phone,
      source: l.source,
      status: l.status,
      priority: l.priority,
      service: l.service_category,
      city: l.city,
      date: new Date(l.created_at).toLocaleDateString("en-IN"),
    })),
  };
}

async function queryDeals(supabase: any, args: any) {
  const daysBack = args.days_back || 30;
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();

  let query = supabase.from("deals")
    .select("id, deal_value, deal_status, payment_status, created_at, customer_id")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  if (args.deal_status) query = query.eq("deal_status", args.deal_status);

  const { data, error } = await query;
  if (error) return { error: error.message };

  const total = data?.length || 0;
  const totalValue = (data || []).reduce((s: number, d: any) => s + (d.deal_value || 0), 0);
  const closedDeals = (data || []).filter((d: any) => d.deal_status === "closed");
  const closedValue = closedDeals.reduce((s: number, d: any) => s + (d.deal_value || 0), 0);

  return {
    period: `Last ${daysBack} days`,
    total_deals: total,
    total_pipeline_value: `₹${totalValue.toLocaleString("en-IN")}`,
    closed_deals: closedDeals.length,
    closed_value: `₹${closedValue.toLocaleString("en-IN")}`,
    by_status: {
      draft: data?.filter((d: any) => d.deal_status === "draft").length || 0,
      active: data?.filter((d: any) => d.deal_status === "active").length || 0,
      closed: closedDeals.length,
      cancelled: data?.filter((d: any) => d.deal_status === "cancelled").length || 0,
    },
  };
}

async function getStaleLeads(supabase: any, args: any) {
  const staleDays = args.stale_days || 3;
  const staleDate = new Date(Date.now() - staleDays * 86400000).toISOString();

  const { data, error } = await supabase.from("leads")
    .select("id, customer_name, phone, status, priority, service_category, city, created_at, updated_at")
    .in("status", ["new", "contacted", "interested"])
    .lt("updated_at", staleDate)
    .order("updated_at", { ascending: true })
    .limit(15);

  if (error) return { error: error.message };

  return {
    stale_count: data?.length || 0,
    stale_threshold: `${staleDays} days`,
    leads: (data || []).map((l: any) => ({
      name: l.customer_name,
      phone: l.phone,
      status: l.status,
      priority: l.priority,
      service: l.service_category,
      city: l.city,
      last_updated: new Date(l.updated_at).toLocaleDateString("en-IN"),
      days_stale: Math.floor((Date.now() - new Date(l.updated_at).getTime()) / 86400000),
    })),
    action: "Follow up immediately on high-priority stale leads",
  };
}

function draftWhatsAppMessage(args: any) {
  const name = args.customer_name || "Customer";
  const car = args.car_interest || "";
  const tone = args.tone || "friendly";
  const context = args.context || "";

  const templates: Record<string, string> = {
    friendly: `Hi ${name}! 👋\n\nHope you're doing well! ${car ? `Just checking in about the ${car} you were interested in.` : "We'd love to help you find your perfect car!"}\n\n${context ? `${context}\n\n` : ""}Would you like to schedule a visit or need any information? We're here to help! 😊\n\n— Team GrabYourCar`,
    urgent: `Hi ${name},\n\n🔥 Quick update! ${car ? `The ${car} you liked has limited stock and we have an exclusive offer ending soon.` : "We have some amazing limited-time offers on popular cars."}\n\n${context ? `${context}\n\n` : ""}Don't miss out — reply now or call us to lock in the best deal!\n\n— Team GrabYourCar`,
    professional: `Dear ${name},\n\nThank you for your interest in GrabYourCar.${car ? ` Regarding the ${car} — we have updated pricing and availability information for you.` : ""}\n\n${context ? `${context}\n\n` : ""}Please let us know a convenient time for a detailed discussion.\n\nBest regards,\nTeam GrabYourCar`,
  };

  return {
    message: templates[tone] || templates.friendly,
    tone,
    note: "Copy this message and send via WhatsApp",
  };
}

async function getPerformanceSummary(supabase: any, args: any) {
  const period = args.period || "week";
  const daysMap: Record<string, number> = { today: 1, week: 7, month: 30 };
  const days = daysMap[period] || 7;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [leadsRes, dealsRes, insuranceRes] = await Promise.all([
    supabase.from("leads").select("id, status, source, priority", { count: "exact" }).gte("created_at", since),
    supabase.from("deals").select("id, deal_value, deal_status").gte("created_at", since),
    supabase.from("insurance_clients").select("id", { count: "exact" }).gte("created_at", since),
  ]);

  const leads = leadsRes.data || [];
  const deals = dealsRes.data || [];

  return {
    period: period === "today" ? "Today" : period === "week" ? "This Week" : "This Month",
    leads: {
      total: leads.length,
      new: leads.filter((l: any) => l.status === "new").length,
      hot: leads.filter((l: any) => l.priority === "high").length,
      by_source: leads.reduce((acc: any, l: any) => {
        acc[l.source || "unknown"] = (acc[l.source || "unknown"] || 0) + 1;
        return acc;
      }, {}),
    },
    deals: {
      total: deals.length,
      closed: deals.filter((d: any) => d.deal_status === "closed").length,
      revenue: `₹${deals.filter((d: any) => d.deal_status === "closed").reduce((s: number, d: any) => s + (d.deal_value || 0), 0).toLocaleString("en-IN")}`,
      pipeline: `₹${deals.filter((d: any) => d.deal_status === "active").reduce((s: number, d: any) => s + (d.deal_value || 0), 0).toLocaleString("en-IN")}`,
    },
    insurance_clients: insuranceRes.count || 0,
  };
}
