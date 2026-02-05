import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OTPRequest {
  action: "send" | "verify";
  email: string;
  userId: string;
  otp?: string;
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Database not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const resend = new Resend(RESEND_API_KEY);

    const { action, email, userId, otp }: OTPRequest = await req.json();

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: "Email and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send") {
      // Check if user is an admin
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesError) {
        console.error("Error checking user roles:", rolesError);
        return new Response(
          JSON.stringify({ error: "Failed to verify admin status" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isAdmin = roles?.some(r => r.role === "super_admin" || r.role === "admin");
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Unauthorized - Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete any existing OTPs for this user
      await supabase
        .from("admin_otps")
        .delete()
        .eq("user_id", userId);

      // Generate new OTP
      const newOtp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Store OTP in database
      const { error: insertError } = await supabase
        .from("admin_otps")
        .insert({
          user_id: userId,
          email: email,
          otp_code: newOtp,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error("Error storing OTP:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate OTP" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send OTP via email
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">🔐 Admin Verification</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">GrabYourCar Security</p>
            </div>
            <div style="padding: 32px 24px;">
              <p style="color: #333; font-size: 16px; margin: 0 0 24px;">Your one-time verification code is:</p>
              <div style="background: #f8f9fa; border: 2px dashed #e9ecef; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a2e; font-family: monospace;">${newOtp}</span>
              </div>
              <p style="color: #666; font-size: 14px; margin: 0 0 8px;">⏱️ This code expires in <strong>5 minutes</strong></p>
              <p style="color: #666; font-size: 14px; margin: 0;">🛡️ If you didn't request this, please secure your account immediately.</p>
            </div>
            <div style="background: #f8f9fa; padding: 16px 24px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} GrabYourCar. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const { error: emailError } = await resend.emails.send({
        from: "GrabYourCar Admin <noreply@grabyourcar.com>",
        to: [email],
        subject: "🔐 Your Admin Verification Code",
        html: emailHtml,
      });

      if (emailError) {
        console.error("Error sending email:", emailError);
        // Clean up the stored OTP if email fails
        await supabase.from("admin_otps").delete().eq("user_id", userId);
        return new Response(
          JSON.stringify({ error: "Failed to send verification email" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("OTP sent successfully to:", email);
      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent to your email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "verify") {
      if (!otp) {
        return new Response(
          JSON.stringify({ error: "OTP is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get stored OTP
      const { data: storedOtp, error: fetchError } = await supabase
        .from("admin_otps")
        .select("*")
        .eq("user_id", userId)
        .eq("email", email)
        .single();

      if (fetchError || !storedOtp) {
        return new Response(
          JSON.stringify({ error: "No verification code found. Please request a new one.", expired: true }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check expiry
      if (new Date(storedOtp.expires_at) < new Date()) {
        await supabase.from("admin_otps").delete().eq("id", storedOtp.id);
        return new Response(
          JSON.stringify({ error: "Verification code expired. Please request a new one.", expired: true }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check attempts (max 3)
      if (storedOtp.attempts >= 3) {
        await supabase.from("admin_otps").delete().eq("id", storedOtp.id);
        return new Response(
          JSON.stringify({ error: "Too many failed attempts. Please request a new code.", maxAttempts: true }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify OTP
      if (storedOtp.otp_code !== otp.trim()) {
        // Increment attempts
        await supabase
          .from("admin_otps")
          .update({ attempts: storedOtp.attempts + 1 })
          .eq("id", storedOtp.id);
        
        return new Response(
          JSON.stringify({ 
            error: "Invalid verification code", 
            attemptsLeft: 3 - (storedOtp.attempts + 1) 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // OTP verified - delete it
      await supabase.from("admin_otps").delete().eq("id", storedOtp.id);

      console.log("OTP verified successfully for:", email);
      return new Response(
        JSON.stringify({ success: true, verified: true, message: "Verification successful!" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'send' or 'verify'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Admin OTP error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
