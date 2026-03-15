import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrderRequest {
  amount: number;
  currency?: string;
  receipt: string;
  bookingType: "hsrp" | "rental" | "accessories";
  bookingId: string;
  notes?: Record<string, string>;
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
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials are not configured");
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

    const body: CreateOrderRequest = await req.json();
    const { amount, currency = "INR", receipt, bookingType, bookingId, notes = {} } = body;

    if (!amount || amount <= 0) {
      return jsonResponse(400, { success: false, error: "Invalid amount" });
    }

    if (!receipt || !bookingType || !bookingId) {
      return jsonResponse(400, {
        success: false,
        error: "Missing required fields: receipt, bookingType, bookingId",
      });
    }

    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency,
        receipt,
        notes: {
          ...notes,
          bookingType,
          bookingId,
          userId: user.id,
        },
      }),
    });

    const orderData = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      console.error("Razorpay order creation failed:", orderData);
      return jsonResponse(400, {
        success: false,
        error: orderData.error?.description || "Failed to create order",
      });
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

    const { error: updateError } = await adminClient
      .from(tableName)
      .update({
        order_id: orderData.id,
        payment_status: "initiated",
      })
      .eq("id", bookingId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update booking with order_id:", updateError);
    }

    return jsonResponse(200, {
      success: true,
      order: {
        id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        receipt: orderData.receipt,
      },
      key: RAZORPAY_KEY_ID,
    });
  } catch (error: unknown) {
    console.error("Error creating Razorpay order:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse(400, { success: false, error: errorMessage });
  }
});
