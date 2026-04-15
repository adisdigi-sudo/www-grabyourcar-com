import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      return new Response(
        JSON.stringify({ error: "WhatsApp OTP not configured — Meta API credentials missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Database not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, phone, otp }: { action: "send" | "verify"; phone: string; otp?: string } = await req.json();

    // Normalize phone
    const cleanPhone = phone?.replace(/\D/g, "").replace(/^0+/, "");
    let normalizedPhone = cleanPhone;
    if (cleanPhone?.startsWith("91") && cleanPhone.length === 12) {
      normalizedPhone = cleanPhone.slice(2);
    }

    if (!normalizedPhone || !/^[6-9]\d{9}$/.test(normalizedPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number. Enter a valid 10-digit mobile number." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const phoneKey = `91${normalizedPhone}`;

    if (action === "send") {
      // Rate limiting: check if OTP was sent in last 60s
      const { data: recent } = await supabase
        .from("whatsapp_otps")
        .select("created_at")
        .eq("phone", phoneKey)
        .gte("created_at", new Date(Date.now() - 60 * 1000).toISOString())
        .limit(1);

      if (recent && recent.length > 0) {
        return new Response(
          JSON.stringify({ error: "OTP already sent. Please wait before requesting again.", cooldown: true }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete old OTPs for this phone
      await supabase.from("whatsapp_otps").delete().eq("phone", phoneKey);

      const newOtp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Store OTP in database
      const { error: insertError } = await supabase.from("whatsapp_otps").insert({
        phone: phoneKey,
        otp_code: newOtp,
        expires_at: expiresAt,
      });

      if (insertError) {
        console.error("Failed to store OTP:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate OTP" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send OTP via Meta Cloud API
      const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneKey,
        type: "template",
        template: {
          name: "otp",
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: newOtp }],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: newOtp }],
            },
          ],
        },
      };

      console.log("Sending OTP via Meta API:", { phone: phoneKey });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log("Meta API OTP response:", result);

      if (!response.ok || result.error) {
        console.error("Meta API OTP error:", result);
        await supabase.from("whatsapp_otps").delete().eq("phone", phoneKey);
        return new Response(
          JSON.stringify({ error: "Failed to send OTP. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "OTP sent to your WhatsApp" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "verify") {
      if (!otp) {
        return new Response(
          JSON.stringify({ error: "OTP is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: stored, error: fetchError } = await supabase
        .from("whatsapp_otps")
        .select("*")
        .eq("phone", phoneKey)
        .single();

      if (fetchError || !stored) {
        return new Response(
          JSON.stringify({ error: "OTP expired or not found. Please request a new one.", expired: true }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (new Date(stored.expires_at) < new Date()) {
        await supabase.from("whatsapp_otps").delete().eq("id", stored.id);
        return new Response(
          JSON.stringify({ error: "OTP has expired. Please request a new one.", expired: true }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (stored.attempts >= 3) {
        await supabase.from("whatsapp_otps").delete().eq("id", stored.id);
        return new Response(
          JSON.stringify({ error: "Too many failed attempts. Please request a new OTP.", maxAttempts: true }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (stored.otp_code !== otp.trim()) {
        await supabase.from("whatsapp_otps").update({ attempts: stored.attempts + 1 }).eq("id", stored.id);
        return new Response(
          JSON.stringify({ error: "Invalid OTP. Please try again.", attemptsLeft: 3 - (stored.attempts + 1) }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verified — delete OTP
      await supabase.from("whatsapp_otps").delete().eq("id", stored.id);
      console.log("OTP verified:", { phone: phoneKey });

      return new Response(
        JSON.stringify({ success: true, verified: true, message: "Phone number verified!" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'send' or 'verify'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("OTP error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
