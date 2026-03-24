import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { action, user_name, user_role, vertical } = await req.json();

    // Fetch business context data
    const headers = { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };

    const today = new Date().toISOString().split("T")[0];

    // Parallel fetch all business data
    const [
      leadsRes, insuranceRes, rentalRes, hsrpRes, dealsRes, followUpsRes, pendingTasksRes
    ] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/leads?created_at=gte.${today}T00:00:00&select=id,name,source,service_category,status,priority&limit=50`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/insurance_clients?select=id,customer_name,phone,policy_expiry_date,lead_status,pipeline_stage,follow_up_date,assigned_executive&policy_expiry_date=lte.${new Date(Date.now() + 90*86400000).toISOString().split("T")[0]}&policy_expiry_date=gte.${today}&limit=50`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/rental_bookings?select=id,customer_name,phone,pickup_date,return_date,status,payment_status&return_date=gte.${today}&return_date=lte.${new Date(Date.now() + 3*86400000).toISOString().split("T")[0]}&limit=30`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/hsrp_bookings?select=id,owner_name,registration_number,order_status,payment_status&order_status=neq.completed&limit=30`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/deals?select=id,deal_number,customer_id,deal_value,payment_status,deal_status,vertical_name&deal_status=eq.active&limit=30`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/leads?select=id,name,phone,follow_up_date,status,assigned_to,service_category&follow_up_date=lte.${today}&status=neq.closed&limit=50`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/ai_cofounder_tasks?select=id,title,status,priority&due_date=eq.${today}&status=eq.pending&limit=20`, { headers }),
    ]);

    const [leads, insurance, rentals, hsrp, deals, followUps, pendingTasks] = await Promise.all([
      leadsRes.json(), insuranceRes.json(), rentalRes.json(), hsrpRes.json(), dealsRes.json(), followUpsRes.json(), pendingTasksRes.json()
    ]);

    const businessContext = `
BUSINESS SNAPSHOT (${today}):
- New Leads Today: ${Array.isArray(leads) ? leads.length : 0}
- Insurance Renewals Due (90 days): ${Array.isArray(insurance) ? insurance.length : 0}
- Self-Drive Returns Due (3 days): ${Array.isArray(rentals) ? rentals.length : 0}
- HSRP Pending Orders: ${Array.isArray(hsrp) ? hsrp.length : 0}
- Active Deals: ${Array.isArray(deals) ? deals.length : 0}
- Overdue Follow-ups: ${Array.isArray(followUps) ? followUps.length : 0}
- Pending AI Tasks Today: ${Array.isArray(pendingTasks) ? pendingTasks.length : 0}

INSURANCE RENEWALS DETAIL:
${Array.isArray(insurance) ? insurance.slice(0, 10).map((i: any) => `  - ${i.customer_name} (${i.phone}) expires ${i.policy_expiry_date}, stage: ${i.pipeline_stage}, assigned: ${i.assigned_executive || 'unassigned'}`).join('\n') : 'None'}

OVERDUE FOLLOW-UPS:
${Array.isArray(followUps) ? followUps.slice(0, 10).map((f: any) => `  - ${f.name} (${f.phone}) due ${f.follow_up_date}, category: ${f.service_category}, assigned: ${f.assigned_to || 'unassigned'}`).join('\n') : 'None'}

SELF-DRIVE RETURNS DUE:
${Array.isArray(rentals) ? rentals.map((r: any) => `  - ${r.customer_name} (${r.phone}) return: ${r.return_date}, status: ${r.status}, payment: ${r.payment_status}`).join('\n') : 'None'}

HSRP PENDING:
${Array.isArray(hsrp) ? hsrp.slice(0, 10).map((h: any) => `  - ${h.owner_name} (${h.registration_number}) status: ${h.order_status}, payment: ${h.payment_status}`).join('\n') : 'None'}

ACTIVE DEALS:
${Array.isArray(deals) ? deals.map((d: any) => `  - Deal #${d.deal_number} value: ₹${d.deal_value}, payment: ${d.payment_status}, vertical: ${d.vertical_name}`).join('\n') : 'None'}
`;

    const systemPrompt = `You are the AI Co-Founder of GrabYourCar — a multi-vertical automotive platform. You act as a proactive, strategic, and deeply involved business partner.

Your personality:
- You're like a friendly, energetic startup co-founder who is obsessed with growth
- You address team members by name warmly: "Hey ${user_name || 'Boss'}! 🚀"
- Mix Hindi-English naturally (like a Delhi startup founder)
- Be specific with numbers, names, and actionable next steps
- Every suggestion should have a clear "WHY" and "IMPACT" 
- Prioritize revenue-generating activities
- Be motivational but data-driven
- Format output with emojis, bullet points, and clear sections
- End with a motivational one-liner

Your role for this user: ${user_role || 'founder'} ${vertical ? `in ${vertical} vertical` : '(all verticals)'}

RULES:
1. Always suggest the TOP 5 most impactful actions for TODAY
2. Include specific customer names/phone numbers from data when relevant
3. Flag any URGENT items (overdue payments, expiring policies in <7 days, car returns today)
4. Suggest cross-sell opportunities (insurance lead -> car sale, car buyer -> insurance)
5. Track and remind about pending approvals
6. Every task should be actionable with a single click or call
7. Calculate potential revenue impact where possible`;

    if (action === "daily_briefing") {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Generate today's daily briefing and action plan based on this live business data:\n\n${businessContext}\n\nGive me:\n1. 🌅 GOOD MORNING BRIEFING (2-3 lines motivational + key numbers)\n2. 🔥 URGENT NOW (things that need immediate action)\n3. 📋 TODAY'S TOP 5 TASKS (prioritized, with names & numbers)\n4. 💰 REVENUE OPPORTUNITIES (cross-sell, upsell, follow-up)\n5. ⚠️ RISKS & ALERTS (overdue items, expiring policies)\n6. 🎯 DAILY TARGET (what success looks like today)` }
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${response.status}`);
      }

      return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });

    } else if (action === "suggest_tasks") {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Based on this data:\n\n${businessContext}\n\nGenerate specific actionable tasks for the team. Return as JSON array.` }
          ],
          tools: [{
            type: "function",
            function: {
              name: "generate_tasks",
              description: "Generate prioritized daily tasks for the team",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
                        task_type: { type: "string", enum: ["follow_up", "renewal", "order_processing", "payment_collection", "car_return", "cross_sell", "new_lead", "approval"] },
                        vertical: { type: "string" },
                        team_member_name: { type: "string" },
                        ai_suggestion: { type: "string" },
                      },
                      required: ["title", "description", "priority", "task_type", "vertical"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["tasks"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "generate_tasks" } },
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);
      const data = await response.json();
      
      let tasks: any[] = [];
      try {
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall) {
          const parsed = JSON.parse(toolCall.function.arguments);
          tasks = parsed.tasks || [];
        }
      } catch { /* fallback empty */ }

      // Save tasks to DB
      if (tasks.length > 0) {
        const inserts = tasks.map((t: any) => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          task_type: t.task_type,
          vertical: t.vertical,
          team_member_name: t.team_member_name || null,
          ai_suggestion: t.ai_suggestion || null,
          due_date: today,
          status: "pending",
        }));

        await fetch(`${SUPABASE_URL}/rest/v1/ai_cofounder_tasks`, {
          method: "POST",
          headers: { ...headers, "Prefer": "return=minimal" },
          body: JSON.stringify(inserts),
        });
      }

      return new Response(JSON.stringify({ tasks }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "quick_insight") {
      const { question } = await req.json().catch(() => ({ question: "" }));
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Business data:\n${businessContext}\n\nQuestion: ${question || "What should I focus on right now to maximize revenue?"}` }
          ],
          stream: true,
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);
      return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("ai-cofounder error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
