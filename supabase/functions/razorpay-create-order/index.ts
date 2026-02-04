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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!RAZORPAY_KEY_ID) {
      throw new Error("RAZORPAY_KEY_ID is not configured");
    }

    if (!RAZORPAY_KEY_SECRET) {
      throw new Error("RAZORPAY_KEY_SECRET is not configured");
    }

    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    // Verify user is authenticated
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body: CreateOrderRequest = await req.json();
    const { amount, currency = "INR", receipt, bookingType, bookingId, notes = {} } = body;

    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }

    if (!receipt || !bookingType || !bookingId) {
      throw new Error("Missing required fields: receipt, bookingType, bookingId");
    }

    // Create Razorpay order
    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${credentials}`,
      },
      body: JSON.stringify({
        amount: amount * 100, // Razorpay expects amount in paise
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
      throw new Error(`Razorpay API error: ${orderData.error?.description || "Unknown error"}`);
    }

    // Update the booking with order_id based on booking type
    let tableName: string;
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
        throw new Error("Invalid booking type");
    }
    
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        order_id: orderData.id,
        payment_status: "initiated",
      })
      .eq("id", bookingId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update booking with order_id:", updateError);
      // Don't throw - order is created, just log the error
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: orderData.id,
          amount: orderData.amount,
          currency: orderData.currency,
          receipt: orderData.receipt,
        },
        key: RAZORPAY_KEY_ID,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error creating Razorpay order:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
