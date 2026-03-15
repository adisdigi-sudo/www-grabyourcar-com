import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  bookingType: "hsrp" | "rental" | "accessories";
  bookingId: string;
}

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RAZORPAY_KEY_SECRET) {
      throw new Error("RAZORPAY_KEY_SECRET is not configured");
    }

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error("Backend auth service not configured");
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse(401, { success: false, error: "No authorization header provided" });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse(401, { success: false, error: "Unauthorized" });
    }

    const body: VerifyPaymentRequest = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingType, bookingId } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return jsonResponse(400, { success: false, error: "Missing payment verification fields" });
    }

    const message = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(RAZORPAY_KEY_SECRET);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== razorpay_signature) {
      return jsonResponse(400, { success: false, error: "Invalid payment signature" });
    }

    let tableName: "hsrp_bookings" | "rental_bookings" | "accessory_orders";

    switch (bookingType) {
      case "hsrp":
        tableName = "hsrp_bookings";
        break;
      case "rental":
        tableName = "rental_bookings";
        break;
      case "accessories":
        tableName = "accessory_orders";
        break;
      default:
        return jsonResponse(400, { success: false, error: "Invalid booking type" });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: booking, error: updateError } = await adminClient
      .from(tableName)
      .update({
        payment_id: razorpay_payment_id,
        payment_status: "paid",
        order_status: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update booking:", updateError);
      return jsonResponse(400, { success: false, error: "Failed to update booking status" });
    }

    return jsonResponse(200, {
      success: true,
      message: "Payment verified successfully",
      booking,
    });
  } catch (error: unknown) {
    console.error("Error verifying payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(400, { success: false, error: errorMessage });
  }
});
