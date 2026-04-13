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

    // All actions require super_admin auth

    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !caller) throw new Error("Unauthorized");

    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const isSuperAdmin = callerRoles?.some((r: any) => r.role === "super_admin");
    if (!isSuperAdmin) throw new Error("Only super admins can manage users");

    switch (action) {
      case "create_user": {
        const { username, displayName, phone, role, verticalIds, designation, department } = payload;
        const email = `${username}@grabyourcar.app`;
        const password = payload.password || `${username}@Gyc2026`;

        // Create auth user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { display_name: displayName, username },
        });
        if (createError) throw createError;

        const userId = newUser.user.id;

        // Create team member
        await supabase.from("team_members").insert({
          user_id: userId,
          username,
          display_name: displayName,
          phone: phone || null,
          designation: designation || null,
          department: department || null,
          role_tier: payload.roleTier || "caller",
          reporting_to: payload.reportingTo || null,
          is_active: true,
          created_by: caller.id,
        });

        // Assign role
        await supabase.from("user_roles").insert({
          user_id: userId,
          role,
          email,
        });

        // Assign vertical access with access_level
        if (verticalIds?.length) {
          const accessLevels = payload.accessLevels || {};
          const accessRows = verticalIds.map((vid: string) => ({
            user_id: userId,
            vertical_id: vid,
            access_level: accessLevels[vid] || "member",
            granted_by: caller.id,
          }));
          await supabase.from("user_vertical_access").insert(accessRows);
        }

        return new Response(JSON.stringify({
          success: true,
          user: { id: userId, email, username, displayName },
          credentials: { username: `${username}@grabyourcar`, password },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "update_user": {
        const { userId, role, verticalIds, isActive, displayName, phone, designation, department } = payload;

        // Update team member
        const updates: any = {};
        if (displayName !== undefined) updates.display_name = displayName;
        if (phone !== undefined) updates.phone = phone;
        if (isActive !== undefined) updates.is_active = isActive;
        if (designation !== undefined) updates.designation = designation;
        if (department !== undefined) updates.department = department;
        if (payload.roleTier !== undefined) updates.role_tier = payload.roleTier;
        if (payload.reportingTo !== undefined) updates.reporting_to = payload.reportingTo || null;

        if (Object.keys(updates).length > 0) {
          await supabase.from("team_members").update(updates).eq("user_id", userId);
        }

        // Update role if changed
        if (role) {
          await supabase.from("user_roles").delete().eq("user_id", userId);
          await supabase.from("user_roles").insert({ user_id: userId, role });
        }

        // Update vertical access if provided
        if (verticalIds) {
          await supabase.from("user_vertical_access").delete().eq("user_id", userId);
          if (verticalIds.length > 0) {
            const accessLevels = payload.accessLevels || {};
            const accessRows = verticalIds.map((vid: string) => ({
              user_id: userId,
              vertical_id: vid,
              access_level: accessLevels[vid] || "member",
              granted_by: caller.id,
            }));
            await supabase.from("user_vertical_access").insert(accessRows);
          }
        }

        // Ban/unban user
        if (isActive !== undefined) {
          if (!isActive) {
            await supabase.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
          } else {
            await supabase.auth.admin.updateUserById(userId, { ban_duration: "none" });
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        const { userId } = payload;
        // Delete from team_members, user_roles, user_vertical_access (cascade should handle)
        await supabase.from("user_vertical_access").delete().eq("user_id", userId);
        await supabase.from("user_roles").delete().eq("user_id", userId);
        await supabase.from("team_members").delete().eq("user_id", userId);
        await supabase.auth.admin.deleteUser(userId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        const { userId, newPassword } = payload;
        const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_users": {
        // Get all team members with their roles and vertical access
        const { data: members } = await supabase
          .from("team_members")
          .select("*")
          .order("created_at", { ascending: false });

        const { data: roles } = await supabase
          .from("user_roles")
          .select("*");

        const { data: access } = await supabase
          .from("user_vertical_access")
          .select("*, business_verticals(name, slug, color, icon)");

        const { data: verticals } = await supabase
          .from("business_verticals")
          .select("*")
          .eq("is_active", true)
          .order("sort_order");

        // Merge data
        const users = (members || []).map((m: any) => ({
          ...m,
          roles: (roles || []).filter((r: any) => r.user_id === m.user_id),
          verticalAccess: (access || []).filter((a: any) => a.user_id === m.user_id),
        }));

        return new Response(JSON.stringify({ success: true, users, verticals }), {
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
