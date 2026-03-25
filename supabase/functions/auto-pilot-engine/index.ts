import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const WA_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const WA_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { agent_type, manual } = await req.json();
    if (!agent_type) throw new Error("agent_type required");

    // Check if agent is enabled (skip check for manual triggers)
    const { data: config } = await supabase
      .from("auto_pilot_config")
      .select("*")
      .eq("agent_type", agent_type)
      .single();

    if (!manual && !config?.is_enabled) {
      return jsonResponse({ status: "skipped", reason: "Agent is disabled" });
    }

    // Log start
    const { data: logEntry } = await supabase
      .from("auto_pilot_logs")
      .insert({ agent_type, status: "running" })
      .select("id")
      .single();

    let result: AgentResult;
    try {
      switch (agent_type) {
        case "morning_briefing":
          result = await runMorningBriefing(supabase, LOVABLE_API_KEY, WA_TOKEN, WA_PHONE_ID);
          break;
        case "evening_report":
          result = await runEveningReport(supabase, LOVABLE_API_KEY, WA_TOKEN, WA_PHONE_ID, config?.recipient_phones);
          break;
        case "stale_lead_checker":
          result = await runStaleLeadChecker(supabase, WA_TOKEN, WA_PHONE_ID);
          break;
        case "auto_quote":
          result = await runAutoQuote(supabase, LOVABLE_API_KEY, WA_TOKEN, WA_PHONE_ID);
          break;
        case "weekly_pl":
          result = await runWeeklyPL(supabase, LOVABLE_API_KEY, WA_TOKEN, WA_PHONE_ID, config?.recipient_phones);
          break;
        default:
          throw new Error(`Unknown agent: ${agent_type}`);
      }
    } catch (agentError) {
      const errMsg = agentError instanceof Error ? agentError.message : "Agent execution failed";
      await supabase.from("auto_pilot_logs").update({
        status: "failed", error_message: errMsg,
        execution_time_ms: Date.now() - startTime, completed_at: new Date().toISOString(),
      }).eq("id", logEntry?.id);

      await supabase.from("auto_pilot_config").update({
        last_run_at: new Date().toISOString(), last_run_status: "failed",
      }).eq("agent_type", agent_type);

      throw agentError;
    }

    const executionTime = Date.now() - startTime;

    await supabase.from("auto_pilot_logs").update({
      status: "success", summary: result.summary, details: result.details,
      messages_sent: result.messagesSent || 0, execution_time_ms: executionTime,
      completed_at: new Date().toISOString(),
    }).eq("id", logEntry?.id);

    await supabase.from("auto_pilot_config").update({
      last_run_at: new Date().toISOString(), last_run_status: "success",
      total_runs: (config?.total_runs || 0) + 1,
    }).eq("agent_type", agent_type);

    return jsonResponse({ status: "success", ...result, execution_time_ms: executionTime });
  } catch (error) {
    console.error("Auto-pilot error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});

// ===== Types =====
interface AgentResult {
  summary: string;
  messagesSent: number;
  details: Record<string, unknown>;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ===== WhatsApp Helper =====
async function sendWhatsApp(phone: string, message: string, token?: string | null, phoneId?: string | null): Promise<boolean> {
  if (!token || !phoneId) {
    console.log(`[WA SKIP] No credentials. Would send to ${phone}`);
    return false;
  }

  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
  if (!cleanPhone.startsWith("91")) cleanPhone = "91" + cleanPhone;

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to: cleanPhone,
        type: "text", text: { body: message },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`WA send failed to ${cleanPhone}:`, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`WA error to ${cleanPhone}:`, e);
    return false;
  }
}

// ===== AI Helper =====
async function generateAI(prompt: string, apiKey?: string | null): Promise<string> {
  if (!apiKey) return prompt;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are GrabYourCar's business intelligence assistant. Be concise, use emojis, format for WhatsApp readability. Use ₹ for currency, Indian number formatting. Write in professional Hinglish." },
          { role: "user", content: prompt },
        ],
        max_tokens: 1500,
      }),
    });
    if (!res.ok) throw new Error(`AI error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || prompt;
  } catch (e) {
    console.error("AI generation failed:", e);
    return prompt;
  }
}

// ===== AGENT: Morning Briefing =====
async function runMorningBriefing(supabase: any, aiKey?: string | null, waToken?: string | null, waPhoneId?: string | null): Promise<AgentResult> {
  const today = new Date().toISOString().split("T")[0];

  const { data: members } = await supabase
    .from("team_members").select("id, user_id, name, phone, vertical_id")
    .eq("is_active", true).not("phone", "is", null);

  if (!members?.length) return { summary: "No active team members found", messagesSent: 0, details: {} };

  let messagesSent = 0;
  const memberDetails: any[] = [];

  for (const member of members) {
    const memberId = member.user_id || member.id;

    const { data: assignedLeads } = await supabase
      .from("leads").select("id, customer_name, status, priority, updated_at")
      .eq("assigned_to", memberId)
      .in("status", ["new", "contacted", "interested", "quoted"])
      .order("priority", { ascending: true }).limit(20);

    const { data: followUps } = await supabase
      .from("leads").select("id, customer_name, phone")
      .eq("assigned_to", memberId)
      .gte("follow_up_date", today).lte("follow_up_date", today + "T23:59:59").limit(10);

    const leads = assignedLeads || [];
    const newLeads = leads.filter((l: any) => l.status === "new").length;
    const hotLeads = leads.filter((l: any) => l.priority === "high").length;
    const staleLeads = leads.filter((l: any) => (Date.now() - new Date(l.updated_at).getTime()) / 86400000 > 2).length;
    const fups = followUps || [];

    const prompt = `Generate a morning briefing WhatsApp message for "${member.name}":
- Total active leads: ${leads.length}
- New untouched: ${newLeads}
- High priority: ${hotLeads}
- Stale (2+ days): ${staleLeads}
- Follow-ups due today: ${fups.length}
${fups.length ? `Follow-up names: ${fups.map((f: any) => f.customer_name).join(", ")}` : ""}
Start with "🌅 Good Morning ${member.name}!" Include motivational line and target for the day.`;

    const message = await generateAI(prompt, aiKey);
    if (member.phone) {
      const sent = await sendWhatsApp(member.phone, message, waToken, waPhoneId);
      if (sent) messagesSent++;
    }
    memberDetails.push({ member: member.name, leads: leads.length, followUps: fups.length, hot: hotLeads });
  }

  return {
    summary: `Morning briefing sent to ${messagesSent}/${members.length} team members`,
    messagesSent, details: { members: memberDetails },
  };
}

// ===== AGENT: Evening Report =====
async function runEveningReport(supabase: any, aiKey?: string | null, waToken?: string | null, waPhoneId?: string | null, phones?: string[]): Promise<AgentResult> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const since = todayStart.toISOString();

  const [leadsRes, dealsRes, insuranceRes, callsRes] = await Promise.all([
    supabase.from("leads").select("id, status, source, priority", { count: "exact" }).gte("created_at", since),
    supabase.from("deals").select("id, deal_value, deal_status, payment_received_amount").gte("created_at", since),
    supabase.from("insurance_clients").select("id, lead_status", { count: "exact" }).gte("created_at", since),
    supabase.from("call_logs").select("id, duration_seconds", { count: "exact" }).gte("created_at", since),
  ]);

  const leads = leadsRes.data || [];
  const deals = dealsRes.data || [];
  const insurance = insuranceRes.data || [];
  const calls = callsRes.data || [];
  const closedDeals = deals.filter((d: any) => d.deal_status === "closed");
  const todayRevenue = closedDeals.reduce((s: number, d: any) => s + (d.payment_received_amount || d.deal_value || 0), 0);

  const sourceBreakdown = leads.reduce((acc: any, l: any) => {
    acc[l.source || "unknown"] = (acc[l.source || "unknown"] || 0) + 1;
    return acc;
  }, {});

  const prompt = `Generate an evening business report for GrabYourCar founder:
📊 TODAY'S METRICS:
- New Leads: ${leads.length} (High priority: ${leads.filter((l: any) => l.priority === "high").length})
- Sources: ${JSON.stringify(sourceBreakdown)}
- Deals Created: ${deals.length}
- Deals Closed: ${closedDeals.length}
- Revenue Collected: ₹${todayRevenue.toLocaleString("en-IN")}
- Insurance Leads: ${insurance.length}
- Calls Made: ${calls.length} (${Math.round(calls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / 60)} mins total)
Start with "🌙 Day End Report — GrabYourCar". Include insights and tomorrow's focus.`;

  const message = await generateAI(prompt, aiKey);
  let messagesSent = 0;
  const founderPhone = phones?.[0] || "9855924442";
  if (await sendWhatsApp(founderPhone, message, waToken, waPhoneId)) messagesSent++;

  return {
    summary: `Evening: ${leads.length} leads, ${closedDeals.length} closed, ₹${todayRevenue.toLocaleString("en-IN")} revenue`,
    messagesSent,
    details: { leads: leads.length, deals: deals.length, closedDeals: closedDeals.length, revenue: todayRevenue, insurance: insurance.length, calls: calls.length },
  };
}

// ===== AGENT: Stale Lead Checker =====
async function runStaleLeadChecker(supabase: any, waToken?: string | null, waPhoneId?: string | null): Promise<AgentResult> {
  const staleThreshold = new Date(Date.now() - 4 * 3600000).toISOString();

  const { data: staleLeads } = await supabase
    .from("leads").select("id, customer_name, phone, status, priority, assigned_to, updated_at, service_category")
    .in("status", ["new", "contacted"])
    .lt("updated_at", staleThreshold)
    .order("priority", { ascending: true }).limit(30);

  if (!staleLeads?.length) return { summary: "No stale leads found ✅", messagesSent: 0, details: { totalStale: 0 } };

  let messagesSent = 0;
  const escalated: string[] = [];

  // Group by assignee
  const byAssignee: Record<string, any[]> = {};
  for (const lead of staleLeads) {
    const key = lead.assigned_to || "unassigned";
    if (!byAssignee[key]) byAssignee[key] = [];
    byAssignee[key].push(lead);
  }

  // Send alerts to assigned team members
  for (const [assigneeId, leads] of Object.entries(byAssignee)) {
    if (assigneeId === "unassigned") continue;

    const { data: members } = await supabase
      .from("team_members").select("name, phone")
      .eq("user_id", assigneeId).limit(1);

    const member = members?.[0];
    if (!member?.phone) continue;

    const highPriority = leads.filter((l: any) => l.priority === "high");
    const msg = `🔔 *Stale Lead Alert*\n\nHi ${member.name}, you have *${leads.length} leads* pending action:\n${highPriority.length ? `⚡ ${highPriority.length} HIGH PRIORITY\n` : ""}\n${leads.slice(0, 5).map((l: any, i: number) => `${i + 1}. ${l.customer_name} (${l.status}) — ${l.service_category || "General"}`).join("\n")}\n${leads.length > 5 ? `\n+${leads.length - 5} more` : ""}\n\n⏰ Follow up NOW!\n— GYC Auto-Pilot 🤖`;

    if (await sendWhatsApp(member.phone, msg, waToken, waPhoneId)) messagesSent++;
  }

  return {
    summary: `Found ${staleLeads.length} stale leads. ${messagesSent} alerts sent.`,
    messagesSent,
    details: { totalStale: staleLeads.length, byAssignee: Object.fromEntries(Object.entries(byAssignee).map(([k, v]) => [k, v.length])) },
  };
}

// ===== AGENT: Auto Quote =====
async function runAutoQuote(supabase: any, aiKey?: string | null, waToken?: string | null, waPhoneId?: string | null): Promise<AgentResult> {
  const since = new Date(Date.now() - 30 * 60000).toISOString();

  const { data: interestedLeads } = await supabase
    .from("leads").select("id, customer_name, phone, service_category, city, notes")
    .eq("status", "interested")
    .gte("updated_at", since)
    .is("quote_sent_at", null)
    .not("phone", "is", null)
    .limit(10);

  if (!interestedLeads?.length) return { summary: "No new interested leads for quoting", messagesSent: 0, details: { total: 0 } };

  let messagesSent = 0;
  const quoted: string[] = [];

  for (const lead of interestedLeads) {
    const prompt = `Generate a professional WhatsApp intro message for:
- Customer: ${lead.customer_name}
- Interest: ${lead.service_category || "Car Services"}
- City: ${lead.city || "Not specified"}
- Notes: ${lead.notes?.substring(0, 200) || "None"}
Be warm, professional. Mention GrabYourCar. Offer to share detailed quote. Add call-to-action. Don't make up prices.`;

    const message = await generateAI(prompt, aiKey);
    if (lead.phone && await sendWhatsApp(lead.phone, message, waToken, waPhoneId)) {
      messagesSent++;
      quoted.push(lead.customer_name);
      await supabase.from("leads").update({ quote_sent_at: new Date().toISOString() }).eq("id", lead.id);
    }
  }

  return {
    summary: `Auto-quoted ${messagesSent}/${interestedLeads.length} interested leads`,
    messagesSent, details: { quoted, total: interestedLeads.length },
  };
}

// ===== AGENT: Weekly P&L =====
async function runWeeklyPL(supabase: any, aiKey?: string | null, waToken?: string | null, waPhoneId?: string | null, phones?: string[]): Promise<AgentResult> {
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString();

  const [dealsRes, invoicesRes, billsRes, leadsRes] = await Promise.all([
    supabase.from("deals").select("id, deal_value, deal_status, vertical_name, payment_received_amount").gte("created_at", weekStart),
    supabase.from("invoices").select("id, total_amount, status, vertical_name").gte("created_at", weekStart),
    supabase.from("bills").select("id, total_amount, status").gte("created_at", weekStart),
    supabase.from("leads").select("id, status", { count: "exact" }).gte("created_at", weekStart),
  ]);

  const deals = dealsRes.data || [];
  const invoices = invoicesRes.data || [];
  const bills = billsRes.data || [];
  const leads = leadsRes.data || [];

  const totalRevenue = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
  const totalExpenses = bills.reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const closedDeals = deals.filter((d: any) => d.deal_status === "closed");

  const revenueByVertical = invoices.filter((i: any) => i.status === "paid").reduce((acc: any, i: any) => {
    const v = i.vertical_name || "Other";
    acc[v] = (acc[v] || 0) + (i.total_amount || 0);
    return acc;
  }, {});

  const prompt = `Generate Weekly P&L WhatsApp report for GrabYourCar founder:
📊 WEEKLY FINANCIAL SUMMARY:
- Revenue (Paid): ₹${totalRevenue.toLocaleString("en-IN")}
- Expenses: ₹${totalExpenses.toLocaleString("en-IN")}
- Net Profit: ₹${netProfit.toLocaleString("en-IN")} ${netProfit >= 0 ? "✅" : "🔴"}
- Revenue by Vertical: ${JSON.stringify(Object.fromEntries(Object.entries(revenueByVertical).map(([k, v]) => [k, `₹${(v as number).toLocaleString("en-IN")}`])))}
📈 OPERATIONAL:
- New Leads: ${leads.length}
- Deals Closed: ${closedDeals.length}
- Conversion: ${leads.length > 0 ? Math.round((closedDeals.length / leads.length) * 100) : 0}%
Start with "📊 Weekly P&L — GrabYourCar". Include 3 action items for next week.`;

  const message = await generateAI(prompt, aiKey);
  let messagesSent = 0;
  const founderPhone = phones?.[0] || "9855924442";
  if (await sendWhatsApp(founderPhone, message, waToken, waPhoneId)) messagesSent++;

  return {
    summary: `Weekly P&L: Revenue ₹${totalRevenue.toLocaleString("en-IN")}, Net ₹${netProfit.toLocaleString("en-IN")}`,
    messagesSent,
    details: { revenue: totalRevenue, expenses: totalExpenses, netProfit, revenueByVertical, leads: leads.length, dealsClosed: closedDeals.length },
  };
}
