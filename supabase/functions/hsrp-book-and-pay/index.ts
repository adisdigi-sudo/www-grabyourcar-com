import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return json(500, { success: false, error: "Payment gateway not configured" });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    const {
      phone,
      registration_number,
      chassis_number,
      engine_number,
      vehicle_class,
      state,
      owner_name,
      email,
      address,
      pincode,
      service_type,
      service_price,
      home_installation,
      home_installation_fee,
      payment_amount,
      tracking_id,
      scheduled_date,
    } = body;

    const cleanPhone = normalizePhone(String(phone ?? ""));
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return json(400, { success: false, error: "Invalid phone number" });
    }

    // ── Step 1: Ensure user exists (get or create) ──
    const emailAddr = `91${cleanPhone}@grabyourcar.app`;
    const password = `wa_${cleanPhone}_gyc2024`;
    let userId: string | null = null;

    // Try create first
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email: emailAddr,
      password,
      email_confirm: true,
      user_metadata: { phone: `91${cleanPhone}`, auth_method: "hsrp_booking" },
    });

    if (!createError && createdUser?.user) {
      userId = createdUser.user.id;
    } else {
      // User exists - get their ID via generateLink
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: emailAddr,
      });
      userId = linkData?.user?.id || null;

      if (!userId) {
        // Fallback REST lookup
        const restRes = await fetch(
          `${SUPABASE_URL}/auth/v1/admin/users?filter=email%20eq%20${encodeURIComponent(emailAddr)}`,
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
          const found = Array.isArray(users)
            ? users.find((u: any) => u.email?.toLowerCase() === emailAddr.toLowerCase())
            : null;
          if (found?.id) userId = found.id;
        }
      }
    }

    if (!userId) {
      return json(500, { success: false, error: "Could not provision user account" });
    }

    // ── Step 2: Create HSRP booking using service role ──
    const bookingData = {
      user_id: userId,
      registration_number: (registration_number || "").toUpperCase(),
      chassis_number: chassis_number || null,
      engine_number: engine_number || null,
      vehicle_class: (vehicle_class || "").toUpperCase(),
      state: state || "",
      owner_name: owner_name || "",
      mobile: cleanPhone,
      email: email || null,
      address: address || "",
      pincode: pincode || "",
      service_type: service_type || "hsrp",
      service_price: service_price || 0,
      home_installation: home_installation || false,
      home_installation_fee: home_installation ? (home_installation_fee || 0) : 0,
      payment_amount: payment_amount || 0,
      tracking_id: tracking_id || "",
      scheduled_date: scheduled_date || null,
      order_status: "pending",
      payment_status: "pending",
    };

    const { data: booking, error: bookingError } = await admin
      .from("hsrp_bookings")
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      console.error("Booking insert error:", bookingError);
      return json(500, { success: false, error: "Failed to create booking: " + bookingError.message });
    }

    // ── Step 3: Create Razorpay order ──
    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        amount: (payment_amount || 0) * 100,
        currency: "INR",
        receipt: booking.id,
        notes: {
          bookingType: "hsrp",
          bookingId: booking.id,
          userId,
          tracking_id: tracking_id || "",
          service: service_type || "hsrp",
        },
      }),
    });

    const orderData = await razorpayRes.json();
    if (!razorpayRes.ok) {
      console.error("Razorpay order creation failed:", orderData);
      return json(500, { success: false, error: "Payment gateway error" });
    }

    // Update booking with order_id
    await admin
      .from("hsrp_bookings")
      .update({ order_id: orderData.id, payment_status: "initiated" })
      .eq("id", booking.id);

    return json(200, {
      success: true,
      booking: { id: booking.id, tracking_id: booking.tracking_id },
      order: {
        id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
      },
      key: RAZORPAY_KEY_ID,
      user_id: userId,
    });
  } catch (error) {
    console.error("hsrp-book-and-pay error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json(500, { success: false, error: msg });
  }
});
