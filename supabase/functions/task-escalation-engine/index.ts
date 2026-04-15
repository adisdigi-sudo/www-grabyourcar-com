import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Task Escalation Engine
 * Checks overdue tasks and escalates up: Caller → TL → Manager → HR → Founder
 * Also generates daily reports and sends email summaries.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { action } = await req.json();

    if (action === "check_escalations") {
      return jsonResponse(await checkAndEscalate(supabase));
    } else if (action === "generate_daily_reports") {
      return jsonResponse(await generateDailyReports(supabase));
    } else {
      return jsonResponse({ error: "Unknown action. Use: check_escalations, generate_daily_reports" }, 400);
    }
  } catch (error) {
    console.error("Task escalation error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ===== Escalation Hierarchy =====
const ESCALATION_TIERS = ["self", "team_leader", "manager", "hr", "founder"];
const ESCALATION_THRESHOLDS_HOURS = [0, 24, 48, 72, 96]; // hours overdue before next escalation

async function checkAndEscalate(supabase: any) {
  const now = new Date();
  let escalated = 0;
  let emailsSent = 0;

  // Get all pending/in-progress tasks that have a due date
  const { data: tasks } = await supabase
    .from("ai_cofounder_tasks")
    .select("*")
    .in("status", ["pending", "approved"])
    .not("due_date", "is", null)
    .lt("due_date", now.toISOString());

  if (!tasks?.length) return { summary: "No overdue tasks", escalated: 0, emailsSent: 0 };

  for (const task of tasks) {
    const dueDate = new Date(task.due_date);
    const hoursOverdue = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60);
    const currentLevel = task.escalation_level || 0;

    // Determine if escalation is needed
    let newLevel = currentLevel;
    for (let i = ESCALATION_TIERS.length - 1; i >= 0; i--) {
      if (hoursOverdue >= ESCALATION_THRESHOLDS_HOURS[i] && i > currentLevel) {
        newLevel = i;
        break;
      }
    }

    if (newLevel <= currentLevel) continue;

    // Find who to escalate to
    const escalationTarget = await findEscalationTarget(supabase, task, newLevel);
    if (!escalationTarget) continue;

    // Build escalation chain
    const chain = [...(task.escalation_chain || []), {
      level: ESCALATION_TIERS[newLevel],
      escalated_to: escalationTarget.name,
      escalated_at: now.toISOString(),
      hours_overdue: Math.round(hoursOverdue),
    }];

    // Update task
    await supabase.from("ai_cofounder_tasks").update({
      escalation_level: newLevel,
      escalated_to: escalationTarget.name,
      escalated_at: now.toISOString(),
      escalation_chain: chain,
      is_overdue: true,
      visibility_tier: ESCALATION_TIERS[newLevel],
    }).eq("id", task.id);

    // Send escalation email if target has email
    if (escalationTarget.email) {
      try {
        const chainStr = chain.map((c: any) => c.escalated_to).join(" → ");
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "task-escalation-alert",
            recipientEmail: escalationTarget.email,
            idempotencyKey: `escalation-${task.id}-level${newLevel}`,
            templateData: {
              recipientName: escalationTarget.name,
              escalationLevel: ESCALATION_TIERS[newLevel].replace("_", " "),
              taskTitle: task.title,
              assignedTo: task.team_member_name || "Team Member",
              dueDate: dueDate.toLocaleDateString("en-IN"),
              overdueDays: Math.ceil(hoursOverdue / 24),
              escalationChain: chainStr,
            },
          },
        });
        emailsSent++;
      } catch (e) {
        console.error("Email escalation failed:", e);
      }
    }

    escalated++;
  }

  return { summary: `Escalated ${escalated} tasks, sent ${emailsSent} emails`, escalated, emailsSent };
}

async function findEscalationTarget(supabase: any, task: any, level: number): Promise<{ name: string; email?: string; phone?: string } | null> {
  const tier = ESCALATION_TIERS[level];

  if (tier === "founder") {
    return { name: "Founder", email: "founder@grabyourcar.com", phone: "9855924442" };
  }

  // Find the assigned user's team member record
  const assignedUserId = task.assigned_user_id || task.user_id;
  if (!assignedUserId) {
    // Fallback: try by team_member_name
    if (task.team_member_name) {
      const { data: member } = await supabase
        .from("team_members")
        .select("id, reporting_to, role_tier")
        .ilike("display_name", `%${task.team_member_name}%`)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (member?.reporting_to) {
        return await getManagerInfo(supabase, member.reporting_to, tier);
      }
    }
    return null;
  }

  // Get the assigned user's team_member record
  const { data: assignee } = await supabase
    .from("team_members")
    .select("id, reporting_to, role_tier")
    .eq("user_id", assignedUserId)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!assignee) return null;

  // Walk up the chain based on level
  let currentId = assignee.reporting_to;
  for (let step = 1; step < level && currentId; step++) {
    const { data: upper } = await supabase
      .from("team_members")
      .select("id, reporting_to")
      .eq("id", currentId)
      .single();
    currentId = upper?.reporting_to;
  }

  if (currentId) {
    return await getManagerInfo(supabase, currentId, tier);
  }

  // Fallback: find any person at this tier
  const { data: tierMember } = await supabase
    .from("team_members")
    .select("display_name, email, phone")
    .eq("role_tier", tier === "hr" ? "manager" : tier)
    .eq("is_active", true)
    .limit(1)
    .single();

  return tierMember ? { name: tierMember.display_name, email: tierMember.email, phone: tierMember.phone } : null;
}

async function getManagerInfo(supabase: any, memberId: string, _tier: string) {
  const { data } = await supabase
    .from("team_members")
    .select("display_name, email, phone")
    .eq("id", memberId)
    .single();

  return data ? { name: data.display_name, email: data.email, phone: data.phone } : null;
}

// ===== Daily Report Generator =====
async function generateDailyReports(supabase: any) {
  const today = new Date().toISOString().split("T")[0];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const since = todayStart.toISOString();

  // Get all active team members
  const { data: members } = await supabase
    .from("team_members")
    .select("id, user_id, display_name, email, phone, role_tier, reporting_to")
    .eq("is_active", true);

  if (!members?.length) return { summary: "No members", reports: 0, emailsSent: 0 };

  let reportsGenerated = 0;
  let emailsSent = 0;

  for (const member of members) {
    const memberId = member.user_id || member.id;

    // Get session data
    const { data: sessions } = await supabase
      .from("employee_sessions")
      .select("total_active_seconds, total_idle_seconds, total_break_seconds")
      .eq("user_id", memberId)
      .eq("session_date", today);

    const totalActive = sessions?.reduce((s: number, ses: any) => s + (ses.total_active_seconds || 0), 0) || 0;
    const totalIdle = sessions?.reduce((s: number, ses: any) => s + (ses.total_idle_seconds || 0), 0) || 0;
    const totalBreak = sessions?.reduce((s: number, ses: any) => s + (ses.total_break_seconds || 0), 0) || 0;

    // Get tasks
    const { data: tasks } = await supabase
      .from("ai_cofounder_tasks")
      .select("id, status, is_overdue")
      .or(`user_id.eq.${memberId},team_member_name.ilike.%${member.display_name}%`)
      .gte("created_at", since);

    const completed = tasks?.filter((t: any) => t.status === "completed").length || 0;
    const pending = tasks?.filter((t: any) => t.status === "pending").length || 0;
    const overdue = tasks?.filter((t: any) => t.is_overdue).length || 0;

    // Get leads
    const { data: leads } = await supabase
      .from("leads")
      .select("id, status")
      .eq("assigned_to", memberId)
      .gte("updated_at", since);

    const leadsHandled = leads?.length || 0;
    const followUpsDone = leads?.filter((l: any) => l.status === "contacted" || l.status === "interested").length || 0;

    // Calculate performance score (simple formula)
    const score = Math.min(100, Math.round(
      (completed * 15) + (leadsHandled * 5) + (followUpsDone * 10) +
      (totalActive > 0 ? Math.min(30, (totalActive / 3600) * 5) : 0) -
      (overdue * 10) - (totalBreak > 7200 ? 15 : 0)
    ));

    // Save report
    await supabase.from("employee_daily_reports").upsert({
      user_id: memberId,
      user_name: member.display_name,
      report_date: today,
      report_type: "daily",
      leads_handled: leadsHandled,
      calls_made: 0, // Would need call_logs integration
      follow_ups_done: followUpsDone,
      tasks_completed: completed,
      tasks_pending: pending,
      tasks_overdue: overdue,
      active_seconds: totalActive,
      idle_seconds: totalIdle,
      break_seconds: totalBreak,
      performance_score: Math.max(0, score),
    }, { onConflict: "user_id,report_date,report_type" });

    reportsGenerated++;

    // Send daily summary email to the employee
    if (member.email) {
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "daily-work-summary",
            recipientEmail: member.email,
            idempotencyKey: `daily-summary-${memberId}-${today}`,
            templateData: {
              name: member.display_name,
              date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
              leadsHandled, callsMade: 0, followUpsDone,
              tasksCompleted: completed, tasksPending: pending, tasksOverdue: overdue,
              activeHours: formatDuration(totalActive),
              idleHours: formatDuration(totalIdle),
              breakHours: formatDuration(totalBreak),
              score: Math.max(0, score),
            },
          },
        });
        emailsSent++;
      } catch (e) {
        console.error("Daily summary email failed:", e);
      }
    }
  }

  return { summary: `Generated ${reportsGenerated} reports, sent ${emailsSent} emails`, reports: reportsGenerated, emailsSent };
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
