import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FINBITE_V2_URL = "https://app.finbite.in/api/v2/whatsapp-business/messages";
const PHONE_NUMBER_ID = "1015140975005622";

// In-memory OTP store (for demo; in production use database)
const otpStore = new Map<string, { otp: string; expires: number; attempts: number }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanExpiredOTPs() {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (value.expires < now) otpStore.delete(key);
  }
}

interface OTPRequest {
  action: "send" | "verify";
  phone: string;
  otp?: string;
  name?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FINBITE_BEARER_TOKEN = Deno.env.get("FINBITE_BEARER_TOKEN");

    if (!FINBITE_BEARER_TOKEN) {
      console.error("Missing FINBITE_BEARER_TOKEN");
      return new Response(
        JSON.stringify({ error: "WhatsApp OTP not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, phone, otp, name }: OTPRequest = await req.json();

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
    cleanExpiredOTPs();

    if (action === "send") {
      // Rate limiting
      const existing = otpStore.get(phoneKey);
      if (existing && existing.expires > Date.now() + 4 * 60 * 1000) {
        return new Response(
          JSON.stringify({ error: "OTP already sent. Please wait before requesting again.", cooldown: true }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newOtp = generateOTP();
      otpStore.set(phoneKey, { otp: newOtp, expires: Date.now() + 5 * 60 * 1000, attempts: 0 });

      // Send OTP via Finbite v2 WhatsApp Business API
      const requestBody = {
        to: phoneKey,
        phoneNoId: PHONE_NUMBER_ID,
        type: "template",
        name: "otp",
        language: "en",
        bodyParams: [newOtp],
        buttons: [
          {
            type: "button",
            sub_type: "url",
            text: newOtp,
          },
        ],
      };

      console.log("Sending OTP via Finbite v2:", { phone: phoneKey, otp: newOtp });

      const response = await fetch(FINBITE_V2_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FINBITE_BEARER_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const result = await response.json();
        console.log("Finbite v2 response:", result);
        if (!response.ok || result.status === false || result.error) {
          console.error("Finbite v2 error:", result);
          return new Response(
            JSON.stringify({ error: "Failed to send OTP. Please try again." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        const textBody = await response.text();
        console.error("Finbite v2 non-JSON response:", textBody.substring(0, 200));
        return new Response(
          JSON.stringify({ error: "WhatsApp service temporarily unavailable. Please try again." }),
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

      const stored = otpStore.get(phoneKey);
      if (!stored) {
        return new Response(
          JSON.stringify({ error: "OTP expired or not found. Please request a new one.", expired: true }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (stored.expires < Date.now()) {
        otpStore.delete(phoneKey);
        return new Response(
          JSON.stringify({ error: "OTP has expired. Please request a new one.", expired: true }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (stored.attempts >= 3) {
        otpStore.delete(phoneKey);
        return new Response(
          JSON.stringify({ error: "Too many failed attempts. Please request a new OTP.", maxAttempts: true }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (stored.otp !== otp.trim()) {
        stored.attempts += 1;
        otpStore.set(phoneKey, stored);
        return new Response(
          JSON.stringify({ error: "Invalid OTP. Please try again.", attemptsLeft: 3 - stored.attempts }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      otpStore.delete(phoneKey);
      console.log("OTP verified successfully:", { phone: phoneKey });

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
