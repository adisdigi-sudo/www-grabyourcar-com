import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.startsWith("91") && digits.length === 12) return digits.slice(2);
  return digits.slice(-10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Backend auth service not configured");
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { phone } = await req.json();
    const cleanPhone = normalizePhone(String(phone ?? ""));

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = `91${cleanPhone}@grabyourcar.app`;
    const password = `wa_${cleanPhone}_gyc2024`;

    let userId: string | null = null;
    let created = false;

    // Step 1: Try to create the user
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        phone: `91${cleanPhone}`,
        auth_method: "whatsapp_otp",
      },
    });

    if (!createError && createdUser?.user) {
      userId = createdUser.user.id;
      created = true;
      console.log("Shadow account created:", email);
    } else {
      const message = (createError?.message || "").toLowerCase();
      const isAlreadyRegistered =
        message.includes("already registered") ||
        message.includes("already been registered") ||
        message.includes("already exists");

      if (!isAlreadyRegistered) {
        console.error("Unexpected create error:", createError?.message);
        throw createError ?? new Error("Failed to create shadow account");
      }

      // Step 2: User exists — use generateLink to get user ID instantly (no pagination!)
      console.log("User exists, fetching via generateLink:", email);
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

      if (linkError || !linkData?.user?.id) {
        console.error("generateLink failed:", linkError?.message);
        // Fallback: try direct REST API call to get user
        const restRes = await fetch(
          `${SUPABASE_URL}/auth/v1/admin/users?filter=email%20eq%20${encodeURIComponent(email)}`,
          {
            headers: {
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              apikey: SUPABASE_SERVICE_ROLE_KEY,
            },
          }
        );
        if (restRes.ok) {
          const restData = await restRes.json();
          const users = restData?.users || restData || [];
          const found = Array.isArray(users) ? users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase()) : null;
          if (found?.id) {
            userId = found.id;
          }
        }

        if (!userId) {
          throw new Error("Could not find existing user account");
        }
      } else {
        userId = linkData.user.id;
      }

      // Step 3: Check if this user is an admin/super_admin — if so, do NOT reset their password
      let isAdminUser = false;
      if (userId) {
        const { data: roles } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        const { data: crmUser } = await admin
          .from("crm_users")
          .select("role")
          .eq("auth_user_id", userId);
        
        isAdminUser = 
          (roles || []).some((r: any) => ["admin", "super_admin"].includes(r.role)) ||
          (crmUser || []).some((r: any) => r.role === "admin");
      }

      if (isAdminUser) {
        console.log("Skipping password reset for admin user:", userId);
        // Only ensure email is confirmed, don't touch password
        await admin.auth.admin.updateUserById(userId!, {
          email_confirm: true,
        });
      } else {
        // Reset password so credentials are deterministic for guest users
        console.log("Updating password for guest user:", userId);
        const { error: updateError } = await admin.auth.admin.updateUserById(userId!, {
          password,
          email_confirm: true,
          user_metadata: {
            phone: `91${cleanPhone}`,
            auth_method: "whatsapp_otp",
          },
        });

        if (updateError) {
          console.error("Password update failed:", updateError.message);
          throw updateError;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, created, user_id: userId, email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("ensure-shadow-account error:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
