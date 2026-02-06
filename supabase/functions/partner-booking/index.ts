import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-api-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BookingRequest {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  vehicle_id?: string;
  service_type: "self_drive" | "with_driver" | "outstation";
  pickup_date: string;
  pickup_time: string;
  pickup_address: string;
  dropoff_date?: string;
  dropoff_time?: string;
  dropoff_address?: string;
  trip_type?: string;
  duration_days?: number;
  special_instructions?: string;
  partner_reference_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API credentials
    const apiKey = req.headers.get("x-api-key");
    const apiSecret = req.headers.get("x-api-secret");

    if (!apiKey || !apiSecret) {
      await logRequest(supabase, null, "/partner-booking", "POST", null, 401, { error: "Missing API credentials" }, req, startTime);
      return new Response(
        JSON.stringify({ error: "Missing API credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find partner by API key
    const { data: partner, error: partnerError } = await supabase
      .from("api_partners")
      .select("*")
      .eq("api_key_hash", apiKey)
      .eq("api_secret_hash", apiSecret)
      .eq("is_active", true)
      .single();

    if (partnerError || !partner) {
      await logRequest(supabase, null, "/partner-booking", "POST", null, 401, { error: "Invalid API credentials" }, req, startTime);
      return new Response(
        JSON.stringify({ error: "Invalid API credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check IP whitelist if configured
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    if (partner.ip_whitelist && partner.ip_whitelist.length > 0) {
      if (!partner.ip_whitelist.includes(clientIP)) {
        await logRequest(supabase, partner.id, "/partner-booking", "POST", null, 403, { error: "IP not whitelisted" }, req, startTime);
        return new Response(
          JSON.stringify({ error: "IP not whitelisted" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Parse request body
    const bookingData: BookingRequest = await req.json();

    // Validate required fields
    if (!bookingData.customer_name || !bookingData.customer_phone || 
        !bookingData.pickup_date || !bookingData.pickup_time || !bookingData.pickup_address) {
      await logRequest(supabase, partner.id, "/partner-booking", "POST", bookingData, 400, { error: "Missing required fields" }, req, startTime);
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields",
          required: ["customer_name", "customer_phone", "pickup_date", "pickup_time", "pickup_address"]
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if service type is allowed for this partner
    if (!partner.allowed_services.includes(bookingData.service_type)) {
      await logRequest(supabase, partner.id, "/partner-booking", "POST", bookingData, 403, { error: "Service not allowed" }, req, startTime);
      return new Response(
        JSON.stringify({ 
          error: "Service type not allowed for this partner",
          allowed_services: partner.allowed_services
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate pricing
    let baseAmount = 0;
    let driverCharges = 0;
    const durationDays = bookingData.duration_days || 1;

    if (bookingData.vehicle_id) {
      const { data: vehicle } = await supabase
        .from("rental_vehicles")
        .select("*")
        .eq("id", bookingData.vehicle_id)
        .single();

      if (vehicle) {
        switch (bookingData.service_type) {
          case "self_drive":
            baseAmount = (vehicle.rent_self_drive || 999) * durationDays;
            break;
          case "with_driver":
            baseAmount = (vehicle.rent_with_driver || 1499) * durationDays;
            driverCharges = durationDays > 1 ? 300 * durationDays : 0;
            break;
          case "outstation":
            baseAmount = (vehicle.rent_outstation_per_km || 12) * 200 * durationDays;
            driverCharges = 300 * durationDays;
            break;
        }
      }
    } else {
      // Default pricing if no vehicle specified
      switch (bookingData.service_type) {
        case "self_drive":
          baseAmount = 999 * durationDays;
          break;
        case "with_driver":
          baseAmount = 1499 * durationDays;
          driverCharges = durationDays > 1 ? 300 * durationDays : 0;
          break;
        case "outstation":
          baseAmount = 12 * 200 * durationDays;
          driverCharges = 300 * durationDays;
          break;
      }
    }

    const taxes = Math.round(baseAmount * 0.18);
    const commission = Math.round((baseAmount + driverCharges + taxes) * (partner.commission_percentage / 100));
    const totalAmount = baseAmount + driverCharges + taxes;

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from("driver_bookings")
      .insert([{
        customer_name: bookingData.customer_name,
        customer_phone: bookingData.customer_phone,
        customer_email: bookingData.customer_email || null,
        vehicle_id: bookingData.vehicle_id || null,
        vehicle_name: "To be assigned",
        service_type: bookingData.service_type,
        pickup_date: bookingData.pickup_date,
        pickup_time: bookingData.pickup_time,
        pickup_address: bookingData.pickup_address,
        dropoff_date: bookingData.dropoff_date || null,
        dropoff_time: bookingData.dropoff_time || null,
        dropoff_address: bookingData.dropoff_address || null,
        trip_type: bookingData.trip_type || "local",
        duration_days: durationDays,
        base_amount: baseAmount,
        driver_charges: driverCharges,
        taxes: taxes,
        total_amount: totalAmount,
        status: "pending",
        payment_status: "pending",
        special_instructions: bookingData.special_instructions || null,
        source: "api",
        api_partner_id: partner.id,
        api_reference_id: bookingData.partner_reference_id || null,
      }])
      .select()
      .single();

    if (bookingError) {
      await logRequest(supabase, partner.id, "/partner-booking", "POST", bookingData, 500, { error: bookingError.message }, req, startTime);
      return new Response(
        JSON.stringify({ error: "Failed to create booking", details: bookingError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send webhook notification if configured
    if (partner.webhook_url) {
      try {
        await fetch(partner.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "booking_created",
            booking_id: booking.id,
            partner_reference_id: bookingData.partner_reference_id,
            status: booking.status,
            total_amount: booking.total_amount,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (webhookError) {
        console.error("Webhook notification failed:", webhookError);
      }
    }

    const response = {
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        customer_name: booking.customer_name,
        pickup_date: booking.pickup_date,
        pickup_time: booking.pickup_time,
        service_type: booking.service_type,
        pricing: {
          base_amount: baseAmount,
          driver_charges: driverCharges,
          taxes: taxes,
          total_amount: totalAmount,
          partner_commission: commission,
        },
        created_at: booking.created_at,
      },
      partner_branding: partner.branding_enabled ? {
        name: "GrabYourCar",
        powered_by: partner.name,
      } : null,
    };

    await logRequest(supabase, partner.id, "/partner-booking", "POST", bookingData, 200, response, req, startTime);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Partner booking error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function logRequest(
  supabase: any,
  partnerId: string | null,
  endpoint: string,
  method: string,
  requestBody: any,
  responseCode: number,
  responseBody: any,
  req: Request,
  startTime: number
) {
  try {
    await supabase.from("api_logs").insert([{
      partner_id: partnerId,
      endpoint,
      method,
      request_body: requestBody,
      response_code: responseCode,
      response_body: responseBody,
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
      user_agent: req.headers.get("user-agent"),
      duration_ms: Date.now() - startTime,
    }]);
  } catch (logError) {
    console.error("Failed to log API request:", logError);
  }
}
