import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAuthenticatedUser(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Unauthorized");
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) throw new Error("Unauthorized");
  return user;
}

async function resolveTenantId(supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("No tenant configured");
  return data.id;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const user = await getAuthenticatedUser(req, supabaseUrl, anonKey);

    // Resolve tenant (single-tenant fallback)
    const tenantId = await resolveTenantId(supabase);

    const body = await req.json();
    const { action, ...payload } = body;

    // Role check helper
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id)
      .in("role", ["super_admin", "admin"]).maybeSingle();
    const { data: crmUser } = await supabase
      .from("crm_users").select("role").eq("auth_user_id", user.id).maybeSingle();
    const { data: allVerts } = await supabase.from("vertical_pipelines").select("vertical_name");
    const isAdmin = !!roleRow || crmUser?.role === "admin";
    const verticalAccess = [...new Set((allVerts || []).map((v: any) => v.vertical_name))];

    switch (action) {
      // ─── REVENUE METRICS ───
      case "get_revenue_metrics": {
        const { vertical_name, executive_id } = payload;

        let targetVerticals: string[] = [];
        if (vertical_name) {
          if (!isAdmin && !verticalAccess.includes(vertical_name)) throw new Error("Access denied");
          targetVerticals = [vertical_name];
        } else if (isAdmin) {
          const { data: allV } = await supabase.from("vertical_pipelines").select("vertical_name");
          targetVerticals = [...new Set((allV || []).map((v: any) => v.vertical_name))];
        } else {
          targetVerticals = verticalAccess;
        }

        const effectiveExecId = isAdmin ? (executive_id || null) : (verticalAccess.length > 0 ? executive_id : user.id);

        const now = new Date();
        const verticalMetrics: Record<string, any> = {};

        for (const vn of targetVerticals) {
          const { data: stages } = await supabase
            .from("vertical_pipelines").select("*").eq("vertical_name", vn).order("stage_order");
          const finalStages = (stages || []).filter((s: any) => s.is_final_stage).map((s: any) => s.stage_name);
          const lostStages = (stages || []).filter((s: any) => s.is_lost_stage).map((s: any) => s.stage_name);

          const { data: statusRows } = await supabase
            .from("customer_vertical_status")
            .select("*, customer:master_customers(id, assigned_to, created_at)")
            .eq("vertical_name", vn)
            .eq("tenant_id", tenantId);

          let rows = (statusRows || []).filter((r: any) => r.customer);
          if (effectiveExecId) rows = rows.filter((r: any) => r.customer.assigned_to === effectiveExecId);

          const totalLeads = rows.length;
          const finalCount = rows.filter((r: any) => finalStages.includes(r.current_stage)).length;
          const lostCount = rows.filter((r: any) => lostStages.includes(r.current_stage)).length;

          const conversionRate = totalLeads > 0 ? Math.round((finalCount / totalLeads) * 10000) / 100 : 0;
          const lossRate = totalLeads > 0 ? Math.round((lostCount / totalLeads) * 10000) / 100 : 0;

          let avgDaysToClose = 0;
          if (finalCount > 0) {
            const finalCustomerIds = rows
              .filter((r: any) => finalStages.includes(r.current_stage))
              .map((r: any) => r.customer_id);

            if (finalCustomerIds.length > 0) {
              const { data: historyRows } = await supabase
                .from("vertical_pipeline_history")
                .select("customer_id, changed_at, new_stage")
                .eq("vertical_name", vn)
                .eq("tenant_id", tenantId)
                .in("customer_id", finalCustomerIds)
                .order("changed_at", { ascending: true });

              const customerDays: number[] = [];
              const grouped: Record<string, any[]> = {};
              (historyRows || []).forEach((h: any) => {
                if (!grouped[h.customer_id]) grouped[h.customer_id] = [];
                grouped[h.customer_id].push(h);
              });

              for (const [cid, entries] of Object.entries(grouped)) {
                const first = entries[0];
                const last = entries.find((e: any) => finalStages.includes(e.new_stage));
                if (first && last) {
                  customerDays.push(daysBetween(first.changed_at, last.changed_at));
                }
              }

              if (customerDays.length > 0) {
                avgDaysToClose = Math.round((customerDays.reduce((a, b) => a + b, 0) / customerDays.length) * 10) / 10;
              }
            }
          }

          // Avg days stuck per stage
          const stageAvgDays: Record<string, number> = {};
          const { data: allHistory } = await supabase
            .from("vertical_pipeline_history")
            .select("customer_id, previous_stage, new_stage, changed_at")
            .eq("vertical_name", vn)
            .eq("tenant_id", tenantId)
            .order("changed_at", { ascending: true });

          const stagedurations: Record<string, number[]> = {};
          const customerHistory: Record<string, any[]> = {};
          (allHistory || []).forEach((h: any) => {
            if (!customerHistory[h.customer_id]) customerHistory[h.customer_id] = [];
            customerHistory[h.customer_id].push(h);
          });

          for (const entries of Object.values(customerHistory)) {
            for (let i = 0; i < entries.length - 1; i++) {
              const stage = entries[i].new_stage;
              const daysInStage = daysBetween(entries[i].changed_at, entries[i + 1].changed_at);
              if (!stagedurations[stage]) stagedurations[stage] = [];
              stagedurations[stage].push(daysInStage);
            }
          }

          for (const [stage, durations] of Object.entries(stagedurations)) {
            stageAvgDays[stage] = Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10;
          }

          verticalMetrics[vn] = {
            total_leads: totalLeads,
            final_count: finalCount,
            lost_count: lostCount,
            conversion_rate: conversionRate,
            loss_rate: lossRate,
            avg_days_to_close: avgDaysToClose,
            avg_days_per_stage: stageAvgDays,
          };
        }

        // Per-executive breakdown
        let executiveMetrics: any[] = [];
        if (isAdmin || verticalAccess.length > 0) {
          let execQuery = supabase.from("crm_users").select("*").eq("is_active", true);
          if (effectiveExecId) execQuery = execQuery.eq("auth_user_id", effectiveExecId);
          const { data: executives } = await execQuery;

          for (const exec of (executives || [])) {
            let totalAssigned = 0, totalFinal = 0, totalLost = 0, totalOverdue = 0;
            let totalCallsForClosed = 0;

            for (const vn of targetVerticals) {
              const { data: sRows } = await supabase
                .from("customer_vertical_status")
                .select("current_stage, customer_id, customer:master_customers(assigned_to)")
                .eq("vertical_name", vn)
                .eq("tenant_id", tenantId);
              const execRows = (sRows || []).filter((r: any) => r.customer?.assigned_to === exec.auth_user_id);

              const { data: stagesData } = await supabase
                .from("vertical_pipelines").select("stage_name, is_final_stage, is_lost_stage").eq("vertical_name", vn);
              const fStages = (stagesData || []).filter((s: any) => s.is_final_stage).map((s: any) => s.stage_name);
              const lStages = (stagesData || []).filter((s: any) => s.is_lost_stage).map((s: any) => s.stage_name);

              totalAssigned += execRows.length;
              const finalRows = execRows.filter((r: any) => fStages.includes(r.current_stage));
              totalFinal += finalRows.length;
              totalLost += execRows.filter((r: any) => lStages.includes(r.current_stage)).length;

              if (finalRows.length > 0) {
                const closedIds = finalRows.map((r: any) => r.customer_id);
                const { count } = await supabase
                  .from("customer_call_logs").select("id", { count: "exact" })
                  .eq("called_by", exec.auth_user_id)
                  .eq("tenant_id", tenantId)
                  .in("customer_id", closedIds);
                totalCallsForClosed += count || 0;
              }
            }

            const { count: overdueCount } = await supabase
              .from("master_customers").select("id", { count: "exact" })
              .eq("assigned_to", exec.auth_user_id)
              .eq("tenant_id", tenantId)
              .lt("next_followup_at", now.toISOString())
              .not("next_followup_at", "is", null);

            totalOverdue = overdueCount || 0;
            const convRate = totalAssigned > 0 ? Math.round((totalFinal / totalAssigned) * 10000) / 100 : 0;
            const avgCallsPerClosed = totalFinal > 0 ? Math.round((totalCallsForClosed / totalFinal) * 10) / 10 : 0;
            const overdueRatio = totalAssigned > 0 ? Math.round((totalOverdue / totalAssigned) * 10000) / 100 : 0;

            executiveMetrics.push({
              user_id: exec.auth_user_id,
              name: exec.name,
              email: exec.email,
              assigned_leads: totalAssigned,
              final_count: totalFinal,
              lost_count: totalLost,
              conversion_rate: convRate,
              avg_calls_per_closed: avgCallsPerClosed,
              overdue_count: totalOverdue,
              overdue_ratio: overdueRatio,
            });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          vertical_metrics: verticalMetrics,
          executive_metrics: executiveMetrics,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ─── AGING BUCKETS ───
      case "get_aging_buckets": {
        const { vertical_name, assigned_to: filterAssigned } = payload;

        if (vertical_name && !isAdmin && !verticalAccess.includes(vertical_name)) {
          throw new Error("Access denied");
        }

        const effectiveAssigned = isAdmin ? filterAssigned : (!verticalAccess.length ? user.id : filterAssigned);

        let query = supabase
          .from("customer_vertical_status")
          .select("current_stage, updated_at, customer_id, vertical_name, customer:master_customers(id, assigned_to, created_at)")
          .eq("tenant_id", tenantId);
        if (vertical_name) query = query.eq("vertical_name", vertical_name);
        const { data: rows, error } = await query;
        if (error) throw error;

        let filtered = (rows || []).filter((r: any) => r.customer);
        if (effectiveAssigned) filtered = filtered.filter((r: any) => r.customer.assigned_to === effectiveAssigned);

        const verticalNames = [...new Set(filtered.map((r: any) => r.vertical_name))];
        const terminalStages = new Set<string>();
        for (const vn of verticalNames) {
          const { data: stages } = await supabase
            .from("vertical_pipelines").select("stage_name, is_final_stage, is_lost_stage").eq("vertical_name", vn);
          (stages || []).forEach((s: any) => {
            if (s.is_final_stage || s.is_lost_stage) terminalStages.add(`${vn}:${s.stage_name}`);
          });
        }

        const activeRows = filtered.filter((r: any) => !terminalStages.has(`${r.vertical_name}:${r.current_stage}`));

        const now = new Date();
        const buckets = { "0-2 days": 0, "3-7 days": 0, "8-15 days": 0, "15+ days": 0 };
        const bucketDetails: Record<string, any[]> = { "0-2 days": [], "3-7 days": [], "8-15 days": [], "15+ days": [] };

        for (const row of activeRows) {
          const stageDate = row.updated_at || row.customer.created_at;
          const days = daysBetween(stageDate, now.toISOString());
          let bucket: string;
          if (days <= 2) bucket = "0-2 days";
          else if (days <= 7) bucket = "3-7 days";
          else if (days <= 15) bucket = "8-15 days";
          else bucket = "15+ days";

          buckets[bucket as keyof typeof buckets]++;
          bucketDetails[bucket].push({
            customer_id: row.customer_id,
            vertical_name: row.vertical_name,
            current_stage: row.current_stage,
            days_in_stage: Math.round(days * 10) / 10,
          });
        }

        return new Response(JSON.stringify({
          success: true,
          buckets,
          total_active: activeRows.length,
          details: bucketDetails,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    const status = error.message === "Unauthorized" ? 401 : 400;
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
