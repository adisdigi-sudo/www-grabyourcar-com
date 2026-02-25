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

    switch (action) {
      // ─── CREATE CUSTOMER ───
      case "create": {
        const { name, phone, email, city, source, primary_vertical, multi_vertical_tags, assigned_to } = payload;
        if (!name || !phone) throw new Error("Name and phone are required");

        // Duplicate check
        const { data: existing } = await supabase
          .from("master_customers")
          .select("id, name, phone")
          .eq("phone", phone)
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
          .single();
        if (error) throw error;

        // Pipeline history
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

        // Remove action from updates
        delete updates.action;

        const { data, error } = await supabase
          .from("master_customers")
          .update(updates)
          .eq("id", customerId)
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
          .eq("customer_id", customerId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, statuses: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_vertical_stage": {
        const { customerId, vertical_name, new_stage } = payload;
        if (!customerId || !vertical_name || !new_stage) throw new Error("customerId, vertical_name, and new_stage are required");

        // Upsert: insert if not exists, update if exists
        const { data: existing } = await supabase
          .from("customer_vertical_status")
          .select("*")
          .eq("customer_id", customerId)
          .eq("vertical_name", vertical_name)
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
          // First time — also log history manually since trigger only fires on UPDATE
          ({ data, error } = await supabase
            .from("customer_vertical_status")
            .insert({ customer_id: customerId, vertical_name, current_stage: new_stage })
            .select()
            .single());

          if (!error) {
            await supabase.from("vertical_pipeline_history").insert({
              customer_id: customerId, vertical_name, previous_stage: null, new_stage, changed_by: user.id,
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
          .order("changed_at", { ascending: false });
        if (vertical_name) query = query.eq("vertical_name", vertical_name);
        const { data, error } = await query;
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, history: data }), {
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
