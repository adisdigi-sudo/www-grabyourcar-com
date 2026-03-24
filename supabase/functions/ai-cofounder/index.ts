import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchJson(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { headers });
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const body = await req.json();
    const { action, user_name, user_role, vertical, question, target_data, problem_data } = body;

    const headers = { "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = today.slice(0, 7);

    // Fetch business context
    const [leads, insurance, rentals, hsrp, deals, followUps, pendingTasks, targets, problems, teamMembers] = await Promise.all([
      fetchJson(`${SUPABASE_URL}/rest/v1/leads?created_at=gte.${today}T00:00:00&select=id,name,source,service_category,status,priority&limit=50`, headers),
      fetchJson(`${SUPABASE_URL}/rest/v1/insurance_clients?select=id,customer_name,phone,policy_expiry_date,lead_status,pipeline_stage,follow_up_date,assigned_executive&policy_expiry_date=lte.${new Date(Date.now() + 90*86400000).toISOString().split("T")[0]}&policy_expiry_date=gte.${today}&limit=50`, headers),
      fetchJson(`${SUPABASE_URL}/rest/v1/rental_bookings?select=id,customer_name,phone,pickup_date,return_date,status,payment_status&return_date=gte.${today}&return_date=lte.${new Date(Date.now() + 3*86400000).toISOString().split("T")[0]}&limit=30`, headers),
      fetchJson(`${SUPABASE_URL}/rest/v1/hsrp_bookings?select=id,owner_name,registration_number,order_status,payment_status&order_status=neq.completed&limit=30`, headers),
      fetchJson(`${SUPABASE_URL}/rest/v1/deals?select=id,deal_number,customer_id,deal_value,payment_status,deal_status,vertical_name&deal_status=eq.active&limit=30`, headers),
      fetchJson(`${SUPABASE_URL}/rest/v1/leads?select=id,name,phone,follow_up_date,status,assigned_to,service_category&follow_up_date=lte.${today}&status=neq.closed&limit=50`, headers),
      fetchJson(`${SUPABASE_URL}/rest/v1/ai_cofounder_tasks?select=id,title,status,priority&due_date=eq.${today}&status=eq.pending&limit=20`, headers),
      fetchJson(`${SUPABASE_URL}/rest/v1/team_targets?select=*&month_year=eq.${currentMonth}&limit=100`, headers),
      fetchJson(`${SUPABASE_URL}/rest/v1/team_problems?select=*&status=eq.open&limit=20`, headers),
      fetchJson(`${SUPABASE_URL}/rest/v1/team_members?select=*&is_active=eq.true&limit=50`, headers),
    ]);

    const safe = (arr: any) => Array.isArray(arr) ? arr : [];

    const businessContext = `
BUSINESS SNAPSHOT (${today}):
- New Leads Today: ${safe(leads).length}
- Insurance Renewals Due (90 days): ${safe(insurance).length}
- Self-Drive Returns Due (3 days): ${safe(rentals).length}
- HSRP Pending Orders: ${safe(hsrp).length}
- Active Deals: ${safe(deals).length}
- Overdue Follow-ups: ${safe(followUps).length}
- Pending AI Tasks Today: ${safe(pendingTasks).length}
- Open Team Problems: ${safe(problems).length}

TEAM TARGETS (${currentMonth}):
${safe(targets).map((t: any) => `  - ${t.team_member_name} [${t.vertical_name}]: ${t.achieved_count}/${t.target_count} deals (${t.achievement_pct}%) | ₹${t.achieved_revenue}/₹${t.target_revenue} revenue`).join('\n') || 'No targets set yet'}

INSURANCE RENEWALS:
${safe(insurance).slice(0, 10).map((i: any) => `  - ${i.customer_name} (${i.phone}) expires ${i.policy_expiry_date}, stage: ${i.pipeline_stage}, assigned: ${i.assigned_executive || 'unassigned'}`).join('\n') || 'None'}

OVERDUE FOLLOW-UPS:
${safe(followUps).slice(0, 10).map((f: any) => `  - ${f.name} (${f.phone}) due ${f.follow_up_date}, category: ${f.service_category}, assigned: ${f.assigned_to || 'unassigned'}`).join('\n') || 'None'}

SELF-DRIVE RETURNS DUE:
${safe(rentals).map((r: any) => `  - ${r.customer_name} (${r.phone}) return: ${r.return_date}, status: ${r.status}, payment: ${r.payment_status}`).join('\n') || 'None'}

HSRP PENDING:
${safe(hsrp).slice(0, 10).map((h: any) => `  - ${h.owner_name} (${h.registration_number}) status: ${h.order_status}, payment: ${h.payment_status}`).join('\n') || 'None'}

ACTIVE DEALS:
${safe(deals).map((d: any) => `  - Deal #${d.deal_number} value: ₹${d.deal_value}, payment: ${d.payment_status}, vertical: ${d.vertical_name}`).join('\n') || 'None'}

OPEN TEAM PROBLEMS:
${safe(problems).map((p: any) => `  - [${p.priority}] ${p.reported_by_name}: ${p.problem_description} (status: ${p.status})`).join('\n') || 'No open problems'}

TEAM MEMBERS:
${safe(teamMembers).map((m: any) => `  - ${m.full_name} (${m.role || 'employee'}) - ${m.department || 'general'}`).join('\n') || 'No team members'}
`;

    const systemPrompt = `You are the AI Co-Founder & Personal Manager of GrabYourCar — a multi-vertical automotive platform. You operate as a deeply involved business partner who manages the ENTIRE team.

Your personality:
- Warm, energetic startup co-founder obsessed with growth
- Address people by name: "Hey ${user_name || 'Boss'}! 🚀"
- Mix Hindi-English naturally (Delhi startup founder style)
- Specific with numbers, names, actionable next steps
- Every suggestion has a "WHY" and "IMPACT"
- Prioritize revenue-generating activities
- Motivational but data-driven
- Format with emojis, bullet points, clear sections
- End with a motivational one-liner

Your DEEP roles:
1. FOUNDER'S STRATEGIC ADVISOR - Push growth, identify opportunities, solve problems
2. TEAM MANAGER - Set targets, track progress, push each member to complete daily goals
3. PERSONAL ASSISTANT - Remind tasks, follow-ups, renewals, returns, orders
4. PROBLEM SOLVER - Listen to team problems, solve automatically, escalate only what needs founder approval
5. INCENTIVE CALCULATOR - Track performance, suggest weekly/monthly incentives
6. SALES COACH - Guide each team member step-by-step through their sales pipeline
7. REPORT GENERATOR - Create performance reports with actionable insights

Current user role: ${user_role || 'founder'} ${vertical ? `in ${vertical} vertical` : '(all verticals)'}

RULES:
1. Always suggest TOP 5 most impactful actions for TODAY
2. Include specific customer names/phone numbers from data
3. Flag URGENT items (overdue payments, expiring policies <7 days, car returns today)
4. Suggest cross-sell opportunities
5. Track team targets and push for completion
6. Calculate potential revenue impact
7. For team members - be their personal coach, break their target into daily micro-goals
8. For problems - try to solve with data-driven solutions first, escalate only if needed`;

    // Helper to stream AI
    async function streamAI(messages: any[]) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages, stream: true }),
      });
      if (!response.ok) {
        if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${response.status}`);
      }
      return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // Helper for non-streaming AI
    async function callAI(messages: any[], tools?: any[], toolChoice?: any) {
      const body: any = { model: "google/gemini-3-flash-preview", messages };
      if (tools) { body.tools = tools; body.tool_choice = toolChoice; }
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`AI error: ${response.status}`);
      return response.json();
    }

    if (action === "daily_briefing") {
      return streamAI([
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate today's comprehensive daily briefing based on this live data:\n\n${businessContext}\n\nGive me:\n1. 🌅 GOOD MORNING BRIEFING (motivational + key numbers)\n2. 🎯 TEAM TARGET STATUS (who's on track, who needs push)\n3. 🔥 URGENT NOW (immediate actions needed)\n4. 📋 TODAY'S TOP 5 TASKS (prioritized with names & numbers)\n5. 💰 REVENUE OPPORTUNITIES (cross-sell, upsell)\n6. ⚠️ RISKS & ALERTS (overdue, expiring)\n7. 👥 TEAM COACHING NOTES (specific guidance per member)\n8. 🏆 DAILY TARGET (what success looks like today)` }
      ]);

    } else if (action === "suggest_tasks") {
      const data = await callAI(
        [{ role: "system", content: systemPrompt }, { role: "user", content: `Based on this data:\n\n${businessContext}\n\nGenerate specific actionable tasks for every team member. Include their name, break targets into daily micro-goals, and add coaching suggestions.` }],
        [{
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
                      task_type: { type: "string", enum: ["follow_up", "renewal", "order_processing", "payment_collection", "car_return", "cross_sell", "new_lead", "approval", "target_push", "coaching", "problem_solving"] },
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
        { type: "function", function: { name: "generate_tasks" } }
      );

      let tasks: any[] = [];
      try {
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall) tasks = JSON.parse(toolCall.function.arguments).tasks || [];
      } catch { /* fallback */ }

      if (tasks.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/ai_cofounder_tasks`, {
          method: "POST",
          headers: { ...headers, "Prefer": "return=minimal" },
          body: JSON.stringify(tasks.map((t: any) => ({
            title: t.title, description: t.description, priority: t.priority,
            task_type: t.task_type, vertical: t.vertical,
            team_member_name: t.team_member_name || null,
            ai_suggestion: t.ai_suggestion || null,
            due_date: today, status: "pending",
          }))),
        });
      }

      return new Response(JSON.stringify({ tasks }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "quick_insight") {
      return streamAI([
        { role: "system", content: systemPrompt },
        { role: "user", content: `Business data:\n${businessContext}\n\nQuestion: ${question || "What should I focus on right now?"}` }
      ]);

    } else if (action === "solve_problem") {
      // AI tries to solve a team problem automatically
      const problemText = problem_data?.description || "";
      const solveResult = await callAI(
        [{ role: "system", content: systemPrompt + "\n\nYou are solving a team member's problem. Analyze the business data and provide a concrete solution. If you can solve it with data/process changes, do so. If it needs founder's decision (budget, policy change, hiring), mark it for escalation." },
         { role: "user", content: `Team Problem:\nReported by: ${problem_data?.reported_by || 'Team member'}\nVertical: ${problem_data?.vertical || 'General'}\nProblem: ${problemText}\n\nBusiness context:\n${businessContext}` }],
        [{
          type: "function",
          function: {
            name: "solve_problem",
            description: "Analyze and solve a team problem",
            parameters: {
              type: "object",
              properties: {
                solution: { type: "string", description: "Detailed solution or action steps" },
                can_solve_automatically: { type: "boolean", description: "Can this be solved without founder approval?" },
                escalation_reason: { type: "string", description: "Why founder needs to decide (if applicable)" },
                action_items: { type: "array", items: { type: "string" } },
              },
              required: ["solution", "can_solve_automatically"],
              additionalProperties: false,
            },
          },
        }],
        { type: "function", function: { name: "solve_problem" } }
      );

      let solution = { solution: "", can_solve_automatically: false, escalation_reason: "", action_items: [] };
      try {
        const tc = solveResult.choices?.[0]?.message?.tool_calls?.[0];
        if (tc) solution = JSON.parse(tc.function.arguments);
      } catch {}

      // Save to team_problems
      if (problem_data?.id) {
        await fetch(`${SUPABASE_URL}/rest/v1/team_problems?id=eq.${problem_data.id}`, {
          method: "PATCH",
          headers: { ...headers, "Prefer": "return=minimal" },
          body: JSON.stringify({
            ai_solution: solution.solution,
            ai_solved: solution.can_solve_automatically,
            escalated_to_founder: !solution.can_solve_automatically,
            status: solution.can_solve_automatically ? "ai_resolved" : "escalated",
          }),
        });
      }

      return new Response(JSON.stringify(solution), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "generate_report") {
      const reportType = body.report_type || "weekly";
      const period = body.period || currentMonth;
      
      return streamAI([
        { role: "system", content: systemPrompt + "\n\nGenerate a detailed performance report. Include: individual performance vs targets, revenue breakdown, conversion rates, top performers, underperformers who need coaching, incentive recommendations, and next period strategy." },
        { role: "user", content: `Generate ${reportType} performance report for period: ${period}\n\nBusiness data:\n${businessContext}\n\nInclude:\n1. 📊 EXECUTIVE SUMMARY\n2. 🎯 TARGET vs ACHIEVEMENT (per member, per vertical)\n3. 💰 REVENUE BREAKDOWN\n4. 🏆 TOP PERFORMERS & INCENTIVE SUGGESTIONS\n5. ⚠️ UNDERPERFORMERS & COACHING PLAN\n6. 📈 TRENDS & PREDICTIONS\n7. 🎯 NEXT PERIOD TARGETS RECOMMENDATION` }
      ]);

    } else if (action === "team_coaching") {
      // Personal coaching for a specific team member
      const memberName = body.member_name || "Team member";
      const memberVertical = body.member_vertical || "";
      
      return streamAI([
        { role: "system", content: systemPrompt + `\n\nYou are now acting as a PERSONAL MANAGER & COACH for ${memberName}. Be warm, motivational, but specific. Break their target into today's micro-goals. Guide them step-by-step.` },
        { role: "user", content: `Create a personalized coaching plan for ${memberName} (${memberVertical}).\n\nData:\n${businessContext}\n\nInclude:\n1. 👋 Personal greeting & motivation\n2. 🎯 Their target breakdown (monthly → weekly → daily)\n3. 📋 Today's specific tasks with customer names\n4. 💡 Sales tips specific to their pipeline\n5. 🏆 Small wins to celebrate\n6. 📞 Exact calls to make with scripts\n7. 🔥 One challenge for the day` }
      ]);

    } else if (action === "set_targets") {
      // Save targets set by super admin
      if (target_data && Array.isArray(target_data)) {
        for (const t of target_data) {
          await fetch(`${SUPABASE_URL}/rest/v1/team_targets`, {
            method: "POST",
            headers: { ...headers, "Prefer": "return=representation,resolution=merge-duplicates" },
            body: JSON.stringify({
              user_id: t.user_id,
              team_member_name: t.team_member_name,
              vertical_name: t.vertical_name,
              month_year: t.month_year || currentMonth,
              target_count: t.target_count || 0,
              target_revenue: t.target_revenue || 0,
              set_by: "super_admin",
            }),
          });
        }
        
        // Generate daily pushes for target notification
        for (const t of target_data) {
          await fetch(`${SUPABASE_URL}/rest/v1/ai_daily_pushes`, {
            method: "POST",
            headers: { ...headers, "Prefer": "return=minimal" },
            body: JSON.stringify({
              user_id: t.user_id,
              team_member_name: t.team_member_name,
              push_type: "target_assigned",
              message: `🎯 New target set! ${t.target_count} deals / ₹${t.target_revenue} revenue for ${t.vertical_name} this month. Let's crush it!`,
              vertical_name: t.vertical_name,
            }),
          });
        }

        return new Response(JSON.stringify({ success: true, targets_set: target_data.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "No target_data provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "generate_pushes") {
      // Generate daily reminder pushes for all team members
      const pushData = await callAI(
        [{ role: "system", content: systemPrompt + "\n\nGenerate personalized daily push notifications for each team member. Each push should be warm, specific, and action-oriented with exact customer names and tasks." },
         { role: "user", content: `Generate daily push reminders for all team members.\n\nData:\n${businessContext}` }],
        [{
          type: "function",
          function: {
            name: "generate_pushes",
            description: "Generate daily push notifications for team",
            parameters: {
              type: "object",
              properties: {
                pushes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      team_member_name: { type: "string" },
                      push_type: { type: "string", enum: ["daily_reminder", "target_push", "follow_up", "renewal_alert", "car_return", "payment_due", "coaching_tip", "incentive_update"] },
                      message: { type: "string" },
                      vertical_name: { type: "string" },
                    },
                    required: ["team_member_name", "push_type", "message"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["pushes"],
              additionalProperties: false,
            },
          },
        }],
        { type: "function", function: { name: "generate_pushes" } }
      );

      let pushes: any[] = [];
      try {
        const tc = pushData.choices?.[0]?.message?.tool_calls?.[0];
        if (tc) pushes = JSON.parse(tc.function.arguments).pushes || [];
      } catch {}

      if (pushes.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/ai_daily_pushes`, {
          method: "POST",
          headers: { ...headers, "Prefer": "return=minimal" },
          body: JSON.stringify(pushes.map((p: any) => ({
            team_member_name: p.team_member_name,
            push_type: p.push_type,
            message: p.message,
            vertical_name: p.vertical_name || null,
          }))),
        });
      }

      return new Response(JSON.stringify({ success: true, pushes_generated: pushes.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("ai-cofounder error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
