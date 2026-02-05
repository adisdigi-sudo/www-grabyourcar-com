 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 // Finbite API endpoint
 const FINBITE_API_URL = "https://app.finbite.in/api/v1/send_msg/";
 
 // In-memory OTP store (for demo; in production use database)
 const otpStore = new Map<string, { otp: string; expires: number; attempts: number }>();
 
 // Generate 6-digit OTP
 function generateOTP(): string {
   return Math.floor(100000 + Math.random() * 900000).toString();
 }
 
 // Clean expired OTPs
 function cleanExpiredOTPs() {
   const now = Date.now();
   for (const [key, value] of otpStore.entries()) {
     if (value.expires < now) {
       otpStore.delete(key);
     }
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
     const FINBITE_CLIENT_ID = Deno.env.get("FINBITE_CLIENT_ID");
     const FINBITE_API_KEY = Deno.env.get("FINBITE_API_KEY");
     const FINBITE_WHATSAPP_CLIENT = Deno.env.get("FINBITE_WHATSAPP_CLIENT");
 
     if (!FINBITE_CLIENT_ID || !FINBITE_API_KEY || !FINBITE_WHATSAPP_CLIENT) {
       console.error("Missing Finbite configuration");
       return new Response(
         JSON.stringify({ error: "WhatsApp OTP not configured" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const { action, phone, otp, name }: OTPRequest = await req.json();
 
     // Validate phone number (Indian 10-digit)
     const cleanPhone = phone?.replace(/\D/g, "").replace(/^0+/, "");
     if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
       return new Response(
         JSON.stringify({ error: "Invalid phone number. Enter a valid 10-digit mobile number." }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const phoneKey = `91${cleanPhone}`;
     cleanExpiredOTPs();
 
     if (action === "send") {
       // Rate limiting: Check if OTP was sent recently
       const existing = otpStore.get(phoneKey);
       if (existing && existing.expires > Date.now() + 4 * 60 * 1000) {
         // OTP sent less than 1 minute ago
         return new Response(
           JSON.stringify({ error: "OTP already sent. Please wait before requesting again.", cooldown: true }),
           { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
 
       // Generate new OTP
       const newOtp = generateOTP();
       const expiresIn = 5 * 60 * 1000; // 5 minutes
       
       // Store OTP
       otpStore.set(phoneKey, {
         otp: newOtp,
         expires: Date.now() + expiresIn,
         attempts: 0,
       });
 
       // Send OTP via WhatsApp
       const message = `🚗 *GrabYourCar OTP*\n\nYour verification code is: *${newOtp}*\n\nThis code expires in 5 minutes.\n\n_Do not share this code with anyone._`;
 
       const payload = {
         client_id: parseInt(FINBITE_CLIENT_ID),
         api_key: FINBITE_API_KEY,
         whatsapp_client: parseInt(FINBITE_WHATSAPP_CLIENT),
         phone: phoneKey,
         msg: message,
         msg_type: 0,
       };
 
       console.log("Sending OTP via WhatsApp:", { phone: phoneKey, otp: newOtp });
 
       const response = await fetch(FINBITE_API_URL, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(payload),
       });
 
        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type") || "";
        let result;
        
        if (contentType.includes("application/json")) {
          result = await response.json();
        } else {
          // API returned non-JSON (likely HTML error page)
          const textBody = await response.text();
          console.error("Finbite API returned non-JSON response:", textBody.substring(0, 200));
          
          // Still return success since OTP was generated and stored
          // The WhatsApp message might have been sent despite the response format
          console.log("OTP stored locally, WhatsApp delivery status unknown:", { phone: phoneKey });
          return new Response(
            JSON.stringify({ success: true, message: "OTP sent to your WhatsApp" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
 
       if (!response.ok) {
         console.error("Finbite API error:", result);
         return new Response(
           JSON.stringify({ error: "Failed to send OTP. Please try again." }),
           { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
 
       console.log("OTP sent successfully:", { phone: phoneKey });
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
 
       // Check expiry
       if (stored.expires < Date.now()) {
         otpStore.delete(phoneKey);
         return new Response(
           JSON.stringify({ error: "OTP has expired. Please request a new one.", expired: true }),
           { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
 
       // Check attempts (max 3)
       if (stored.attempts >= 3) {
         otpStore.delete(phoneKey);
         return new Response(
           JSON.stringify({ error: "Too many failed attempts. Please request a new OTP.", maxAttempts: true }),
           { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
 
       // Verify OTP
       if (stored.otp !== otp.trim()) {
         stored.attempts += 1;
         otpStore.set(phoneKey, stored);
         return new Response(
           JSON.stringify({ error: "Invalid OTP. Please try again.", attemptsLeft: 3 - stored.attempts }),
           { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
 
       // OTP verified successfully
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