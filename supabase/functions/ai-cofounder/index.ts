import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const fetchJson = async (url: string, h: Record<string, string>) => (await fetch(url, { headers: h })).json();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SB = Deno.env.get("SUPABASE_URL")!;
    const SK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const body = await req.json();
    const { action, user_name, user_role, vertical, question, target_data, problem_data } = body;

    const h = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
    const today = new Date().toISOString().split("T")[0];
    const cm = today.slice(0, 7); // current month

    // Parallel fetch all business data
    const [leads, insurance, rentals, hsrp, deals, followUps, pendingTasks, targets, problems, teamMembers, expenses, bankAccounts, invoices, risks, crossSells, mistakes] = await Promise.all([
      fetchJson(`${SB}/rest/v1/leads?created_at=gte.${today}T00:00:00&select=id,name,source,service_category,status,priority&limit=50`, h),
      fetchJson(`${SB}/rest/v1/insurance_clients?select=id,customer_name,phone,policy_expiry_date,lead_status,pipeline_stage,follow_up_date,assigned_executive&policy_expiry_date=lte.${new Date(Date.now()+90*86400000).toISOString().split("T")[0]}&policy_expiry_date=gte.${today}&limit=50`, h),
      fetchJson(`${SB}/rest/v1/rental_bookings?select=id,customer_name,phone,pickup_date,return_date,status,payment_status&return_date=gte.${today}&return_date=lte.${new Date(Date.now()+3*86400000).toISOString().split("T")[0]}&limit=30`, h),
      fetchJson(`${SB}/rest/v1/hsrp_bookings?select=id,owner_name,registration_number,order_status,payment_status&order_status=neq.completed&limit=30`, h),
      fetchJson(`${SB}/rest/v1/deals?select=id,deal_number,customer_id,deal_value,payment_status,deal_status,vertical_name,payment_received_amount&deal_status=eq.active&limit=50`, h),
      fetchJson(`${SB}/rest/v1/leads?select=id,name,phone,follow_up_date,status,assigned_to,service_category&follow_up_date=lte.${today}&status=neq.closed&limit=50`, h),
      fetchJson(`${SB}/rest/v1/ai_cofounder_tasks?select=id,title,status,priority&due_date=eq.${today}&status=eq.pending&limit=20`, h),
      fetchJson(`${SB}/rest/v1/team_targets?select=*&month_year=eq.${cm}&limit=100`, h),
      fetchJson(`${SB}/rest/v1/team_problems?select=*&status=eq.open&limit=20`, h),
      fetchJson(`${SB}/rest/v1/team_members?select=*&is_active=eq.true&limit=50`, h),
      fetchJson(`${SB}/rest/v1/expenses?select=id,category,amount,expense_date,vertical_name&month_year=eq.${cm}&limit=200`, h),
      fetchJson(`${SB}/rest/v1/bank_accounts?select=id,account_name,current_balance,bank_name&is_active=eq.true&limit=10`, h),
      fetchJson(`${SB}/rest/v1/invoices?select=id,total_amount,status,vertical_name,invoice_date&invoice_date=gte.${cm}-01&limit=200`, h),
      fetchJson(`${SB}/rest/v1/ai_risk_indicators?select=*&auto_resolved=eq.false&limit=20`, h),
      fetchJson(`${SB}/rest/v1/ai_cross_sell_suggestions?select=*&status=eq.pending&limit=20`, h),
      fetchJson(`${SB}/rest/v1/ai_mistake_logs?select=*&status=eq.detected&limit=20`, h),
    ]);

    const s = (a: any) => Array.isArray(a) ? a : [];

    // Financial calculations
    const totalRevenue = s(invoices).filter((i: any) => i.status === "paid").reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0);
    const totalExpenses = s(expenses).reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
    const cashInBank = s(bankAccounts).reduce((sum: number, b: any) => sum + Number(b.current_balance || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const monthlyBurn = totalExpenses;
    const runwayMonths = monthlyBurn > 0 ? Math.round((cashInBank / monthlyBurn) * 10) / 10 : 99;
    const pendingPayments = s(deals).filter((d: any) => d.payment_status !== "received").reduce((sum: number, d: any) => sum + (Number(d.deal_value || 0) - Number(d.payment_received_amount || 0)), 0);

    const ctx = `
BUSINESS SNAPSHOT (${today}):
New Leads: ${s(leads).length} | Insurance Renewals (90d): ${s(insurance).length} | Self-Drive Returns (3d): ${s(rentals).length}
HSRP Pending: ${s(hsrp).length} | Active Deals: ${s(deals).length} | Overdue Follow-ups: ${s(followUps).length}
Pending Tasks: ${s(pendingTasks).length} | Open Problems: ${s(problems).length} | Active Risks: ${s(risks).length}
Cross-sell Pending: ${s(crossSells).length} | Unresolved Mistakes: ${s(mistakes).length}

💰 FINANCIAL HEALTH (${cm}):
Revenue: ₹${totalRevenue.toLocaleString()} | Expenses: ₹${totalExpenses.toLocaleString()} | Net Profit: ₹${netProfit.toLocaleString()}
Cash in Bank: ₹${cashInBank.toLocaleString()} | Monthly Burn: ₹${monthlyBurn.toLocaleString()}
Runway: ${runwayMonths} months | Pending Payments: ₹${pendingPayments.toLocaleString()}

TEAM TARGETS (${cm}):
${s(targets).map((t: any) => `  ${t.team_member_name} [${t.vertical_name}]: ${t.achieved_count}/${t.target_count} (${t.achievement_pct}%) | ₹${t.achieved_revenue}/₹${t.target_revenue}`).join('\n') || 'No targets set'}

INSURANCE RENEWALS:
${s(insurance).slice(0,10).map((i: any) => `  ${i.customer_name} (${i.phone}) expires ${i.policy_expiry_date}, stage: ${i.pipeline_stage}`).join('\n') || 'None'}

OVERDUE FOLLOW-UPS:
${s(followUps).slice(0,10).map((f: any) => `  ${f.name} (${f.phone}) due ${f.follow_up_date}, category: ${f.service_category}`).join('\n') || 'None'}

SELF-DRIVE RETURNS:
${s(rentals).map((r: any) => `  ${r.customer_name} (${r.phone}) return: ${r.return_date}, payment: ${r.payment_status}`).join('\n') || 'None'}

ACTIVE DEALS:
${s(deals).slice(0,15).map((d: any) => `  Deal #${d.deal_number} ₹${d.deal_value} payment: ${d.payment_status} vertical: ${d.vertical_name}`).join('\n') || 'None'}

ACTIVE RISKS:
${s(risks).map((r: any) => `  [${r.severity}] ${r.title}: ${r.description}`).join('\n') || 'None'}

BANK ACCOUNTS:
${s(bankAccounts).map((b: any) => `  ${b.account_name} (${b.bank_name}): ₹${Number(b.current_balance || 0).toLocaleString()}`).join('\n') || 'None'}
`;

    const sysPrompt = `You are the AI Co-Founder & CEO-level Business Partner of GrabYourCar. You work 24/7 as the most involved, data-obsessed, revenue-focused co-founder any startup could have.

YOUR IDENTITY:
- You're a 24/7 AI Co-Founder who NEVER sleeps — always watching, analyzing, pushing
- Address people warmly by name: "Hey ${user_name || 'Boss'}! 🚀"
- Mix Hindi-English naturally like a Delhi startup founder
- ALWAYS specific — names, numbers, amounts, dates, phone numbers
- Every suggestion has WHY + IMPACT + REVENUE POTENTIAL
- You think 10X — not incremental improvements
- You're obsessed with cash flow, runway, and profitability

YOUR 12 ROLES (ALL ACTIVE 24/7):
1. 💰 REVENUE ENGINE — Find every ₹ hiding in the business. Cross-sell, upsell, follow-up
2. 📊 SALES DIRECTOR — Push each team member to hit daily/weekly/monthly targets
3. 🧠 STRATEGIC ADVISOR — Long-term growth planning, market analysis
4. 👥 TEAM MANAGER — Personal coach to every member, break targets into micro-goals
5. ⚠️ RISK RADAR — Detect problems before they happen (renewals, payments, returns)
6. 🏦 CFO BRAIN — Track cash flow, runway, burn rate, expenses, profitability
7. 🛒 E-COMMERCE AUTOPILOT — Manage inventory, suggest products, optimize pricing
8. 🤝 CROSS-SELL MACHINE — Every customer is multi-vertical opportunity
9. 🔍 MISTAKE DETECTIVE — Find errors, missed follow-ups, process failures
10. 📈 INVESTOR READINESS — Track metrics that matter, prepare for fundraising
11. 🎯 TARGET ENFORCER — Set, track, push, celebrate targets
12. 🔔 REMINDER ENGINE — Never let anyone forget anything important

RULES:
- Always calculate revenue impact in ₹
- Flag risks with severity (🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low)
- For low runway (<3 months): IMMEDIATELY flag as critical with action plan
- Cross-sell: EVERY customer should be evaluated for other verticals
- Mistakes: Be honest but constructive — fix-focused not blame-focused
- Investor prep: Track MRR, growth rate, unit economics, customer LTV

Current role: ${user_role || 'founder'} ${vertical ? `in ${vertical}` : '(all verticals)'}`;

    // Streaming AI helper
    async function streamAI(msgs: any[]) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: msgs, stream: true }),
      });
      if (!r.ok) {
        if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (r.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${r.status}`);
      }
      return new Response(r.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // Non-streaming AI with optional tools
    async function callAI(msgs: any[], tools?: any[], tc?: any) {
      const b: any = { model: "google/gemini-3-flash-preview", messages: msgs };
      if (tools) { b.tools = tools; b.tool_choice = tc; }
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(b),
      });
      if (!r.ok) throw new Error(`AI error: ${r.status}`);
      return r.json();
    }

    function parseTool(data: any) {
      try { return JSON.parse(data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "{}"); } catch { return {}; }
    }

    // ========== ACTIONS ==========

    if (action === "daily_briefing") {
      return streamAI([
        { role: "system", content: sysPrompt },
        { role: "user", content: `Generate COMPREHENSIVE daily briefing. Data:\n${ctx}\n\nInclude:\n1. 🌅 GOOD MORNING (motivational + key numbers + financial health)\n2. 🏦 FINANCIAL PULSE (revenue, expenses, runway, cash position)\n3. 🎯 TARGET STATUS (who's on track, who needs push)\n4. 🔥 URGENT NOW (immediate revenue actions)\n5. 📋 TOP 10 TASKS (with names, phones, amounts)\n6. 💰 REVENUE OPPORTUNITIES (cross-sell every customer)\n7. ⚠️ RISK RADAR (all detected risks with severity)\n8. 🔍 MISTAKES FOUND (process failures, missed opportunities)\n9. 👥 TEAM COACHING (specific per-member guidance)\n10. 📈 INVESTOR METRICS (MRR, growth, unit economics)\n11. 🎯 SUCCESS = (what must be achieved today)` }
      ]);

    } else if (action === "suggest_tasks") {
      const data = await callAI(
        [{ role: "system", content: sysPrompt }, { role: "user", content: `Data:\n${ctx}\n\nGenerate 15-20 specific tasks covering ALL verticals. Include target-push tasks, cross-sell tasks, risk-mitigation tasks, follow-up tasks, and mistake-fixing tasks.` }],
        [{ type: "function", function: { name: "generate_tasks", description: "Generate tasks", parameters: { type: "object", properties: { tasks: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, priority: { type: "string", enum: ["urgent","high","medium","low"] }, task_type: { type: "string", enum: ["follow_up","renewal","order_processing","payment_collection","car_return","cross_sell","new_lead","approval","target_push","coaching","problem_solving","risk_mitigation","mistake_fix","investor_prep","ecommerce"] }, vertical: { type: "string" }, team_member_name: { type: "string" }, ai_suggestion: { type: "string" } }, required: ["title","description","priority","task_type","vertical"], additionalProperties: false } } }, required: ["tasks"], additionalProperties: false } } }],
        { type: "function", function: { name: "generate_tasks" } }
      );
      const tasks = parseTool(data).tasks || [];
      if (tasks.length > 0) {
        await fetch(`${SB}/rest/v1/ai_cofounder_tasks`, { method: "POST", headers: { ...h, Prefer: "return=minimal" },
          body: JSON.stringify(tasks.map((t: any) => ({ title: t.title, description: t.description, priority: t.priority, task_type: t.task_type, vertical: t.vertical, team_member_name: t.team_member_name || null, ai_suggestion: t.ai_suggestion || null, due_date: today, status: "pending" }))) });
      }
      return new Response(JSON.stringify({ tasks }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "quick_insight") {
      return streamAI([{ role: "system", content: sysPrompt }, { role: "user", content: `Data:\n${ctx}\n\nQuestion: ${question || "What should I focus on right now?"}` }]);

    } else if (action === "scan_risks") {
      const data = await callAI(
        [{ role: "system", content: sysPrompt + "\n\nYou are the RISK RADAR. Scan ALL business data for risks, problems, and threats. Be thorough — financial risks, operational risks, customer churn risks, compliance risks, team risks." },
         { role: "user", content: `Scan for ALL risks:\n${ctx}` }],
        [{ type: "function", function: { name: "detect_risks", description: "Detect business risks", parameters: { type: "object", properties: { risks: { type: "array", items: { type: "object", properties: { risk_type: { type: "string", enum: ["financial","operational","customer_churn","compliance","team","revenue_loss","cash_flow","inventory"] }, severity: { type: "string", enum: ["critical","high","medium","low"] }, vertical_name: { type: "string" }, title: { type: "string" }, description: { type: "string" }, impact_amount: { type: "number" }, recommended_action: { type: "string" } }, required: ["risk_type","severity","title","description","recommended_action"], additionalProperties: false } } }, required: ["risks"], additionalProperties: false } } }],
        { type: "function", function: { name: "detect_risks" } }
      );
      const detectedRisks = parseTool(data).risks || [];
      if (detectedRisks.length > 0) {
        await fetch(`${SB}/rest/v1/ai_risk_indicators`, { method: "POST", headers: { ...h, Prefer: "return=minimal" },
          body: JSON.stringify(detectedRisks.map((r: any) => ({ ...r, impact_amount: r.impact_amount || 0, founder_notified: r.severity === "critical" }))) });
      }
      return new Response(JSON.stringify({ risks: detectedRisks }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "find_cross_sells") {
      const data = await callAI(
        [{ role: "system", content: sysPrompt + "\n\nYou are the CROSS-SELL MACHINE. Analyze EVERY customer across ALL verticals. Find opportunities where a customer in one vertical can be sold services from another vertical. Be specific with names, phones, amounts." },
         { role: "user", content: `Find cross-sell opportunities:\n${ctx}` }],
        [{ type: "function", function: { name: "find_cross_sells", description: "Find cross-sell opportunities", parameters: { type: "object", properties: { suggestions: { type: "array", items: { type: "object", properties: { customer_name: { type: "string" }, customer_phone: { type: "string" }, source_vertical: { type: "string" }, target_vertical: { type: "string" }, suggestion: { type: "string" }, potential_revenue: { type: "number" } }, required: ["customer_name","source_vertical","target_vertical","suggestion"], additionalProperties: false } } }, required: ["suggestions"], additionalProperties: false } } }],
        { type: "function", function: { name: "find_cross_sells" } }
      );
      const suggestions = parseTool(data).suggestions || [];
      if (suggestions.length > 0) {
        await fetch(`${SB}/rest/v1/ai_cross_sell_suggestions`, { method: "POST", headers: { ...h, Prefer: "return=minimal" },
          body: JSON.stringify(suggestions.map((s: any) => ({ ...s, potential_revenue: s.potential_revenue || 0, status: "pending" }))) });
      }
      return new Response(JSON.stringify({ suggestions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "detect_mistakes") {
      const data = await callAI(
        [{ role: "system", content: sysPrompt + "\n\nYou are the MISTAKE DETECTIVE. Find ALL operational mistakes, missed opportunities, process failures, and inefficiencies. Be constructive — focus on the fix." },
         { role: "user", content: `Detect mistakes and inefficiencies:\n${ctx}` }],
        [{ type: "function", function: { name: "detect_mistakes", description: "Detect mistakes", parameters: { type: "object", properties: { mistakes: { type: "array", items: { type: "object", properties: { mistake_type: { type: "string", enum: ["missed_followup","delayed_payment","process_failure","missed_renewal","inventory_issue","pricing_error","team_gap","communication_failure"] }, vertical_name: { type: "string" }, team_member_name: { type: "string" }, description: { type: "string" }, impact: { type: "string" }, ai_fix_suggestion: { type: "string" } }, required: ["mistake_type","description","ai_fix_suggestion"], additionalProperties: false } } }, required: ["mistakes"], additionalProperties: false } } }],
        { type: "function", function: { name: "detect_mistakes" } }
      );
      const detected = parseTool(data).mistakes || [];
      if (detected.length > 0) {
        await fetch(`${SB}/rest/v1/ai_mistake_logs`, { method: "POST", headers: { ...h, Prefer: "return=minimal" },
          body: JSON.stringify(detected.map((m: any) => ({ ...m, status: "detected" }))) });
      }
      return new Response(JSON.stringify({ mistakes: detected }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "calculate_runway") {
      // Save snapshot
      await fetch(`${SB}/rest/v1/ai_runway_snapshots`, { method: "POST", headers: { ...h, Prefer: "return=minimal" },
        body: JSON.stringify({ snapshot_date: today, total_revenue: totalRevenue, total_expenses: totalExpenses, net_profit: netProfit, cash_in_bank: cashInBank, monthly_burn_rate: monthlyBurn, runway_months: runwayMonths }) });

      return streamAI([
        { role: "system", content: sysPrompt + "\n\nYou are the CFO BRAIN. Analyze financial health deeply. Calculate runway, profitability, and give specific recommendations." },
        { role: "user", content: `Analyze financial health:\n${ctx}\n\nCalculated metrics:\n- Monthly Revenue: ₹${totalRevenue.toLocaleString()}\n- Monthly Expenses: ₹${totalExpenses.toLocaleString()}\n- Net Profit: ₹${netProfit.toLocaleString()}\n- Cash in Bank: ₹${cashInBank.toLocaleString()}\n- Burn Rate: ₹${monthlyBurn.toLocaleString()}/month\n- Runway: ${runwayMonths} months\n- Pending Payments: ₹${pendingPayments.toLocaleString()}\n\nGive:\n1. 🏦 FINANCIAL HEALTH SCORE (1-10)\n2. 💰 CASH FLOW ANALYSIS\n3. ⚠️ RUNWAY ALERT (if <6 months, urgent plan)\n4. 📉 EXPENSE OPTIMIZATION (cut what)\n5. 📈 REVENUE ACCELERATION (grow what)\n6. 🤝 INVESTOR READINESS SCORE\n7. 📋 ACTION PLAN (next 30 days)` }
      ]);

    } else if (action === "investor_prep") {
      return streamAI([
        { role: "system", content: sysPrompt + "\n\nYou are the INVESTOR READINESS advisor. Prepare pitch metrics, identify gaps, and suggest investor outreach strategy." },
        { role: "user", content: `Prepare investor readiness report:\n${ctx}\n\nFinancials: Revenue ₹${totalRevenue.toLocaleString()}, Expenses ₹${totalExpenses.toLocaleString()}, Runway ${runwayMonths}mo\n\nGive:\n1. 📊 KEY METRICS FOR INVESTORS (MRR, growth, customers, verticals)\n2. 💪 STRENGTHS to highlight\n3. ⚠️ GAPS to fix before pitching\n4. 🎯 IDEAL INVESTOR PROFILE\n5. 📧 EMAIL TEMPLATE for investor outreach\n6. 📋 PITCH DECK OUTLINE\n7. 🗓️ 30-DAY INVESTOR READINESS PLAN` }
      ]);

    } else if (action === "ecommerce_autopilot") {
      return streamAI([
        { role: "system", content: sysPrompt + "\n\nYou are the E-COMMERCE AUTOPILOT. Manage inventory, suggest new products, optimize pricing, and push shipping/fulfillment." },
        { role: "user", content: `E-commerce autopilot analysis:\n${ctx}\n\nGive:\n1. 📦 INVENTORY STATUS (what to restock, what's slow-moving)\n2. 🏷️ PRICING OPTIMIZATION (margin analysis)\n3. 🆕 NEW PRODUCT SUGGESTIONS (based on customer data)\n4. 📊 SALES ANALYTICS (best sellers, trends)\n5. 🚚 SHIPPING & FULFILLMENT (pending, delays)\n6. 💡 REVENUE BOOSTERS (bundles, offers, seasonal)\n7. 🤖 AUTO-ACTIONS RECOMMENDED` }
      ]);

    } else if (action === "solve_problem") {
      const pd = problem_data || {};
      const data = await callAI(
        [{ role: "system", content: sysPrompt + "\n\nSolve the team's problem with data-driven solutions. Only escalate if it needs budget/policy/hiring decisions." },
         { role: "user", content: `Problem from ${pd.reported_by || 'team'} [${pd.vertical || 'general'}]: ${pd.description || ''}\n\nData:\n${ctx}` }],
        [{ type: "function", function: { name: "solve_problem", description: "Solve problem", parameters: { type: "object", properties: { solution: { type: "string" }, can_solve_automatically: { type: "boolean" }, escalation_reason: { type: "string" }, action_items: { type: "array", items: { type: "string" } } }, required: ["solution","can_solve_automatically"], additionalProperties: false } } }],
        { type: "function", function: { name: "solve_problem" } }
      );
      const sol = parseTool(data);
      if (pd.id) {
        await fetch(`${SB}/rest/v1/team_problems?id=eq.${pd.id}`, { method: "PATCH", headers: { ...h, Prefer: "return=minimal" },
          body: JSON.stringify({ ai_solution: sol.solution, ai_solved: sol.can_solve_automatically, escalated_to_founder: !sol.can_solve_automatically, status: sol.can_solve_automatically ? "ai_resolved" : "escalated" }) });
      }
      return new Response(JSON.stringify(sol), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "generate_report") {
      return streamAI([
        { role: "system", content: sysPrompt + "\n\nGenerate detailed performance report with target achievement, revenue analysis, team performance, and recommendations." },
        { role: "user", content: `Generate ${body.report_type || 'weekly'} report for ${body.period || cm}:\n${ctx}\n\nInclude:\n1. 📊 EXECUTIVE SUMMARY\n2. 🎯 TARGET vs ACHIEVEMENT\n3. 💰 REVENUE & P&L BREAKDOWN\n4. 🏆 TOP PERFORMERS & INCENTIVE\n5. ⚠️ UNDERPERFORMERS & COACHING\n6. 📈 TRENDS & PREDICTIONS\n7. 🎯 NEXT PERIOD TARGETS` }
      ]);

    } else if (action === "team_coaching") {
      return streamAI([
        { role: "system", content: sysPrompt + `\n\nPersonal coach for ${body.member_name || 'team member'}. Warm, specific, action-oriented.` },
        { role: "user", content: `Coach ${body.member_name || ''} (${body.member_vertical || ''}):\n${ctx}\n\nGive personal daily plan with exact tasks, calls, targets.` }
      ]);

    } else if (action === "set_targets") {
      if (target_data && Array.isArray(target_data)) {
        for (const t of target_data) {
          await fetch(`${SB}/rest/v1/team_targets`, { method: "POST", headers: { ...h, Prefer: "return=representation,resolution=merge-duplicates" },
            body: JSON.stringify({ user_id: t.user_id, team_member_name: t.team_member_name, vertical_name: t.vertical_name, month_year: t.month_year || cm, target_count: t.target_count || 0, target_revenue: t.target_revenue || 0, set_by: "super_admin" }) });
          await fetch(`${SB}/rest/v1/ai_daily_pushes`, { method: "POST", headers: { ...h, Prefer: "return=minimal" },
            body: JSON.stringify({ user_id: t.user_id, team_member_name: t.team_member_name, push_type: "target_assigned", message: `🎯 Target set! ${t.target_count} deals / ₹${t.target_revenue} for ${t.vertical_name}. Let's crush it!`, vertical_name: t.vertical_name }) });
        }
        return new Response(JSON.stringify({ success: true, targets_set: target_data.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "No target_data" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "generate_pushes") {
      const data = await callAI(
        [{ role: "system", content: sysPrompt + "\n\nGenerate personalized daily pushes for EVERY team member." },
         { role: "user", content: `Generate pushes:\n${ctx}` }],
        [{ type: "function", function: { name: "gen_pushes", description: "Generate pushes", parameters: { type: "object", properties: { pushes: { type: "array", items: { type: "object", properties: { team_member_name: { type: "string" }, push_type: { type: "string", enum: ["daily_reminder","target_push","follow_up","renewal_alert","car_return","payment_due","coaching_tip","incentive_update","risk_alert","mistake_alert"] }, message: { type: "string" }, vertical_name: { type: "string" } }, required: ["team_member_name","push_type","message"], additionalProperties: false } } }, required: ["pushes"], additionalProperties: false } } }],
        { type: "function", function: { name: "gen_pushes" } }
      );
      const pushes = parseTool(data).pushes || [];
      if (pushes.length > 0) {
        await fetch(`${SB}/rest/v1/ai_daily_pushes`, { method: "POST", headers: { ...h, Prefer: "return=minimal" },
          body: JSON.stringify(pushes.map((p: any) => ({ team_member_name: p.team_member_name, push_type: p.push_type, message: p.message, vertical_name: p.vertical_name || null }))) });
      }
      return new Response(JSON.stringify({ success: true, pushes_generated: pushes.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("ai-cofounder error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
