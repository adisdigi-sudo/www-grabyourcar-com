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
  return { user, authHeader };
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user } = await getAuthenticatedUser(req, supabaseUrl, anonKey);

    const body = await req.json();
    const { action, ...payload } = body;

    // Resolve tenant (single-tenant fallback)
    const tenantId = await resolveTenantId(supabase);

    switch (action) {
      // ─── CREATE CUSTOMER ───
      case "create": {
        const { name, phone, email, city, source, primary_vertical, multi_vertical_tags, assigned_to } = payload;
        if (!name || !phone) throw new Error("Name and phone are required");

        // Duplicate check within tenant
        const { data: existing } = await supabase
          .from("master_customers")
          .select("id, name, phone")
          .eq("phone", phone)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({
            success: false,
            error: "Duplicate phone number",
            existing_customer: existing,
          }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { data, error } = await supabase.from("master_customers").insert({
          name, phone, email, city, source, primary_vertical,
          multi_vertical_tags: multi_vertical_tags || [],
          assigned_to: assigned_to || user.id,
          tenant_id: tenantId,
        }).select().single();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, customer: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── LIST CUSTOMERS ───
      case "list": {
        const { page = 1, limit = 50, status, vertical, search, assigned_to, lifecycle_stage } = payload;
        let query = supabase
          .from("master_customers")
          .select("*", { count: "exact" })
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (status) query = query.eq("status", status);
        if (vertical) query = query.eq("primary_vertical", vertical);
        if (assigned_to) query = query.eq("assigned_to", assigned_to);
        if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
        if (lifecycle_stage) query = query.eq("lifecycle_stage", lifecycle_stage);

        const { data, error, count } = await query;
        if (error) throw error;

        return new Response(JSON.stringify({ success: true, customers: data, total: count, page, limit }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── GET SINGLE CUSTOMER ───
      case "get": {
        const { customerId } = payload;
        if (!customerId) throw new Error("customerId is required");

        const { data: customer, error } = await supabase
          .from("master_customers")
          .select("*")
          .eq("id", customerId)
          .eq("tenant_id", tenantId)
          .single();
        if (error) throw error;

        const { data: pipeline } = await supabase
          .from("pipeline_history")
          .select("*")
          .eq("customer_id", customerId)
          .order("changed_at", { ascending: false });

        const { data: activities } = await supabase
          .from("customer_activity_logs")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(50);

        return new Response(JSON.stringify({ success: true, customer, pipeline_history: pipeline || [], activities: activities || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── UPDATE CUSTOMER ───
      case "update": {
        const { customerId, ...updates } = payload;
        if (!customerId) throw new Error("customerId is required");
        delete updates.action;

        const { data, error } = await supabase
          .from("master_customers")
          .update(updates)
          .eq("id", customerId)
          .eq("tenant_id", tenantId)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, customer: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── ADD ACTIVITY LOG ───
      case "add_activity": {
        const { customerId, activity_type, notes } = payload;
        if (!customerId || !activity_type) throw new Error("customerId and activity_type are required");

        const { data, error } = await supabase.from("customer_activity_logs").insert({
          customer_id: customerId,
          activity_type,
          notes,
          performed_by: user.id,
        }).select().single();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, activity: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── LIST CUSTOMERS BY VERTICAL PIPELINE STAGE ───
      case "list_by_vertical_stage": {
        const { vertical_name, stage, assigned_to, search, is_final, is_lost } = payload;
        if (!vertical_name) throw new Error("vertical_name is required");

        const { data: stagesMeta } = await supabase
          .from("vertical_pipelines")
          .select("stage_name, is_final_stage, is_lost_stage")
          .eq("vertical_name", vertical_name);

        let stageFilter: string[] | null = null;
        if (is_final === true) {
          stageFilter = (stagesMeta || []).filter((s: any) => s.is_final_stage).map((s: any) => s.stage_name);
        } else if (is_lost === true) {
          stageFilter = (stagesMeta || []).filter((s: any) => s.is_lost_stage).map((s: any) => s.stage_name);
        } else if (stage) {
          stageFilter = [stage];
        }

        let query = supabase
          .from("customer_vertical_status")
          .select("*, customer:master_customers(*)")
          .eq("vertical_name", vertical_name)
          .eq("tenant_id", tenantId);

        if (stageFilter && stageFilter.length > 0) {
          query = query.in("current_stage", stageFilter);
        }

        const { data: statusRows, error } = await query;
        if (error) throw error;

        let customers = (statusRows || [])
          .filter((row: any) => row.customer)
          .map((row: any) => ({
            ...row.customer,
            vertical_stage: row.current_stage,
            vertical_status_id: row.id,
          }));

        if (assigned_to) {
          customers = customers.filter((c: any) => c.assigned_to === assigned_to);
        }
        if (search) {
          const s = search.toLowerCase();
          customers = customers.filter((c: any) =>
            c.name?.toLowerCase().includes(s) ||
            c.phone?.includes(s) ||
            c.email?.toLowerCase().includes(s)
          );
        }

        customers.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return new Response(JSON.stringify({
          success: true,
          customers,
          stages: stagesMeta || [],
          total: customers.length,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── GET VERTICAL PIPELINE STAGES ───
      case "get_pipeline_stages": {
        const { vertical_name } = payload;
        if (!vertical_name) throw new Error("vertical_name is required");
        const { data, error } = await supabase
          .from("vertical_pipelines")
          .select("*")
          .eq("vertical_name", vertical_name)
          .order("stage_order", { ascending: true });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, stages: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── GET/SET CUSTOMER VERTICAL STATUS ───
      case "get_vertical_status": {
        const { customerId } = payload;
        if (!customerId) throw new Error("customerId is required");
        const { data, error } = await supabase
          .from("customer_vertical_status")
          .select("*")
          .eq("customer_id", customerId)
          .eq("tenant_id", tenantId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, statuses: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_vertical_stage": {
        const { customerId, vertical_name, new_stage } = payload;
        if (!customerId || !vertical_name || !new_stage) throw new Error("customerId, vertical_name, and new_stage are required");

        const { data: existing } = await supabase
          .from("customer_vertical_status")
          .select("*")
          .eq("customer_id", customerId)
          .eq("vertical_name", vertical_name)
          .eq("tenant_id", tenantId)
          .maybeSingle();

        let data, error;
        if (existing) {
          ({ data, error } = await supabase
            .from("customer_vertical_status")
            .update({ current_stage: new_stage })
            .eq("id", existing.id)
            .select()
            .single());
        } else {
          ({ data, error } = await supabase
            .from("customer_vertical_status")
            .insert({ customer_id: customerId, vertical_name, current_stage: new_stage, tenant_id: tenantId })
            .select()
            .single());

          if (!error) {
            await supabase.from("vertical_pipeline_history").insert({
              customer_id: customerId, vertical_name, previous_stage: null, new_stage, changed_by: user.id, tenant_id: tenantId,
            });
            await supabase.from("customer_activity_logs").insert({
              customer_id: customerId, activity_type: "vertical_stage_set",
              notes: `${vertical_name}: Initial stage → ${new_stage}`, performed_by: user.id,
            });
          }
        }
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, status: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── GET VERTICAL PIPELINE HISTORY ───
      case "get_vertical_history": {
        const { customerId, vertical_name } = payload;
        if (!customerId) throw new Error("customerId is required");
        let query = supabase
          .from("vertical_pipeline_history")
          .select("*")
          .eq("customer_id", customerId)
          .eq("tenant_id", tenantId)
          .order("changed_at", { ascending: false });
        if (vertical_name) query = query.eq("vertical_name", vertical_name);
        const { data, error } = await query;
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, history: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── SCHEDULE FOLLOW-UP ───
      case "schedule_followup": {
        const { customerId, next_followup_at, notes } = payload;
        if (!customerId || !next_followup_at) throw new Error("customerId and next_followup_at are required");

        const { data, error } = await supabase
          .from("master_customers")
          .update({ next_followup_at })
          .eq("id", customerId)
          .eq("tenant_id", tenantId)
          .select()
          .single();
        if (error) throw error;

        await supabase.from("customer_activity_logs").insert({
          customer_id: customerId,
          activity_type: "followup_scheduled",
          notes: notes || `Follow-up scheduled for ${next_followup_at}`,
          performed_by: user.id,
        });

        return new Response(JSON.stringify({ success: true, customer: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── LOG CALL ───
      case "log_call": {
        const { customerId, call_status, call_notes, call_duration } = payload;
        if (!customerId || !call_status) throw new Error("customerId and call_status are required");

        const { data: roleRow } = await supabase
          .from("user_roles").select("role").eq("user_id", user.id)
          .in("role", ["super_admin", "admin"]).maybeSingle();

        if (!roleRow) {
          const { data: customerCheck } = await supabase
            .from("master_customers")
            .select("id")
            .eq("id", customerId)
            .eq("assigned_to", user.id)
            .eq("tenant_id", tenantId)
            .maybeSingle();
          if (!customerCheck) throw new Error("You can only log calls for customers assigned to you");
        }

        const { data: callLog, error: callError } = await supabase
          .from("customer_call_logs")
          .insert({
            customer_id: customerId,
            call_status,
            call_notes,
            call_duration: call_duration || null,
            called_by: user.id,
            tenant_id: tenantId,
          })
          .select()
          .single();
        if (callError) throw callError;

        await supabase
          .from("master_customers")
          .update({ last_contacted_at: new Date().toISOString() })
          .eq("id", customerId)
          .eq("tenant_id", tenantId);

        await supabase.from("customer_activity_logs").insert({
          customer_id: customerId,
          activity_type: "call_logged",
          notes: `Call: ${call_status}${call_notes ? ' — ' + call_notes : ''}`,
          performed_by: user.id,
        });

        return new Response(JSON.stringify({ success: true, call_log: callLog }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── GET OVERDUE FOLLOW-UPS ───
      case "get_overdue_followups": {
        const { vertical_name, assigned_to } = payload;
        const now = new Date().toISOString();

        let query = supabase
          .from("master_customers")
          .select("*")
          .eq("tenant_id", tenantId)
          .lt("next_followup_at", now)
          .not("next_followup_at", "is", null)
          .order("next_followup_at", { ascending: true });

        if (assigned_to) query = query.eq("assigned_to", assigned_to);

        const { data: customers, error } = await query;
        if (error) throw error;

        let result = customers || [];

        if (vertical_name && result.length > 0) {
          const customerIds = result.map((c: any) => c.id);
          const { data: verticalRows } = await supabase
            .from("customer_vertical_status")
            .select("customer_id")
            .eq("vertical_name", vertical_name)
            .eq("tenant_id", tenantId)
            .in("customer_id", customerIds);
          const verticalCustomerIds = new Set((verticalRows || []).map((r: any) => r.customer_id));
          result = result.filter((c: any) => verticalCustomerIds.has(c.id));
        }

        return new Response(JSON.stringify({ success: true, customers: result, total: result.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── GET CALL LOGS ───
      case "get_call_logs": {
        const { customerId } = payload;
        if (!customerId) throw new Error("customerId is required");
        const { data, error } = await supabase
          .from("customer_call_logs")
          .select("*")
          .eq("customer_id", customerId)
          .eq("tenant_id", tenantId)
          .order("called_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, call_logs: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── DASHBOARD METRICS ───
      case "get_dashboard_metrics": {
        const { vertical_name, assigned_to: filterAssignedTo } = payload;

        // Role check
        const { data: roleRow } = await supabase
          .from("user_roles").select("role").eq("user_id", user.id)
          .in("role", ["super_admin", "admin"]).maybeSingle();
        const { data: crmUser } = await supabase
          .from("crm_users").select("role").eq("auth_user_id", user.id).maybeSingle();
        const { data: allVerts } = await supabase.from("vertical_pipelines").select("vertical_name");
        const isAdmin = !!roleRow || crmUser?.role === "admin";
        const verticalAccess = [...new Set((allVerts || []).map((v: any) => v.vertical_name))];

        let effectiveVerticals: string[] = [];
        if (vertical_name) {
          if (!isAdmin && !verticalAccess.includes(vertical_name)) throw new Error("Access denied to this vertical");
          effectiveVerticals = [vertical_name];
        } else if (isAdmin) {
          const { data: allVerts } = await supabase.from("vertical_pipelines").select("vertical_name");
          effectiveVerticals = [...new Set((allVerts || []).map((v: any) => v.vertical_name))];
        } else {
          effectiveVerticals = verticalAccess;
        }

        const effectiveAssignedTo = isAdmin ? filterAssignedTo : (verticalAccess.length > 0 ? filterAssignedTo : user.id);

        const now = new Date().toISOString();
        const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();

        const metrics: any = { verticals: {} };

        for (const vn of effectiveVerticals) {
          const { data: stages } = await supabase
            .from("vertical_pipelines").select("*").eq("vertical_name", vn).order("stage_order");
          const finalStages = (stages || []).filter((s: any) => s.is_final_stage).map((s: any) => s.stage_name);
          const lostStages = (stages || []).filter((s: any) => s.is_lost_stage).map((s: any) => s.stage_name);

          let statusQuery = supabase
            .from("customer_vertical_status").select("current_stage, customer:master_customers(id, assigned_to)")
            .eq("vertical_name", vn)
            .eq("tenant_id", tenantId);
          const { data: statusRows } = await statusQuery;

          let rows = (statusRows || []).filter((r: any) => r.customer);
          if (effectiveAssignedTo) rows = rows.filter((r: any) => r.customer.assigned_to === effectiveAssignedTo);

          const stageBreakdown: Record<string, number> = {};
          (stages || []).forEach((s: any) => { stageBreakdown[s.stage_name] = 0; });
          rows.forEach((r: any) => { stageBreakdown[r.current_stage] = (stageBreakdown[r.current_stage] || 0) + 1; });

          const totalLeads = rows.length;
          const doneCount = rows.filter((r: any) => finalStages.includes(r.current_stage)).length;
          const lostCount = rows.filter((r: any) => lostStages.includes(r.current_stage)).length;

          const customerIds = rows.map((r: any) => r.customer.id);
          let overdueCount = 0;
          if (customerIds.length > 0) {
            const { data: overdueRows } = await supabase
              .from("master_customers").select("id")
              .eq("tenant_id", tenantId)
              .lt("next_followup_at", now)
              .not("next_followup_at", "is", null).in("id", customerIds);
            overdueCount = (overdueRows || []).length;
          }

          metrics.verticals[vn] = {
            total_leads: totalLeads,
            stage_breakdown: stageBreakdown,
            done_clients: doneCount,
            lost_clients: lostCount,
            overdue_followups: overdueCount,
          };
        }

        // Calls today
        let callQuery = supabase
          .from("customer_call_logs").select("called_by", { count: "exact" })
          .eq("tenant_id", tenantId)
          .gte("called_at", todayISO);
        if (effectiveAssignedTo) callQuery = callQuery.eq("called_by", effectiveAssignedTo);
        const { count: totalCallsToday } = await callQuery;

        // Followups scheduled today
        const tomorrowStart = new Date(todayStart); tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
        let fuQuery = supabase
          .from("master_customers").select("id", { count: "exact" })
          .eq("tenant_id", tenantId)
          .gte("next_followup_at", todayISO).lt("next_followup_at", tomorrowStart.toISOString());
        if (effectiveAssignedTo) fuQuery = fuQuery.eq("assigned_to", effectiveAssignedTo);
        const { count: followupsToday } = await fuQuery;

        metrics.total_calls_today = totalCallsToday || 0;
        metrics.followups_scheduled_today = followupsToday || 0;

        return new Response(JSON.stringify({ success: true, metrics }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── EXECUTIVE PERFORMANCE ───
      case "get_executive_performance": {
        const { vertical_name, executive_id } = payload;

        const { data: roleRow } = await supabase
          .from("user_roles").select("role").eq("user_id", user.id)
          .in("role", ["super_admin", "admin"]).maybeSingle();
        const { data: crmUser } = await supabase
          .from("crm_users").select("role").eq("auth_user_id", user.id).maybeSingle();
        const { data: allVerts } = await supabase.from("vertical_pipelines").select("vertical_name");
        const isAdmin = !!roleRow || crmUser?.role === "admin";
        const verticalAccess = [...new Set((allVerts || []).map((v: any) => v.vertical_name))];

        const targetId = isAdmin ? (executive_id || null) : user.id;

        if (!isAdmin && vertical_name && !verticalAccess.includes(vertical_name)) {
          throw new Error("Access denied to this vertical");
        }

        let execQuery = supabase.from("crm_users").select("*").eq("is_active", true);
        if (targetId) execQuery = execQuery.eq("auth_user_id", targetId);
        if (!isAdmin && !targetId && vertical_name) {
          // No per-user vertical_access column in current crm_users schema.
        }
        const { data: executives } = await execQuery;

        const now = new Date().toISOString();
        const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();

        let finalStages: string[] = [];
        let lostStages: string[] = [];
        if (vertical_name) {
          const { data: stages } = await supabase
            .from("vertical_pipelines").select("stage_name, is_final_stage, is_lost_stage")
            .eq("vertical_name", vertical_name);
          finalStages = (stages || []).filter((s: any) => s.is_final_stage).map((s: any) => s.stage_name);
          lostStages = (stages || []).filter((s: any) => s.is_lost_stage).map((s: any) => s.stage_name);
        }

        const performanceData = [];

        for (const exec of (executives || [])) {
            const { count: assignedLeads } = await supabase
              .from("master_customers").select("id", { count: "exact" })
              .eq("assigned_to", exec.auth_user_id)
            .eq("tenant_id", tenantId);

          const { count: overdueFollowups } = await supabase
            .from("master_customers").select("id", { count: "exact" })
            .eq("assigned_to", exec.auth_user_id)
            .eq("tenant_id", tenantId)
            .lt("next_followup_at", now).not("next_followup_at", "is", null);

          const { count: callsToday } = await supabase
            .from("customer_call_logs").select("id", { count: "exact" })
            .eq("called_by", exec.auth_user_id)
            .eq("tenant_id", tenantId)
            .gte("called_at", todayISO);

          let finalCount = 0, lostCount = 0;
          if (vertical_name) {
            const { data: vertRows } = await supabase
              .from("customer_vertical_status")
              .select("current_stage, customer:master_customers(assigned_to)")
              .eq("vertical_name", vertical_name)
              .eq("tenant_id", tenantId);
            const execRows = (vertRows || []).filter((r: any) => r.customer?.assigned_to === exec.auth_user_id);
            finalCount = execRows.filter((r: any) => finalStages.includes(r.current_stage)).length;
            lostCount = execRows.filter((r: any) => lostStages.includes(r.current_stage)).length;
          }

          performanceData.push({
            user_id: exec.auth_user_id,
            name: exec.name,
            email: exec.email,
            assigned_leads: assignedLeads || 0,
            overdue_followups: overdueFollowups || 0,
            calls_today: callsToday || 0,
            leads_final_stage: finalCount,
            leads_lost: lostCount,
          });
        }

        return new Response(JSON.stringify({ success: true, performance: performanceData }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    const status = error.message === "Unauthorized" ? 401 : 400;
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
