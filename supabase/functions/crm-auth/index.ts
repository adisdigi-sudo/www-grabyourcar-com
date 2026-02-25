import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, ...payload } = body;

    switch (action) {
      // ─── LOGIN ───
      case "login": {
        const { email, password } = payload;
        const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
        const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const userId = data.user.id;

        // Get role
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);

        // Get CRM profile
        const { data: profile } = await supabase
          .from("crm_users")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        return new Response(JSON.stringify({
          success: true,
          user: {
            id: userId,
            email: data.user.email,
            name: profile?.name || data.user.user_metadata?.display_name || "",
            role: roles?.[0]?.role || null,
            vertical_access: profile?.vertical_access || [],
            is_active: profile?.is_active ?? true,
          },
          session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ─── CREATE USER (Super Admin only) ───
      case "create_user": {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Unauthorized");

        const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
        const { data: { user: caller } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
        if (!caller) throw new Error("Unauthorized");

        const { data: callerRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", caller.id);
        if (!callerRoles?.some((r: any) => r.role === "super_admin")) {
          throw new Error("Only super admins can create users");
        }

        const { name, email, password, role, vertical_access } = payload;

        // Create auth user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { display_name: name },
        });
        if (createError) throw createError;

        const userId = newUser.user.id;

        // Create CRM profile
        await supabase.from("crm_users").insert({
          user_id: userId,
          name,
          email,
          vertical_access: vertical_access || [],
        });

        // Assign role
        await supabase.from("user_roles").insert({
          user_id: userId,
          role,
          email,
        });

        return new Response(JSON.stringify({
          success: true,
          user: { id: userId, name, email, role, vertical_access },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ─── LIST USERS (Super Admin only) ───
      case "list_users": {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Unauthorized");

        const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
        const { data: { user: caller } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
        if (!caller) throw new Error("Unauthorized");

        const { data: callerRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", caller.id);
        if (!callerRoles?.some((r: any) => r.role === "super_admin")) {
          throw new Error("Only super admins can list users");
        }

        const { data: users } = await supabase
          .from("crm_users")
          .select("*")
          .order("created_at", { ascending: false });

        const { data: roles } = await supabase.from("user_roles").select("*");

        const enriched = (users || []).map((u: any) => ({
          ...u,
          role: roles?.find((r: any) => r.user_id === u.user_id)?.role || null,
        }));

        return new Response(JSON.stringify({ success: true, users: enriched }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── UPDATE USER ───
      case "update_user": {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Unauthorized");

        const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
        const { data: { user: caller } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
        if (!caller) throw new Error("Unauthorized");

        const { data: callerRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", caller.id);
        if (!callerRoles?.some((r: any) => r.role === "super_admin")) {
          throw new Error("Only super admins can update users");
        }

        const { userId, name, role, vertical_access, is_active } = payload;

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (vertical_access !== undefined) updates.vertical_access = vertical_access;
        if (is_active !== undefined) updates.is_active = is_active;

        if (Object.keys(updates).length > 0) {
          await supabase.from("crm_users").update(updates).eq("user_id", userId);
        }

        if (role) {
          await supabase.from("user_roles").delete().eq("user_id", userId);
          await supabase.from("user_roles").insert({ user_id: userId, role });
        }

        if (is_active !== undefined) {
          if (!is_active) {
            await supabase.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
          } else {
            await supabase.auth.admin.updateUserById(userId, { ban_duration: "none" });
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── DELETE USER ───
      case "delete_user": {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Unauthorized");

        const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
        const { data: { user: caller } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
        if (!caller) throw new Error("Unauthorized");

        const { data: callerRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", caller.id);
        if (!callerRoles?.some((r: any) => r.role === "super_admin")) {
          throw new Error("Only super admins can delete users");
        }

        const { userId } = payload;
        await supabase.from("crm_users").delete().eq("user_id", userId);
        await supabase.from("user_roles").delete().eq("user_id", userId);
        await supabase.auth.admin.deleteUser(userId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── RESET PASSWORD ───
      case "reset_password": {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Unauthorized");

        const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
        const { data: { user: caller } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
        if (!caller) throw new Error("Unauthorized");

        const { data: callerRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", caller.id);
        if (!callerRoles?.some((r: any) => r.role === "super_admin")) {
          throw new Error("Only super admins can reset passwords");
        }

        const { userId, newPassword } = payload;
        const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
