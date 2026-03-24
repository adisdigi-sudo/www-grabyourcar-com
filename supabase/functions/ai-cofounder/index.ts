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

// Targeted search: query specific tables based on user question keywords
async function targetedSearch(question: string, SB: string, h: Record<string, string>, verticalFilter?: string | null): Promise<string> {
  if (!question) return "";
  const q = question.toLowerCase();
  const results: string[] = [];

  const numPatterns = question.match(/\b\d{4}\b/g) || [];
  const regPatterns = question.match(/[A-Za-z]{2}\d{1,2}[A-Za-z]{0,3}\d{1,4}/gi) || [];
  const searchTerms = [...numPatterns, ...regPatterns];
  const phonePatterns = question.match(/\b\d{10}\b/g) || [];
  const nameWords = question.match(/\b[A-Z][a-z]{2,}\b/g) || [];
  const skipNames = new Set(["Insurance","Policy","Booked","Vehicle","Number","Car","What","Show","Give","Find","Search","Check","Report","Campaign","Target","Today","Month","Week","Call","Send","Help","Status","Payment","Pending","Details","Customer","Client"]);

  // ===== INSURANCE =====
  if (!verticalFilter || verticalFilter.toLowerCase().includes("insurance")) {
    if (q.includes("policy") || q.includes("insurance") || q.includes("renewal") || q.includes("insur") || q.includes("client") || searchTerms.length > 0 || phonePatterns.length > 0) {
      for (const term of searchTerms) {
        const clients = await safeFetch(`${SB}/rest/v1/insurance_clients?or=(vehicle_number.ilike.*${term}*,phone.ilike.*${term}*)&select=id,customer_name,phone,vehicle_number,vehicle_make,vehicle_model,vehicle_year,current_insurer,current_premium,current_policy_number,current_policy_type,policy_expiry_date,lead_status,pipeline_stage,assigned_executive,ncb_percentage,follow_up_date&limit=10`, h);
        if (clients.length > 0) {
          results.push(`🔍 Insurance clients "${term}":\n${clients.map((c: any) => `• ${c.customer_name || 'N/A'} | Ph: ${c.phone || 'N/A'} | Vehicle: ${c.vehicle_number || 'N/A'} (${c.vehicle_make || ''} ${c.vehicle_model || ''} ${c.vehicle_year || ''}) | Policy#: ${c.current_policy_number || 'N/A'} | Type: ${c.current_policy_type || 'N/A'} | Insurer: ${c.current_insurer || 'N/A'} | Premium: ₹${c.current_premium || 'N/A'} | NCB: ${c.ncb_percentage || 'N/A'}% | Expiry: ${c.policy_expiry_date || 'N/A'} | Status: ${c.lead_status || 'N/A'} | Stage: ${c.pipeline_stage || 'N/A'} | Exec: ${c.assigned_executive || 'N/A'} | Follow-up: ${c.follow_up_date || 'N/A'}`).join('\n')}`);
        }
        const policies = await safeFetch(`${SB}/rest/v1/insurance_policies?or=(vehicle_number.ilike.*${term}*,policy_number.ilike.*${term}*)&select=id,client_id,policy_number,policy_type,insurer,premium_amount,vehicle_number,start_date,expiry_date,status,ncb_percentage,od_premium,tp_premium,net_premium&limit=10`, h);
        if (policies.length > 0) {
          results.push(`🔍 Insurance policies "${term}":\n${policies.map((p: any) => `• Policy#: ${p.policy_number || 'N/A'} | Type: ${p.policy_type || 'N/A'} | Insurer: ${p.insurer || 'N/A'} | Vehicle: ${p.vehicle_number || 'N/A'} | Premium: ₹${p.premium_amount || 'N/A'} | OD: ₹${p.od_premium || 'N/A'} | TP: ₹${p.tp_premium || 'N/A'} | NCB: ${p.ncb_percentage || 'N/A'}% | Expiry: ${p.expiry_date || 'N/A'} | Status: ${p.status || 'N/A'}`).join('\n')}`);
        }
      }
      for (const phone of phonePatterns) {
        const clients = await safeFetch(`${SB}/rest/v1/insurance_clients?phone=ilike.*${phone}*&select=id,customer_name,phone,vehicle_number,vehicle_make,vehicle_model,current_insurer,current_premium,current_policy_number,policy_expiry_date,lead_status,pipeline_stage&limit=10`, h);
        if (clients.length > 0) {
          results.push(`🔍 Insurance clients ph "${phone}":\n${clients.map((c: any) => `• ${c.customer_name || 'N/A'} | Ph: ${c.phone} | Vehicle: ${c.vehicle_number || 'N/A'} | Policy#: ${c.current_policy_number || 'N/A'} | Insurer: ${c.current_insurer || 'N/A'} | Premium: ₹${c.current_premium || 'N/A'} | Expiry: ${c.policy_expiry_date || 'N/A'}`).join('\n')}`);
        }
      }
    }
  }

  // ===== HSRP =====
  if (!verticalFilter || verticalFilter.toLowerCase().includes("hsrp")) {
    if (q.includes("hsrp") || q.includes("plate") || q.includes("registration") || searchTerms.length > 0) {
      for (const term of searchTerms) {
        const hsrps = await safeFetch(`${SB}/rest/v1/hsrp_bookings?registration_number=ilike.*${term}*&select=id,owner_name,registration_number,order_status,payment_status,mobile,service_type,payment_amount&limit=10`, h);
        if (hsrps.length > 0) {
          results.push(`🔍 HSRP "${term}":\n${hsrps.map((h: any) => `• ${h.owner_name || 'N/A'} | Ph: ${h.mobile || 'N/A'} | Reg: ${h.registration_number || 'N/A'} | Type: ${h.service_type || 'N/A'} | Status: ${h.order_status || 'N/A'} | Payment: ${h.payment_status || 'N/A'} | ₹${h.payment_amount || 'N/A'}`).join('\n')}`);
        }
      }
    }
  }

  // ===== LEADS =====
  if (q.includes("lead") || q.includes("customer") || q.includes("client") || phonePatterns.length > 0) {
    for (const phone of phonePatterns) {
      const foundLeads = await safeFetch(`${SB}/rest/v1/leads?phone=ilike.*${phone}*&select=id,name,phone,source,service_category,status,priority,assigned_to,city,follow_up_date&limit=10`, h);
      if (foundLeads.length > 0) {
        results.push(`🔍 Leads ph "${phone}":\n${foundLeads.map((l: any) => `• ${l.name || 'N/A'} | Ph: ${l.phone} | Source: ${l.source || 'N/A'} | Category: ${l.service_category || 'N/A'} | Status: ${l.status || 'N/A'} | Priority: ${l.priority || 'N/A'} | City: ${l.city || 'N/A'}`).join('\n')}`);
      }
    }
  }

  // ===== RENTAL =====
  if (!verticalFilter || verticalFilter.toLowerCase().includes("rental") || verticalFilter.toLowerCase().includes("self") || verticalFilter.toLowerCase().includes("drive")) {
    if (q.includes("rental") || q.includes("self drive") || q.includes("booking") || q.includes("return")) {
      for (const phone of phonePatterns) {
        const rentals = await safeFetch(`${SB}/rest/v1/rental_bookings?phone=ilike.*${phone}*&select=id,customer_name,phone,car_name,pickup_date,return_date,status,payment_status,total_amount&limit=10`, h);
        if (rentals.length > 0) {
          results.push(`🔍 Rentals ph "${phone}":\n${rentals.map((r: any) => `• ${r.customer_name || 'N/A'} | Ph: ${r.phone} | Car: ${r.car_name || 'N/A'} | Pickup: ${r.pickup_date || 'N/A'} | Return: ${r.return_date || 'N/A'} | ₹${r.total_amount || 'N/A'} | Status: ${r.status || 'N/A'}`).join('\n')}`);
        }
      }
    }
  }

  // ===== NAME SEARCH =====
  for (const name of (nameWords || []).slice(0, 3)) {
    if (skipNames.has(name)) continue;
    const clients = await safeFetch(`${SB}/rest/v1/insurance_clients?customer_name=ilike.*${name}*&select=id,customer_name,phone,vehicle_number,vehicle_make,vehicle_model,current_insurer,current_premium,policy_expiry_date,lead_status&limit=5`, h);
    if (clients.length > 0) {
      results.push(`🔍 Insurance clients "${name}":\n${clients.map((c: any) => `• ${c.customer_name || 'N/A'} | Ph: ${c.phone || 'N/A'} | Vehicle: ${c.vehicle_number || 'N/A'} (${c.vehicle_make || ''} ${c.vehicle_model || ''}) | Insurer: ${c.current_insurer || 'N/A'} | Premium: ₹${c.current_premium || 'N/A'} | Expiry: ${c.policy_expiry_date || 'N/A'}`).join('\n')}`);
    }
    const custSearch = await safeFetch(`${SB}/rest/v1/customers?name=ilike.*${name}*&select=id,name,phone,email,status,city&limit=5`, h);
    if (custSearch.length > 0) {
      results.push(`🔍 Customers "${name}":\n${custSearch.map((c: any) => `• ${c.name || 'N/A'} | Ph: ${c.phone || 'N/A'} | Email: ${c.email || 'N/A'} | City: ${c.city || 'N/A'} | Status: ${c.status || 'N/A'}`).join('\n')}`);
    }
    const leadSearch = await safeFetch(`${SB}/rest/v1/leads?name=ilike.*${name}*&select=id,name,phone,source,service_category,status,priority,city&limit=5`, h);
    if (leadSearch.length > 0) {
      results.push(`🔍 Leads "${name}":\n${leadSearch.map((l: any) => `• ${l.name || 'N/A'} | Ph: ${l.phone || 'N/A'} | Source: ${l.source || 'N/A'} | Category: ${l.service_category || 'N/A'} | Status: ${l.status || 'N/A'} | City: ${l.city || 'N/A'}`).join('\n')}`);
    }
  }

  if (results.length === 0) return "\n⚠️ TARGETED SEARCH: No specific records found matching your query keywords.\n";
  return "\n===== TARGETED SEARCH RESULTS =====\n" + results.join("\n\n") + "\n===== END SEARCH RESULTS =====\n";
}

// ===== BLOCKED TOPICS FOR TEAM MEMBERS =====
const BLOCKED_KEYWORDS_FOR_TEAM = [
  "profit", "revenue", "expenses", "burn rate", "runway", "investor", "funding",
  "bank balance", "cash in bank", "salary", "payroll", "other team", "other vertical",
  "company finance", "total revenue", "net profit", "p&l", "balance sheet",
  "how much company", "company earning", "our profit", "business profit",
  "employee salary", "team salary", "other member", "other executive",
  "admin data", "super admin", "founder data", "company data",
  "all teams", "all verticals", "all employees", "full report",
  "bank account", "financial health", "investment", "share", "equity"
];

function isBlockedForTeam(question: string): boolean {
  const q = question.toLowerCase();
  return BLOCKED_KEYWORDS_FOR_TEAM.some(k => q.includes(k));
}

function getDaysUntilExpiry(expiryDate: string | null | undefined, daysUntilExpiry?: number | null): number | null {
  if (typeof daysUntilExpiry === "number" && Number.isFinite(daysUntilExpiry)) return daysUntilExpiry;
  if (!expiryDate) return null;
  const diff = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  return Number.isFinite(diff) ? diff : null;
}

function getRenewalPriority(daysLeft: number | null): "critical" | "high" | "medium" | "low" {
  if (daysLeft === null) return "low";
  if (daysLeft <= 3) return "critical";
  if (daysLeft <= 7) return "high";
  if (daysLeft <= 15) return "medium";
  return "low";
}

function getRenewalAction(daysLeft: number | null): string {
  if (daysLeft === null) return "Verify expiry date and contact customer";
  if (daysLeft <= 1) return "Call immediately and send renewal quote now";
  if (daysLeft <= 3) return "Call today and close follow-up";
  if (daysLeft <= 7) return "Call within 2 hours and send reminder";
  if (daysLeft <= 15) return "Schedule follow-up today";
  return "Add to nurture queue and remind before due date";
}

function isRenewalQuestion(question: string | null | undefined): boolean {
  const q = (question || "").toLowerCase();
  return ["renewal", "renew", "expir", "policy due", "upcoming policy", "upcoming renewal"].some((term) => q.includes(term));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SB = Deno.env.get("SUPABASE_URL")!;
    const SK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const body = await req.json();
    const { action, user_name, user_role, vertical, question, target_data, problem_data, conversation_history } = body;

    const isSuperAdmin = !user_role || user_role === "super_admin" || user_role === "admin";
    const userVertical = vertical || null;

    // ===== HARD BLOCK: Team members asking restricted questions =====
    if (!isSuperAdmin && question && isBlockedForTeam(question)) {
      const blockMsg = `🔒 Sorry ${user_name || 'team member'}, that information is restricted to management only.\n\nI can help you with:\n- 🔍 Finding your clients/leads\n- 📋 Your pending tasks & follow-ups\n- 🎯 Your personal targets & incentives\n- 📞 Who to call next\n- 📊 Your performance report\n\nAsk me about your ${userVertical || ''} work! 💪`;
      // Return as SSE stream for consistency
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const words = blockMsg.split(' ');
          let i = 0;
          const interval = setInterval(() => {
            if (i >= words.length) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              clearInterval(interval);
              return;
            }
            const chunk = (i === 0 ? '' : ' ') + words[i];
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`));
            i++;
          }, 20);
        }
      });
      return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    const h = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
    const today = new Date().toISOString().split("T")[0];
    const cm = today.slice(0, 7);

    // Parallel fetch all business data
    const [leads, renewalTracking, insuranceClients, rentals, hsrp, deals, followUps, pendingTasks, targets, problems, teamMembers, expenses, bankAccounts, invoices, risks, crossSells, mistakes] = await Promise.all([
      safeFetch(`${SB}/rest/v1/leads?created_at=gte.${today}T00:00:00&select=id,name,phone,source,service_category,status,priority,assigned_to,city&limit=50`, h),
      safeFetch(`${SB}/rest/v1/insurance_renewal_tracking?select=id,client_id,policy_id,expiry_date,days_until_expiry,updated_at&expiry_date=gte.${today}&expiry_date=lte.${new Date(Date.now()+90*86400000).toISOString().split("T")[0]}&order=expiry_date.asc&limit=100`, h),
      safeFetch(`${SB}/rest/v1/insurance_clients?select=id,customer_name,phone,vehicle_number,vehicle_make,vehicle_model,lead_status,pipeline_stage,follow_up_date,assigned_executive,current_insurer,current_premium,current_policy_number,current_policy_type,ncb_percentage&limit=500`, h),
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

    const insuranceClientMap = new Map((insuranceClients || []).map((client: any) => [client.id, client]));
    const insurance = (renewalTracking || []).map((renewal: any) => {
      const client = insuranceClientMap.get(renewal.client_id) || {};
      const daysLeft = getDaysUntilExpiry(renewal.expiry_date, renewal.days_until_expiry);
      return {
        id: renewal.id,
        client_id: renewal.client_id,
        policy_id: renewal.policy_id,
        customer_name: client.customer_name || "N/A",
        phone: client.phone || "N/A",
        vehicle_number: client.vehicle_number || "N/A",
        vehicle_make: client.vehicle_make || "",
        vehicle_model: client.vehicle_model || "",
        current_insurer: client.current_insurer || "N/A",
        current_premium: client.current_premium || 0,
        current_policy_number: client.current_policy_number || "N/A",
        current_policy_type: client.current_policy_type || "N/A",
        pipeline_stage: client.pipeline_stage || "N/A",
        follow_up_date: client.follow_up_date || null,
        assigned_executive: client.assigned_executive || null,
        lead_status: client.lead_status || "N/A",
        ncb_percentage: client.ncb_percentage || null,
        expiry_date: renewal.expiry_date,
        days_until_expiry: daysLeft,
        priority: getRenewalPriority(daysLeft),
        next_action: getRenewalAction(daysLeft),
      };
    }).sort((a: any, b: any) => (a.days_until_expiry ?? 9999) - (b.days_until_expiry ?? 9999));

    // Financial calculations
    const totalRevenue = invoices.filter((i: any) => i.status === "paid").reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0);
    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
    const cashInBank = bankAccounts.reduce((sum: number, b: any) => sum + Number(b.current_balance || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const monthlyBurn = totalExpenses;
    const runwayMonths = monthlyBurn > 0 ? Math.round((cashInBank / monthlyBurn) * 10) / 10 : 99;
    const pendingPayments = deals.filter((d: any) => d.payment_status !== "received").reduce((sum: number, d: any) => sum + (Number(d.deal_value || 0) - Number(d.payment_received_amount || 0)), 0);

    // ===== FULL CONTEXT (ADMIN ONLY) =====
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
${insurance.length > 0 ? insurance.map((i: any) => `• [${(i.priority || 'low').toUpperCase()}] ${i.customer_name || 'N/A'} | Ph: ${i.phone || 'N/A'} | Vehicle: ${i.vehicle_number || 'N/A'} (${i.vehicle_make || ''} ${i.vehicle_model || ''}) | Expiry: ${i.expiry_date || 'N/A'} | Days Left: ${i.days_until_expiry ?? 'N/A'} | Insurer: ${i.current_insurer || 'N/A'} | Premium: ₹${i.current_premium || 'N/A'} | Policy#: ${i.current_policy_number || 'N/A'} | Stage: ${i.pipeline_stage || 'N/A'} | Exec: ${i.assigned_executive || 'Unassigned'} | Next: ${i.next_action}`).join('\n') : '⚠️ NO INSURANCE RENEWALS FOUND'}

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

    // ===== DATA ACCURACY RULES =====
    const DATA_ACCURACY_RULES = `
🚨 CRITICAL DATA ACCURACY RULES — VIOLATION = FAILURE:
1. ONLY use data shown between "===== LIVE BUSINESS DATA" and "===== END OF DATA =====" AND from "===== TARGETED SEARCH RESULTS =====".
2. If a section says "⚠️ NO ... FOUND" or shows 0 records, say EXACTLY THAT — "No records found in the database."
3. NEVER invent names, phone numbers, vehicle numbers, amounts, or dates.
4. NEVER assume or estimate data that isn't provided.
5. If TARGETED SEARCH found specific records, use THOSE exact records in your answer.
6. If TARGETED SEARCH says "No specific records found", say clearly: "I searched the database but couldn't find a matching record."
7. Always quote EXACT names, phones, amounts from the data above.
8. If count is 0, say "0 records" — don't create fictional records.
9. PRIORITIZE TARGETED SEARCH RESULTS over general snapshot.
10. Format data in clean markdown tables when showing multiple records.
11. For renewal questions, ALWAYS use the insurance renewals list sorted by lowest days left first.
12. For renewal answers, include priority, days left, and next action for each customer.`;

    // ===== SYSTEM PROMPTS =====
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
- Generate detailed markdown reports with tables
- Include period comparison, trend analysis, specific recommendations
- When user asks for Excel report, format as structured table data with clear headers

${DATA_ACCURACY_RULES}

Current role: SUPER ADMIN / FOUNDER (full access to all verticals & financials)`;
    } else {
      // ===== STRICT TEAM MEMBER PROMPT =====
      const verticalLabel = userVertical || "general";
      sysPrompt = `You are a Work Assistant for ${user_name || 'team member'} at GrabYourCar, working in the ${verticalLabel} vertical.

YOUR IDENTITY:
- Professional, friendly work helper: "Hi ${user_name || 'there'}! 👋"
- Be SPECIFIC with exact data from database only
- Focus ONLY on operational work tasks

⚠️ CRITICAL ACCESS RESTRICTIONS — MUST FOLLOW — NO EXCEPTIONS:
🚫 You are NOT an AI Co-Founder for this user — you are a WORK ASSISTANT only
🚫 NEVER share company profits, revenue, expenses, margins, P&L, or ANY financial data
🚫 NEVER share other team members' performance, salary, targets, or personal info
🚫 NEVER discuss investor data, runway, burn rate, company finances, or bank balances
🚫 NEVER answer questions about other verticals, departments, or teams
🚫 NEVER reveal admin-level business intelligence, strategies, or company plans
🚫 NEVER discuss total company data, overall business metrics, or cross-vertical analytics
🚫 NEVER generate company-wide reports or dashboards
🚫 If asked about ANY restricted topic, respond EXACTLY with:
   "🔒 That information is restricted to management. I can help you with your ${verticalLabel} work — clients, targets, follow-ups, and performance!"

✅ ONLY HELP WITH:
- Finding/searching clients and leads in ${verticalLabel}
- Showing their pending follow-ups and tasks
- Their PERSONAL targets and achievement
- Who to call next and what to say
- Their personal incentive calculation
- Tips to improve THEIR performance
- Drafting messages (WhatsApp/Email) for THEIR clients
- Their personal performance report (ONLY their data)
${verticalLabel.toLowerCase().includes('insurance') ? '- Insurance renewals assigned to them\n- Policy lookups for their clients\n- Renewal reminder message templates' : ''}
${verticalLabel.toLowerCase().includes('rental') || verticalLabel.toLowerCase().includes('self') ? '- Self-drive bookings and returns\n- KYC verification status\n- Customer pickup/return coordination' : ''}
${verticalLabel.toLowerCase().includes('hsrp') ? '- HSRP order processing and status\n- Customer registration updates\n- Payment follow-ups' : ''}
${verticalLabel.toLowerCase().includes('sales') || verticalLabel.toLowerCase().includes('auto') ? '- Sales leads and pipeline\n- Test drive scheduling\n- Quotation follow-ups' : ''}

${DATA_ACCURACY_RULES}

Current role: ${user_role || 'employee'} in ${verticalLabel} (RESTRICTED ACCESS)`;
    }

    // ===== BUILD CONTEXT BASED ON ROLE =====
    let dataCtx: string;
    if (isSuperAdmin) {
      dataCtx = ctx;
    } else {
      // Team members get ONLY their vertical data — NO financials, NO other teams
      const vl = (userVertical || "").toLowerCase();
      const myTargets = targets.filter((t: any) => {
        const tv = (t.vertical_name || "").toLowerCase();
        const tn = (t.team_member_name || "").toLowerCase();
        const un = (user_name || "").toLowerCase();
        return tv.includes(vl) || vl.includes(tv) || tn.includes(un);
      });

      dataCtx = `===== YOUR ${(userVertical || "").toUpperCase()} WORK DATA (${today}) =====
${vl.includes('insurance') ? `📋 PENDING RENEWALS:\n${insurance.length > 0 ? insurance.map((i: any) => `• [${(i.priority || 'low').toUpperCase()}] ${i.customer_name || 'N/A'} | Ph: ${i.phone || 'N/A'} | Vehicle: ${i.vehicle_number || 'N/A'} | Expiry: ${i.expiry_date || 'N/A'} | Days Left: ${i.days_until_expiry ?? 'N/A'} | Insurer: ${i.current_insurer || 'N/A'} | Premium: ₹${i.current_premium || 'N/A'} | Next: ${i.next_action}`).join('\n') : '⚠️ No pending renewals found'}` : ''}
${vl.includes('sales') || vl.includes('auto') ? `📋 YOUR LEADS:\n${leads.filter((l: any) => !l.service_category || l.service_category?.toLowerCase().includes('car') || l.service_category?.toLowerCase().includes('sale')).map((l: any) => `• ${l.name || 'N/A'} | Ph: ${l.phone || 'N/A'} | Source: ${l.source || 'N/A'} | Status: ${l.status || 'N/A'} | Priority: ${l.priority || 'N/A'}`).join('\n') || '⚠️ No sales leads today'}` : ''}
${vl.includes('rental') || vl.includes('self') || vl.includes('drive') ? `📋 SELF-DRIVE RETURNS:\n${rentals.length > 0 ? rentals.map((r: any) => `• ${r.customer_name || 'N/A'} | Ph: ${r.phone || 'N/A'} | Car: ${r.car_name || 'N/A'} | Return: ${r.return_date || 'N/A'} | Payment: ${r.payment_status || 'N/A'}`).join('\n') : '⚠️ No returns due'}` : ''}
${vl.includes('hsrp') ? `📋 HSRP PENDING:\n${hsrp.length > 0 ? hsrp.map((h: any) => `• ${h.owner_name || 'N/A'} | Ph: ${h.mobile || 'N/A'} | Reg: ${h.registration_number || 'N/A'} | Status: ${h.order_status || 'N/A'}`).join('\n') : '⚠️ No pending HSRP orders'}` : ''}

📞 YOUR FOLLOW-UPS:
${followUps.length > 0 ? followUps.map((f: any) => `• ${f.name || 'N/A'} | Ph: ${f.phone || 'N/A'} | Due: ${f.follow_up_date || 'N/A'} | Category: ${f.service_category || 'N/A'}`).join('\n') : '⚠️ No pending follow-ups'}

🎯 YOUR TARGETS:
${myTargets.length > 0 ? myTargets.map((t: any) => `• ${t.team_member_name}: ${t.achieved_count || 0}/${t.target_count || 0} deals | ₹${Number(t.achieved_revenue || 0).toLocaleString("en-IN")}/₹${Number(t.target_revenue || 0).toLocaleString("en-IN")}`).join('\n') : '⚠️ No targets set for this month'}
===== END OF DATA =====`;
    }

    // ===== WRITE ACTIONS — Let AI actually do things =====
    async function executeWriteAction(actionName: string, params: any): Promise<string> {
      try {
        if (actionName === "add_insurance_lead") {
          const phone = (params.phone || "").replace(/\D/g, "").replace(/^91/, "");
          if (!phone || phone.length < 10) return "❌ Invalid phone number provided.";
          // Check if client exists
          const existing = await safeFetch(`${SB}/rest/v1/insurance_clients?phone=eq.${phone}&select=id,customer_name&limit=1`, h);
          if (existing.length > 0) {
            // Update existing
            const updates: any = {};
            if (params.customer_name) updates.customer_name = params.customer_name;
            if (params.vehicle_number) updates.vehicle_number = params.vehicle_number;
            if (params.vehicle_make) updates.vehicle_make = params.vehicle_make;
            if (params.vehicle_model) updates.vehicle_model = params.vehicle_model;
            if (params.vehicle_year) updates.vehicle_year = params.vehicle_year;
            if (params.current_insurer) updates.current_insurer = params.current_insurer;
            if (params.current_policy_type) updates.current_policy_type = params.current_policy_type;
            if (params.policy_expiry_date) updates.policy_expiry_date = params.policy_expiry_date;
            if (params.email) updates.email = params.email;
            if (params.notes) updates.notes = params.notes;
            if (params.vehicle_color) updates.notes = (updates.notes || params.notes || '') + ' | Color: ' + params.vehicle_color;
            updates.updated_at = new Date().toISOString();
            const r = await fetch(`${SB}/rest/v1/insurance_clients?id=eq.${existing[0].id}`, { method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify(updates) });
            if (!r.ok) return `❌ Failed to update client: ${await r.text()}`;
            // Log activity
            await fetch(`${SB}/rest/v1/insurance_activity_log`, { method: "POST", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify({ client_id: existing[0].id, activity_type: "lead_updated", title: "Lead updated by AI Co-Founder", description: `Updated info for ${params.customer_name || existing[0].customer_name}` }) });
            return `✅ Updated existing client "${existing[0].customer_name || params.customer_name}" (ID: ${existing[0].id}). Phone: ${phone}`;
          } else {
            // Create new
            const insertData: any = {
              phone,
              customer_name: params.customer_name || "New Lead",
              lead_source: params.lead_source || "ai_cofounder",
              pipeline_stage: "new_lead",
              lead_status: "new",
              priority: params.priority || "medium",
            };
            if (params.email) insertData.email = params.email;
            if (params.vehicle_number) insertData.vehicle_number = params.vehicle_number;
            if (params.vehicle_make) insertData.vehicle_make = params.vehicle_make;
            if (params.vehicle_model) insertData.vehicle_model = params.vehicle_model;
            if (params.vehicle_year) insertData.vehicle_year = params.vehicle_year;
            if (params.current_insurer) insertData.current_insurer = params.current_insurer;
            if (params.current_policy_type) insertData.current_policy_type = params.current_policy_type;
            if (params.policy_expiry_date) insertData.policy_expiry_date = params.policy_expiry_date;
            if (params.notes) insertData.notes = params.notes;
            if (params.vehicle_color) insertData.vehicle_color = params.vehicle_color;
            const r = await fetch(`${SB}/rest/v1/insurance_clients`, { method: "POST", headers: { ...h, Prefer: "return=representation" }, body: JSON.stringify(insertData) });
            if (!r.ok) return `❌ Failed to add lead: ${await r.text()}`;
            const created = await r.json();
            const clientId = Array.isArray(created) ? created[0]?.id : created?.id;
            if (clientId) {
              await fetch(`${SB}/rest/v1/insurance_activity_log`, { method: "POST", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify({ client_id: clientId, activity_type: "lead_created", title: "New lead added by AI Co-Founder", description: `${params.customer_name} - ${params.vehicle_make || ''} ${params.vehicle_model || ''}` }) });
            }
            return `✅ New insurance lead added! Name: ${params.customer_name}, Phone: ${phone}, Vehicle: ${params.vehicle_make || ''} ${params.vehicle_model || ''}${params.policy_expiry_date ? ', Expiry: ' + params.policy_expiry_date : ''}`;
          }
        }

        if (actionName === "update_insurance_client") {
          if (!params.client_id && !params.phone) return "❌ Need client_id or phone to update.";
          let clientId = params.client_id;
          if (!clientId && params.phone) {
            const phone = params.phone.replace(/\D/g, "").replace(/^91/, "");
            const found = await safeFetch(`${SB}/rest/v1/insurance_clients?phone=eq.${phone}&select=id&limit=1`, h);
            if (found.length === 0) return `❌ No client found with phone ${phone}`;
            clientId = found[0].id;
          }
          const updates: any = { updated_at: new Date().toISOString() };
          for (const key of ["customer_name","vehicle_number","vehicle_make","vehicle_model","vehicle_year","current_insurer","current_policy_type","policy_expiry_date","current_premium","lead_status","pipeline_stage","follow_up_date","assigned_executive","notes","email","ncb_percentage","vehicle_color"]) {
            if (params[key] !== undefined) updates[key] = params[key];
          }
          const r = await fetch(`${SB}/rest/v1/insurance_clients?id=eq.${clientId}`, { method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify(updates) });
          if (!r.ok) return `❌ Update failed: ${await r.text()}`;
          return `✅ Client ${clientId} updated successfully.`;
        }

        if (actionName === "add_general_lead") {
          const phone = (params.phone || "").replace(/\D/g, "").replace(/^91/, "");
          if (!phone || phone.length < 10) return "❌ Invalid phone number.";
          const insertData: any = {
            customer_name: params.name || params.customer_name || "New Lead",
            phone,
            source: params.source || "ai_cofounder",
            status: "new",
            priority: params.priority || "medium",
            service_category: params.service_category || null,
            email: params.email || null,
            city: params.city || null,
            car_model: params.car_model || null,
            notes: params.notes || null,
          };
          const r = await fetch(`${SB}/rest/v1/leads`, { method: "POST", headers: { ...h, Prefer: "return=representation" }, body: JSON.stringify(insertData) });
          if (!r.ok) return `❌ Failed: ${await r.text()}`;
          return `✅ Lead added: ${insertData.customer_name} (${phone})`;
        }

        if (actionName === "update_lead_status") {
          if (!params.lead_id) return "❌ Need lead_id.";
          const updates: any = { updated_at: new Date().toISOString() };
          if (params.status) updates.status = params.status;
          if (params.priority) updates.priority = params.priority;
          if (params.assigned_to) updates.assigned_to = params.assigned_to;
          if (params.notes) updates.notes = params.notes;
          const r = await fetch(`${SB}/rest/v1/leads?id=eq.${params.lead_id}`, { method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify(updates) });
          if (!r.ok) return `❌ Update failed.`;
          return `✅ Lead ${params.lead_id} updated.`;
        }

        if (actionName === "set_follow_up") {
          if (!params.client_id && !params.phone) return "❌ Need client_id or phone.";
          let clientId = params.client_id;
          if (!clientId && params.phone) {
            const phone = params.phone.replace(/\D/g, "").replace(/^91/, "");
            const found = await safeFetch(`${SB}/rest/v1/insurance_clients?phone=eq.${phone}&select=id&limit=1`, h);
            if (found.length === 0) return `❌ No client found with phone ${phone}`;
            clientId = found[0].id;
          }
          const r = await fetch(`${SB}/rest/v1/insurance_clients?id=eq.${clientId}`, { method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify({ follow_up_date: params.follow_up_date, updated_at: new Date().toISOString() }) });
          if (!r.ok) return `❌ Failed to set follow-up.`;
          return `✅ Follow-up set for ${params.follow_up_date} on client ${clientId}.`;
        }

        return `❌ Unknown action: ${actionName}`;
      } catch (err) {
        console.error("Write action error:", err);
        return `❌ Error: ${err instanceof Error ? err.message : "Unknown error"}`;
      }
    }

    const WRITE_TOOLS = [
      {
        type: "function",
        function: {
          name: "add_insurance_lead",
          description: "Add a new insurance lead/client to the CRM. Use when user says 'add lead', 'add client', 'create entry', etc.",
          parameters: {
            type: "object",
            properties: {
              customer_name: { type: "string", description: "Customer/company name" },
              phone: { type: "string", description: "10-digit mobile number" },
              email: { type: "string", description: "Email address" },
              vehicle_number: { type: "string", description: "Vehicle registration number" },
              vehicle_make: { type: "string", description: "Vehicle brand like Hyundai, Maruti, etc." },
              vehicle_model: { type: "string", description: "Vehicle model like Creta, Swift, etc." },
              vehicle_year: { type: "number", description: "Manufacturing year" },
              vehicle_color: { type: "string", description: "Vehicle color" },
              current_insurer: { type: "string", description: "Current insurance company" },
              current_policy_type: { type: "string", description: "Policy type: comprehensive, third_party, own_damage" },
              policy_expiry_date: { type: "string", description: "Policy expiry date in YYYY-MM-DD format" },
              notes: { type: "string", description: "Additional notes" },
              priority: { type: "string", enum: ["low","medium","high","urgent"], description: "Lead priority" },
              lead_source: { type: "string", description: "Source of lead" },
            },
            required: ["customer_name", "phone"],
            additionalProperties: false,
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_insurance_client",
          description: "Update an existing insurance client's information. Use when user says 'update', 'change', 'modify' client data.",
          parameters: {
            type: "object",
            properties: {
              client_id: { type: "string", description: "Client UUID" },
              phone: { type: "string", description: "Phone to find client if no client_id" },
              customer_name: { type: "string" },
              vehicle_number: { type: "string" },
              vehicle_make: { type: "string" },
              vehicle_model: { type: "string" },
              vehicle_year: { type: "number" },
              vehicle_color: { type: "string" },
              current_insurer: { type: "string" },
              current_policy_type: { type: "string" },
              policy_expiry_date: { type: "string" },
              current_premium: { type: "number" },
              lead_status: { type: "string" },
              pipeline_stage: { type: "string" },
              follow_up_date: { type: "string" },
              assigned_executive: { type: "string" },
              notes: { type: "string" },
              email: { type: "string" },
              ncb_percentage: { type: "number" },
            },
            required: [],
            additionalProperties: false,
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_general_lead",
          description: "Add a general lead to the main leads table for any vertical.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Customer name" },
              phone: { type: "string", description: "Phone number" },
              email: { type: "string" },
              city: { type: "string" },
              source: { type: "string" },
              service_category: { type: "string", description: "car-sales, insurance, loan, hsrp, self-drive, accessories" },
              car_model: { type: "string" },
              notes: { type: "string" },
              priority: { type: "string", enum: ["low","medium","high"] },
            },
            required: ["name", "phone"],
            additionalProperties: false,
          }
        }
      },
      {
        type: "function",
        function: {
          name: "set_follow_up",
          description: "Set a follow-up date for a client.",
          parameters: {
            type: "object",
            properties: {
              client_id: { type: "string" },
              phone: { type: "string", description: "Phone to find client" },
              follow_up_date: { type: "string", description: "Follow-up date YYYY-MM-DD" },
            },
            required: ["follow_up_date"],
            additionalProperties: false,
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_lead_status",
          description: "Update a lead's status, priority, or assignment.",
          parameters: {
            type: "object",
            properties: {
              lead_id: { type: "string" },
              status: { type: "string" },
              priority: { type: "string" },
              assigned_to: { type: "string" },
              notes: { type: "string" },
            },
            required: ["lead_id"],
            additionalProperties: false,
          }
        }
      }
    ];

    // ===== STREAMING AI HELPER =====
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

    // ===== AI WITH TOOL CALLING (for write actions) =====
    async function streamAIWithTools(msgs: any[]) {
      // First call: NON-streaming to detect tool calls
      const firstCall = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: msgs,
          tools: isSuperAdmin ? WRITE_TOOLS : undefined,
          stream: false,
          max_tokens: 4000,
        }),
      });
      if (!firstCall.ok) {
        if (firstCall.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (firstCall.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI error: ${firstCall.status}`);
      }

      // Parse response - handle both JSON and SSE formats
      const contentType = firstCall.headers.get("content-type") || "";
      let firstResult: any;
      
      if (contentType.includes("text/event-stream")) {
        // Gateway returned SSE despite stream:false — parse SSE to reconstruct message
        const text = await firstCall.text();
        const lines = text.split("\n").filter(l => l.startsWith("data: ") && !l.includes("[DONE]"));
        let toolCalls: any[] = [];
        let finishReason = "";
        let messageContent = "";
        
        for (const line of lines) {
          try {
            const chunk = JSON.parse(line.slice(6));
            const delta = chunk.choices?.[0]?.delta;
            if (delta?.content) messageContent += delta.content;
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (tc.id) {
                  toolCalls.push({ id: tc.id, type: tc.type, function: { name: tc.function?.name || "", arguments: tc.function?.arguments || "" } });
                } else if (tc.function?.arguments && toolCalls.length > 0) {
                  toolCalls[toolCalls.length - 1].function.arguments += tc.function.arguments;
                }
              }
            }
            if (chunk.choices?.[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason;
          } catch {}
        }
        
        firstResult = {
          choices: [{
            finish_reason: finishReason,
            message: {
              role: "assistant",
              content: messageContent || null,
              tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
            }
          }]
        };
      } else {
        firstResult = await firstCall.json();
      }
      
      const choice = firstResult.choices?.[0];

      // If AI wants to call tool(s)
      if (choice?.finish_reason === "tool_calls" || choice?.message?.tool_calls?.length > 0) {
        const toolCalls = choice.message.tool_calls || [];
        const toolResults: string[] = [];

        for (const tc of toolCalls) {
          const fnName = tc.function?.name;
          let fnArgs: any = {};
          try { fnArgs = JSON.parse(tc.function?.arguments || "{}"); } catch {}
          console.log(`Executing tool: ${fnName}`, fnArgs);
          const result = await executeWriteAction(fnName, fnArgs);
          toolResults.push(result);
        }

        // Now stream final response with tool results
        const followUpMsgs = [
          ...msgs,
          choice.message,
          ...toolCalls.map((tc: any, i: number) => ({
            role: "tool",
            tool_call_id: tc.id,
            content: toolResults[i],
          })),
        ];

        const r2 = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: followUpMsgs, stream: true, max_tokens: 4000 }),
        });
        if (!r2.ok) throw new Error(`AI follow-up error: ${r2.status}`);
        return new Response(r2.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
      }

      // No tool call — AI just wants to respond. Stream it.
      // Since we already consumed the response, re-stream it as SSE
      const content = choice?.message?.content || "I'm here to help!";
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const words = content.split(' ');
          let i = 0;
          const interval = setInterval(() => {
            if (i >= words.length) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              clearInterval(interval);
              return;
            }
            const chunk = (i === 0 ? '' : ' ') + words[i];
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`));
            i++;
          }, 15);
        }
      });
      return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
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

    // ========== ACTIONS ==========

    if (action === "daily_briefing") {
      const briefingPrompt = isSuperAdmin
        ? `Generate COMPREHENSIVE daily briefing using ONLY the data provided below. Data:\n${dataCtx}\n\nInclude:\n1. 🌅 GOOD MORNING\n2. 🏦 FINANCIAL PULSE\n3. 🎯 TARGET STATUS\n4. 🔥 URGENT NOW\n5. 📋 TOP 10 TASKS\n6. 💰 REVENUE OPPORTUNITIES\n7. ⚠️ RISK RADAR\n8. 🔍 MISTAKES FOUND\n9. 👥 TEAM STATUS\n10. 🎯 SUCCESS =\n\nIMPORTANT: If any section has 0 records, say "No data available".`
        : `Generate daily work briefing for ${user_name || 'team member'} in ${userVertical} ONLY. Data:\n${dataCtx}\n\nInclude:\n1. 🌅 GOOD MORNING!\n2. 🎯 YOUR TARGETS\n3. 📋 YOUR TASKS\n4. 📞 WHO TO CALL\n5. 💪 TIPS\n6. 🔔 REMINDERS\n\nONLY use data from above. NO financial data. NO other teams.`;
      return streamAI([{ role: "system", content: sysPrompt }, { role: "user", content: briefingPrompt }]);

    } else if (action === "suggest_tasks") {
      if (!isSuperAdmin) {
        return new Response(JSON.stringify({ error: "Access restricted" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await callAI(
        [{ role: "system", content: sysPrompt }, { role: "user", content: `Data:\n${ctx}\n\nGenerate 15-20 specific tasks from ACTUAL data.` }],
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
      // Build messages with conversation history for context
      const msgs: any[] = [{ role: "system", content: sysPrompt + `\n\nYou have WRITE capabilities. When the user asks you to add a lead, update a client, set follow-up, etc., use the available tools to ACTUALLY perform the action in the database. After performing the action, confirm what you did with exact details.\n\nYou can:\n- add_insurance_lead: Add new insurance client/lead\n- update_insurance_client: Update existing client info\n- add_general_lead: Add lead to main leads table\n- set_follow_up: Set follow-up date\n- update_lead_status: Update lead status/priority` }];
      
      if (conversation_history && Array.isArray(conversation_history)) {
        for (const msg of conversation_history.slice(-8)) {
          msgs.push({ role: msg.role, content: msg.content });
        }
      }

      const searchResults = await targetedSearch(question || "", SB, h, isSuperAdmin ? null : userVertical);
      const fullContext = dataCtx + searchResults;
      
      const workStyle = isRenewalQuestion(question)
        ? `Respond like a serious renewal operations manager. Format EXACTLY in 4 sections: 1) Summary, 2) Priority table, 3) Call-first list, 4) Immediate next steps.`
        : `Respond like a serious work assistant: give exact answer first, then ordered priorities, then next actions. If user asks to ADD/CREATE/INSERT a lead or client, USE THE TOOLS to actually do it.`;

      msgs.push({ role: "user", content: `Here is the ACTUAL live database data AND targeted search results. Use ONLY this data to answer. ${workStyle}\n\n${fullContext}\n\nQuestion: ${question || "What should I focus on right now?"}` });
      
      return streamAIWithTools(msgs);

    } else if (action === "generate_report") {
      if (!isSuperAdmin) {
        // Team members get personal report only
        const personalPrompt = `Generate PERSONAL performance report for ${user_name} in ${userVertical} using ONLY this data:\n${dataCtx}\n\nFormat as a clean markdown report with:\n1. 📊 YOUR PERFORMANCE SUMMARY\n2. 🎯 TARGETS vs ACHIEVEMENT (table)\n3. 📋 PENDING TASKS\n4. 💡 IMPROVEMENT AREAS\n5. 💰 YOUR INCENTIVE ESTIMATE\n\nNO company financials. NO other team data. ONLY their personal data.`;
        return streamAI([{ role: "system", content: sysPrompt }, { role: "user", content: personalPrompt }]);
      }

      const reportPrompt = `Generate a detailed ${body.report_type || 'performance'} report using ONLY the data below:\n${dataCtx}\n\nReport requirements:\n1. 📊 EXECUTIVE SUMMARY with exact numbers\n2. 🎯 TARGET vs ACHIEVEMENT table\n3. 💰 REVENUE BREAKDOWN by vertical\n4. 📈 LEAD FUNNEL\n5. 🛡️ INSURANCE PIPELINE (exact records)\n6. 🚗 SELF-DRIVE STATUS\n7. 🏷️ HSRP ORDERS\n8. 🏆 TOP PERFORMERS\n9. ⚠️ RISKS & ACTION ITEMS\n10. 📋 RECOMMENDATIONS\n\nFormat as a professional markdown report with tables. ONLY use real data.`;
      return streamAI([{ role: "system", content: sysPrompt }, { role: "user", content: reportPrompt }]);

    } else if (action === "scan_risks") {
      if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Access restricted" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const data = await callAI(
        [{ role: "system", content: sysPrompt + "\n\nScan ALL business data for REAL risks." },
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
      if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Access restricted" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const data = await callAI(
        [{ role: "system", content: sysPrompt + "\n\nFind cross-sell opportunities from ACTUAL customer data only." },
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
      if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Access restricted" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Access restricted" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await fetch(`${SB}/rest/v1/ai_runway_snapshots`, { method: "POST", headers: { ...h, Prefer: "return=minimal" },
        body: JSON.stringify({ snapshot_date: today, total_revenue: totalRevenue, total_expenses: totalExpenses, net_profit: netProfit, cash_in_bank: cashInBank, monthly_burn_rate: monthlyBurn, runway_months: runwayMonths }) });
      return streamAI([
        { role: "system", content: sysPrompt },
        { role: "user", content: `Analyze financial health using EXACT data:\n${ctx}\n\nGive:\n1. 🏦 FINANCIAL HEALTH SCORE\n2. 💰 CASH FLOW ANALYSIS\n3. ⚠️ RUNWAY ALERT\n4. 📉 EXPENSE OPTIMIZATION\n5. 📈 REVENUE ACCELERATION\n6. 📋 ACTION PLAN` }
      ]);

    } else if (action === "investor_prep") {
      if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Access restricted" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return streamAI([
        { role: "system", content: sysPrompt },
        { role: "user", content: `Prepare investor readiness using EXACT data:\n${ctx}\n\nGive: Key metrics, strengths, gaps, ideal investor profile, email template, pitch deck outline.` }
      ]);

    } else if (action === "ecommerce_autopilot") {
      if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Access restricted" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return streamAI([
        { role: "system", content: sysPrompt },
        { role: "user", content: `E-commerce autopilot analysis using EXACT data:\n${ctx}\n\nGive: Inventory status, pricing, new products, sales analytics, shipping, revenue boosters.` }
      ]);

    } else if (action === "solve_problem") {
      if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Access restricted" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const pd = problem_data || {};
      const data = await callAI(
        [{ role: "system", content: sysPrompt + "\n\nSolve with data-driven solutions." },
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
        { role: "user", content: `Coach ${body.member_name || ''} (${body.member_vertical || ''}) using EXACT data:\n${dataCtx}\n\nGive personal daily plan with exact tasks from actual data.` }
      ]);

    } else if (action === "set_targets") {
      if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Access restricted" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Access restricted" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
