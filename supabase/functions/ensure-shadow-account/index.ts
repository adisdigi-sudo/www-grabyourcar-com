import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    } else {
      const message = (createError?.message || "").toLowerCase();
      const isAlreadyRegistered =
        message.includes("already registered") ||
        message.includes("already been registered") ||
        message.includes("already exists");

      if (!isAlreadyRegistered) {
        throw createError ?? new Error("Failed to create shadow account");
      }

      let page = 1;
      const perPage = 200;

      while (!userId) {
        const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page, perPage });
        if (listError) throw listError;

        const users = listed?.users ?? [];
        const found = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) {
          userId = found.id;
          break;
        }

        if (users.length < perPage) break;
        page += 1;
      }

      if (!userId) {
        throw new Error("Existing account found but user lookup failed");
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          phone: `91${cleanPhone}`,
          auth_method: "whatsapp_otp",
        },
      });

      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, created, user_id: userId, email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
