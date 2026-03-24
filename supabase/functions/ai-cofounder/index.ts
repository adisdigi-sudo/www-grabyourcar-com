import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function safeFetch(url: string, h: Record<string, string>): Promise<any[]> {
  try {
    const r = await fetch(url, { headers: h });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SB = Deno.env.get("SUPABASE_URL")!;
    const SK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const body = await req.json();
    const { action, user_name, user_role, vertical, question, target_data, problem_data } = body;

    const isSuperAdmin = !user_role || user_role === "super_admin" || user_role === "admin";
    const userVertical = vertical || null;

    const h = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
    const today = new Date().toISOString().split("T")[0];
    const cm = today.slice(0, 7);

    // Parallel fetch all business data with safe error handling
    const [leads, insurance, rentals, hsrp, deals, followUps, pendingTasks, targets, problems, teamMembers, expenses, bankAccounts, invoices, risks, crossSells, mistakes] = await Promise.all([
      safeFetch(`${SB}/rest/v1/leads?created_at=gte.${today}T00:00:00&select=id,name,phone,source,service_category,status,priority,assigned_to,city&limit=50`, h),
      safeFetch(`${SB}/rest/v1/insurance_clients?select=id,customer_name,phone,vehicle_number,vehicle_make,vehicle_model,policy_expiry_date,lead_status,pipeline_stage,follow_up_date,assigned_executive,current_insurer,current_premium&policy_expiry_date=lte.${new Date(Date.now()+90*86400000).toISOString().split("T")[0]}&policy_expiry_date=gte.${today}&order=policy_expiry_date.asc&limit=50`, h),
      safeFetch(`${SB}/rest/v1/rental_bookings?select=id,customer_name,phone,pickup_date,return_date,status,payment_status,total_amount,car_name&return_date=gte.${today}&return_date=lte.${new Date(Date.now()+3*86400000).toISOString().split("T")[0]}&limit=30`, h),
      safeFetch(`${SB}/rest/v1/hsrp_bookings?select=id,owner_name,registration_number,order_status,payment_status,mobile,service_type&order_status=neq.completed&limit=30`, h),
      safeFetch(`${SB}/rest/v1/deals?select=id,deal_number,customer_id,deal_value,payment_status,deal_status,vertical_name,payment_received_amount&deal_status=eq.active&limit=50`, h),
      safeFetch(`${SB}/rest/v1/leads?select=id,name,phone,follow_up_date,status,assigned_to,service_category&follow_up_date=lte.${today}&status=neq.closed&limit=50`, h),
      safeFetch(`${SB}/rest/v1/ai_cofounder_tasks?select=id,title,status,priority&due_date=eq.${today}&status=eq.pending&limit=20`, h),
      safeFetch(`${SB}/rest/v1/team_targets?select=*&month_year=eq.${cm}&limit=100`, h),
      safeFetch(`${SB}/rest/v1/team_problems?select=*&status=eq.open&limit=20`, h),
      safeFetch(`${SB}/rest/v1/team_members?select=*&is_active=eq.true&limit=50`, h),
      safeFetch(`${SB}/rest/v1/expenses?select=id,category,amount,expense_date,vertical_name&month_year=eq.${cm}&limit=200`, h),
      safeFetch(`${SB}/rest/v1/bank_accounts?select=id,account_name,current_balance,bank_name&is_active=eq.true&limit=10`, h),
      safeFetch(`${SB}/rest/v1/invoices?select=id,total_amount,status,vertical_name,invoice_date&invoice_date=gte.${cm}-01&limit=200`, h),
      safeFetch(`${SB}/rest/v1/ai_risk_indicators?select=*&auto_resolved=eq.false&limit=20`, h),
      safeFetch(`${SB}/rest/v1/ai_cross_sell_suggestions?select=*&status=eq.pending&limit=20`, h),
      safeFetch(`${SB}/rest/v1/ai_mistake_logs?select=*&status=eq.detected&limit=20`, h),
    ]);

    // Financial calculations
    const totalRevenue = invoices.filter((i: any) => i.status === "paid").reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0);
    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
    const cashInBank = bankAccounts.reduce((sum: number, b: any) => sum + Number(b.current_balance || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const monthlyBurn = totalExpenses;
    const runwayMonths = monthlyBurn > 0 ? Math.round((cashInBank / monthlyBurn) * 10) / 10 : 99;
    const pendingPayments = deals.filter((d: any) => d.payment_status !== "received").reduce((sum: number, d: any) => sum + (Number(d.deal_value || 0) - Number(d.payment_received_amount || 0)), 0);

    // Build DETAILED context with actual record data
    const ctx = `
===== LIVE BUSINESS DATA (${today}) =====
COUNTS: New Leads Today: ${leads.length} | Insurance Renewals (next 90 days): ${insurance.length} | Self-Drive Returns (3d): ${rentals.length}
HSRP Pending: ${hsrp.length} | Active Deals: ${deals.length} | Overdue Follow-ups: ${followUps.length}
Pending Tasks: ${pendingTasks.length} | Open Problems: ${problems.length} | Active Risks: ${risks.length}

💰 FINANCIAL HEALTH (${cm}):
Revenue: ₹${totalRevenue.toLocaleString("en-IN")} | Expenses: ₹${totalExpenses.toLocaleString("en-IN")} | Net Profit: ₹${netProfit.toLocaleString("en-IN")}
Cash in Bank: ₹${cashInBank.toLocaleString("en-IN")} | Monthly Burn: ₹${monthlyBurn.toLocaleString("en-IN")}
Runway: ${runwayMonths} months | Pending Payments: ₹${pendingPayments.toLocaleString("en-IN")}

===== INSURANCE RENEWALS (NEXT 90 DAYS) — ${insurance.length} RECORDS =====
${insurance.length > 0 ? insurance.map((i: any) => `• ${i.customer_name || 'N/A'} | Ph: ${i.phone || 'N/A'} | Vehicle: ${i.vehicle_number || 'N/A'} (${i.vehicle_make || ''} ${i.vehicle_model || ''}) | Expiry: ${i.policy_expiry_date || 'N/A'} | Insurer: ${i.current_insurer || 'N/A'} | Premium: ₹${i.current_premium || 'N/A'} | Stage: ${i.pipeline_stage || 'N/A'} | Exec: ${i.assigned_executive || 'Unassigned'}`).join('\n') : '⚠️ NO INSURANCE RENEWALS FOUND IN DATABASE FOR NEXT 90 DAYS'}

===== TODAY'S NEW LEADS — ${leads.length} RECORDS =====
${leads.length > 0 ? leads.map((l: any) => `• ${l.name || 'N/A'} | Ph: ${l.phone || 'N/A'} | Source: ${l.source || 'N/A'} | Category: ${l.service_category || 'N/A'} | Status: ${l.status || 'N/A'} | Priority: ${l.priority || 'N/A'} | City: ${l.city || 'N/A'}`).join('\n') : '⚠️ NO NEW LEADS TODAY'}

===== OVERDUE FOLLOW-UPS — ${followUps.length} RECORDS =====
${followUps.length > 0 ? followUps.map((f: any) => `• ${f.name || 'N/A'} | Ph: ${f.phone || 'N/A'} | Due: ${f.follow_up_date || 'N/A'} | Status: ${f.status || 'N/A'} | Category: ${f.service_category || 'N/A'} | Assigned: ${f.assigned_to || 'Unassigned'}`).join('\n') : '⚠️ NO OVERDUE FOLLOW-UPS'}

===== SELF-DRIVE RETURNS (NEXT 3 DAYS) — ${rentals.length} RECORDS =====
${rentals.length > 0 ? rentals.map((r: any) => `• ${r.customer_name || 'N/A'} | Ph: ${r.phone || 'N/A'} | Car: ${r.car_name || 'N/A'} | Return: ${r.return_date || 'N/A'} | Amount: ₹${r.total_amount || 'N/A'} | Payment: ${r.payment_status || 'N/A'}`).join('\n') : '⚠️ NO SELF-DRIVE RETURNS DUE'}

===== HSRP PENDING ORDERS — ${hsrp.length} RECORDS =====
${hsrp.length > 0 ? hsrp.map((h: any) => `• ${h.owner_name || 'N/A'} | Ph: ${h.mobile || 'N/A'} | Reg: ${h.registration_number || 'N/A'} | Type: ${h.service_type || 'N/A'} | Status: ${h.order_status || 'N/A'} | Payment: ${h.payment_status || 'N/A'}`).join('\n') : '⚠️ NO PENDING HSRP ORDERS'}

===== ACTIVE DEALS — ${deals.length} RECORDS =====
${deals.length > 0 ? deals.map((d: any) => `• Deal #${d.deal_number || 'N/A'} | Value: ₹${Number(d.deal_value || 0).toLocaleString("en-IN")} | Received: ₹${Number(d.payment_received_amount || 0).toLocaleString("en-IN")} | Payment: ${d.payment_status || 'N/A'} | Vertical: ${d.vertical_name || 'N/A'}`).join('\n') : '⚠️ NO ACTIVE DEALS'}

===== TEAM TARGETS (${cm}) — ${targets.length} RECORDS =====
${targets.length > 0 ? targets.map((t: any) => `• ${t.team_member_name || 'N/A'} [${t.vertical_name || 'N/A'}]: ${t.achieved_count || 0}/${t.target_count || 0} deals (${t.achievement_pct || 0}%) | ₹${Number(t.achieved_revenue || 0).toLocaleString("en-IN")}/₹${Number(t.target_revenue || 0).toLocaleString("en-IN")}`).join('\n') : '⚠️ NO TARGETS SET THIS MONTH'}

===== BANK ACCOUNTS =====
${bankAccounts.length > 0 ? bankAccounts.map((b: any) => `• ${b.account_name || 'N/A'} (${b.bank_name || 'N/A'}): ₹${Number(b.current_balance || 0).toLocaleString("en-IN")}`).join('\n') : '⚠️ NO BANK ACCOUNTS CONFIGURED'}

===== ACTIVE RISKS — ${risks.length} =====
${risks.length > 0 ? risks.map((r: any) => `• [${r.severity || 'N/A'}] ${r.title || 'N/A'}: ${r.description || 'N/A'}`).join('\n') : 'No active risks'}

===== CROSS-SELL PENDING — ${crossSells.length} =====
${crossSells.length > 0 ? crossSells.map((c: any) => `• ${c.customer_name || 'N/A'} | From: ${c.source_vertical || 'N/A'} → To: ${c.target_vertical || 'N/A'} | Suggestion: ${c.suggestion || 'N/A'}`).join('\n') : 'No pending cross-sells'}
===== END OF DATA =====`;

    // ===== ROLE-BASED SYSTEM PROMPT =====
    const DATA_ACCURACY_RULES = `
🚨 CRITICAL DATA ACCURACY RULES — VIOLATION = FAILURE:
1. ONLY use data shown above between "===== LIVE BUSINESS DATA" and "===== END OF DATA =====".
2. If a section says "⚠️ NO ... FOUND" or shows 0 records, say EXACTLY THAT — "No records found in the database."
3. NEVER invent names, phone numbers, vehicle numbers, amounts, or dates.
4. NEVER assume or estimate data that isn't provided.
5. If asked about data not in the snapshot, say: "I don't have that data in my current snapshot. Please check the relevant CRM section."
6. Always quote EXACT names, phones, amounts from the data above.
7. If count is 0, say "0 records" — don't create fictional records.
8. When presenting tables, ONLY include rows from actual data above.`;

    let sysPrompt: string;

    if (isSuperAdmin) {
      sysPrompt = `You are GrabYourCar's AI Co-Founder & CEO-level Business Partner. You work 24/7 as the most involved, data-obsessed, revenue-focused co-founder.

YOUR IDENTITY:
- Address warmly: "Hey ${user_name || 'Boss'}! 🚀"
- Mix Hindi-English naturally like a Delhi startup founder
- ALWAYS cite exact data — names, numbers, amounts from the database
- Every suggestion has WHY + IMPACT + REVENUE POTENTIAL

YOUR 12 ROLES (ALL ACTIVE 24/7):
1. 💰 REVENUE ENGINE — Find every ₹ hiding in the business
2. 📊 SALES DIRECTOR — Push each team member to hit targets
3. 🧠 STRATEGIC ADVISOR — Long-term growth planning
4. 👥 TEAM MANAGER — Personal coach to every member
5. ⚠️ RISK RADAR — Detect problems before they happen
6. 🏦 CFO BRAIN — Track cash flow, runway, profitability
7. 🛒 E-COMMERCE AUTOPILOT — Manage inventory, pricing
8. 🤝 CROSS-SELL MACHINE — Every customer = multi-vertical opportunity
9. 🔍 MISTAKE DETECTIVE — Find errors, missed follow-ups
10. 📈 INVESTOR READINESS — Track metrics for fundraising
11. 🎯 TARGET ENFORCER — Set, track, push, celebrate targets
12. 🔔 REMINDER ENGINE — Never let anyone forget anything

REPORT GENERATION:
- When asked for reports, generate detailed markdown reports with tables, charts descriptions, and actionable insights
- Include period comparison, trend analysis, and specific recommendations
- Format reports professionally with headers, tables, and summary sections

${DATA_ACCURACY_RULES}

Current role: SUPER ADMIN / FOUNDER (all verticals)`;
    } else {
      const verticalLabel = userVertical || "general";
      sysPrompt = `You are the AI Manager & Personal Coach for ${user_name || 'team member'} at GrabYourCar, working in the ${verticalLabel} vertical.

YOUR IDENTITY:
- Friendly, motivating AI manager: "Hey ${user_name || 'champ'}! 💪"
- Mix Hindi-English naturally
- Be SPECIFIC with exact data from database only
- Push them to become Employee of the Day/Week/Month

YOUR ROLE:
1. 🎯 TARGET TRACKER — Show personal targets & progress
2. 📋 DAILY TASK MANAGER — What to do next, who to call
3. 💪 MOTIVATOR — Push with incentive reminders
4. 📞 FOLLOW-UP COACH — Remind about pending calls, renewals
5. 🏆 PERFORMANCE COACH — Tips to close more deals
6. 🔔 REMINDER ENGINE — Never miss a follow-up or deadline

STRICT RESTRICTIONS — MUST FOLLOW:
🚫 NEVER share company profits, revenue, expenses, margins, or financial data
🚫 NEVER share other team members' performance, salary, targets, or reports
🚫 NEVER discuss investor data, runway, burn rate, or company finances
🚫 NEVER answer questions about other verticals or departments
🚫 NEVER reveal admin-level business intelligence or strategies
🚫 If asked about restricted topics, say: "That info is restricted to management. Focus on your targets — let me help you crush them! 🎯"

ONLY ANSWER about:
✅ Their own ${verticalLabel} tasks, leads, follow-ups
✅ Their own targets and achievement progress
✅ How to close more deals in ${verticalLabel}
✅ Renewal reminders, pending orders in ${verticalLabel}
✅ Incentive calculations for THEIR performance
✅ Tips and coaching for THEIR role

REPORT GENERATION:
- Generate personal performance reports for their vertical only
- Show their targets, achievements, and improvement areas
- Never include other team members' data

${DATA_ACCURACY_RULES}

Current role: ${user_role || 'employee'} in ${verticalLabel}`;
    }

    // For non-admin users, filter the context
    let filteredCtx = ctx;
    if (!isSuperAdmin && userVertical) {
      filteredCtx = `
===== YOUR VERTICAL DATA (${today}) — ${userVertical} =====
${userVertical.toLowerCase().includes('insurance') ? `INSURANCE RENEWALS:\n${insurance.length > 0 ? insurance.map((i: any) => `• ${i.customer_name || 'N/A'} | Ph: ${i.phone || 'N/A'} | Vehicle: ${i.vehicle_number || 'N/A'} | Expiry: ${i.policy_expiry_date || 'N/A'} | Stage: ${i.pipeline_stage || 'N/A'}`).join('\n') : '⚠️ NO INSURANCE RENEWALS FOUND'}` : ''}
${userVertical.toLowerCase().includes('sales') || userVertical.toLowerCase().includes('auto') ? `TODAY'S LEADS:\n${leads.filter((l: any) => !l.service_category || l.service_category?.toLowerCase().includes('car') || l.service_category?.toLowerCase().includes('sale')).map((l: any) => `• ${l.name || 'N/A'} | Ph: ${l.phone || 'N/A'} | Source: ${l.source || 'N/A'} | Status: ${l.status || 'N/A'} | Priority: ${l.priority || 'N/A'}`).join('\n') || '⚠️ NO SALES LEADS TODAY'}` : ''}
${userVertical.toLowerCase().includes('rental') || userVertical.toLowerCase().includes('self') ? `SELF-DRIVE RETURNS:\n${rentals.length > 0 ? rentals.map((r: any) => `• ${r.customer_name || 'N/A'} | Ph: ${r.phone || 'N/A'} | Car: ${r.car_name || 'N/A'} | Return: ${r.return_date || 'N/A'} | Payment: ${r.payment_status || 'N/A'}`).join('\n') : '⚠️ NO RETURNS DUE'}` : ''}
${userVertical.toLowerCase().includes('hsrp') ? `HSRP PENDING:\n${hsrp.length > 0 ? hsrp.map((h: any) => `• ${h.owner_name || 'N/A'} | Ph: ${h.mobile || 'N/A'} | Reg: ${h.registration_number || 'N/A'} | Status: ${h.order_status || 'N/A'}`).join('\n') : '⚠️ NO PENDING HSRP ORDERS'}` : ''}

YOUR FOLLOW-UPS:
${followUps.length > 0 ? followUps.map((f: any) => `• ${f.name || 'N/A'} | Ph: ${f.phone || 'N/A'} | Due: ${f.follow_up_date || 'N/A'} | Category: ${f.service_category || 'N/A'}`).join('\n') : '⚠️ NO PENDING FOLLOW-UPS'}

YOUR TARGETS:
${targets.filter((t: any) => t.vertical_name?.toLowerCase().includes(userVertical.toLowerCase())).map((t: any) => `• ${t.team_member_name}: ${t.achieved_count || 0}/${t.target_count || 0} deals | ₹${Number(t.achieved_revenue || 0).toLocaleString("en-IN")}/₹${Number(t.target_revenue || 0).toLocaleString("en-IN")}`).join('\n') || '⚠️ NO TARGETS SET'}
===== END OF DATA =====`;
    }

    // Streaming AI helper
    async function streamAI(msgs: any[]) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: msgs, stream: true, max_tokens: 4000 }),
      });
      if (!r.ok) {
        if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (r.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${r.status}`);
      }
      return new Response(r.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    async function callAI(msgs: any[], tools?: any[], tc?: any) {
      const b: any = { model: "google/gemini-3-flash-preview", messages: msgs, max_tokens: 4000 };
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

    const dataCtx = isSuperAdmin ? ctx : filteredCtx;

    // ========== ACTIONS ==========

    if (action === "daily_briefing") {
      const briefingPrompt = isSuperAdmin
        ? `Generate COMPREHENSIVE daily briefing using ONLY the data provided below. Data:\n${dataCtx}\n\nInclude:\n1. 🌅 GOOD MORNING (key numbers from data)\n2. 🏦 FINANCIAL PULSE (exact numbers from data)\n3. 🎯 TARGET STATUS (from team targets data)\n4. 🔥 URGENT NOW (from overdue follow-ups data)\n5. 📋 TOP 10 TASKS (with exact names, phones from data)\n6. 💰 REVENUE OPPORTUNITIES (from active deals data)\n7. ⚠️ RISK RADAR (from risks data)\n8. 🔍 MISTAKES FOUND (from mistakes data)\n9. 👥 TEAM STATUS (from targets data)\n10. 🎯 SUCCESS = (what must be achieved today)\n\nIMPORTANT: If any section has 0 records, say "No data available" — do NOT make up records.`
        : `Generate daily briefing for ${user_name || 'team member'} in ${userVertical} vertical ONLY. Data:\n${dataCtx}\n\nInclude:\n1. 🌅 GOOD MORNING ${user_name || ''}!\n2. 🎯 YOUR TARGETS TODAY\n3. 📋 YOUR TOP TASKS (exact names, phones from data)\n4. 💪 INCENTIVE UPDATE\n5. 🏆 TIPS TO WIN\n6. 🔔 REMINDERS\n7. 🎯 SUCCESS = what YOU must achieve today\n\nIMPORTANT: Only use data from above. If 0 records, say so.`;
      return streamAI([
        { role: "system", content: sysPrompt },
        { role: "user", content: briefingPrompt }
      ]);

    } else if (action === "suggest_tasks") {
      const data = await callAI(
        [{ role: "system", content: sysPrompt }, { role: "user", content: `Data:\n${ctx}\n\nGenerate 15-20 specific tasks from ACTUAL data. Each task must reference a real record from the data above. Do NOT create tasks about fictional leads/customers.` }],
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
      return streamAI([{ role: "system", content: sysPrompt }, { role: "user", content: `Here is the ACTUAL live database data. Use ONLY this data to answer:\n${dataCtx}\n\nQuestion: ${question || "What should I focus on right now?"}` }]);

    } else if (action === "generate_report") {
      const reportPrompt = isSuperAdmin
        ? `Generate a detailed ${body.report_type || 'performance'} report using ONLY the data below:\n${dataCtx}\n\nReport requirements:\n1. 📊 EXECUTIVE SUMMARY with exact numbers\n2. 🎯 TARGET vs ACHIEVEMENT table (from team targets data)\n3. 💰 REVENUE BREAKDOWN by vertical (from deals/invoices data)\n4. 📈 LEAD FUNNEL (from leads data)\n5. 🛡️ INSURANCE PIPELINE (from insurance data — exact records)\n6. 🚗 SELF-DRIVE STATUS (from rentals data)\n7. 🏷️ HSRP ORDERS (from hsrp data)\n8. 🏆 TOP PERFORMERS\n9. ⚠️ RISKS & ACTION ITEMS\n10. 📋 RECOMMENDATIONS\n\nFormat as a professional markdown report with tables. ONLY use real data — if a section has 0 records, state that clearly.`
        : `Generate a personal ${body.report_type || 'performance'} report for ${user_name} in ${userVertical} using ONLY this data:\n${dataCtx}\n\nInclude: targets, achievements, pending tasks, improvement areas. ONLY use real data.`;
      return streamAI([
        { role: "system", content: sysPrompt },
        { role: "user", content: reportPrompt }
      ]);

    } else if (action === "scan_risks") {
      const data = await callAI(
        [{ role: "system", content: sysPrompt + "\n\nScan ALL business data for REAL risks based on actual records. Do NOT invent risks — only flag issues visible in the data." },
         { role: "user", content: `Scan for risks in this ACTUAL data:\n${ctx}` }],
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
        [{ role: "system", content: sysPrompt + "\n\nFind cross-sell opportunities from ACTUAL customer data only. Use real names and phones from the data." },
         { role: "user", content: `Find cross-sell opportunities from REAL data:\n${ctx}` }],
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
        [{ role: "system", content: sysPrompt + "\n\nFind mistakes and inefficiencies from ACTUAL data only." },
         { role: "user", content: `Detect mistakes in REAL data:\n${ctx}` }],
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
      await fetch(`${SB}/rest/v1/ai_runway_snapshots`, { method: "POST", headers: { ...h, Prefer: "return=minimal" },
        body: JSON.stringify({ snapshot_date: today, total_revenue: totalRevenue, total_expenses: totalExpenses, net_profit: netProfit, cash_in_bank: cashInBank, monthly_burn_rate: monthlyBurn, runway_months: runwayMonths }) });
      return streamAI([
        { role: "system", content: sysPrompt },
        { role: "user", content: `Analyze financial health using EXACT data:\n${ctx}\n\nGive:\n1. 🏦 FINANCIAL HEALTH SCORE (1-10)\n2. 💰 CASH FLOW ANALYSIS\n3. ⚠️ RUNWAY ALERT\n4. 📉 EXPENSE OPTIMIZATION\n5. 📈 REVENUE ACCELERATION\n6. 📋 ACTION PLAN (30 days)` }
      ]);

    } else if (action === "investor_prep") {
      return streamAI([
        { role: "system", content: sysPrompt },
        { role: "user", content: `Prepare investor readiness using EXACT data:\n${ctx}\n\nGive: Key metrics, strengths, gaps, ideal investor profile, email template, pitch deck outline.` }
      ]);

    } else if (action === "ecommerce_autopilot") {
      return streamAI([
        { role: "system", content: sysPrompt },
        { role: "user", content: `E-commerce autopilot analysis using EXACT data:\n${ctx}\n\nGive: Inventory status, pricing, new products, sales analytics, shipping, revenue boosters.` }
      ]);

    } else if (action === "solve_problem") {
      const pd = problem_data || {};
      const data = await callAI(
        [{ role: "system", content: sysPrompt + "\n\nSolve with data-driven solutions. Escalate only if it needs budget/policy/hiring decisions." },
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

    } else if (action === "team_coaching") {
      return streamAI([
        { role: "system", content: sysPrompt },
        { role: "user", content: `Coach ${body.member_name || ''} (${body.member_vertical || ''}) using EXACT data:\n${ctx}\n\nGive personal daily plan with exact tasks from actual data.` }
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
        [{ role: "system", content: sysPrompt + "\n\nGenerate personalized daily pushes using ACTUAL team and data records." },
         { role: "user", content: `Generate pushes from REAL data:\n${ctx}` }],
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
