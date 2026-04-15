import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, order_id, partner_slug } = await req.json();

    // Get the logistics partner credentials
    const { data: partner, error: partnerErr } = await supabase
      .from("logistics_partners")
      .select("*")
      .eq("slug", partner_slug || "shiprocket")
      .eq("is_active", true)
      .single();

    if (partnerErr || !partner) {
      return new Response(
        JSON.stringify({ error: "Logistics partner not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let token = partner.api_token;

    // For Shiprocket: auto-refresh token if expired
    if (partner.slug === "shiprocket") {
      const tokenExpired =
        !partner.token_expires_at ||
        new Date(partner.token_expires_at) < new Date();

      if (!token || tokenExpired) {
        const authRes = await fetch(
          `${partner.api_base_url}/v1/external/auth/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: partner.api_email,
              password: partner.api_password_encrypted,
            }),
          }
        );

        if (!authRes.ok) {
          return new Response(
            JSON.stringify({ error: "Shiprocket authentication failed" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const authData = await authRes.json();
        token = authData.token;

        // Save the new token
        await supabase
          .from("logistics_partners")
          .update({
            api_token: token,
            token_expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", partner.id);
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (partner.slug === "shiprocket") {
      headers["Authorization"] = `Bearer ${token}`;
    } else if (partner.auth_type === "token") {
      headers["Authorization"] = `Token ${token}`;
    } else if (partner.auth_type === "api_key") {
      headers["Authorization"] = partner.api_key || "";
    }

    // Route based on action
    switch (action) {
      case "create_order": {
        // Fetch order from ecommerce_orders
        const { data: order } = await supabase
          .from("ecommerce_orders")
          .select("*")
          .eq("id", order_id)
          .single();

        if (!order) {
          return new Response(
            JSON.stringify({ error: "Order not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (partner.slug === "shiprocket") {
          const shipPayload = {
            order_id: order.order_number,
            order_date: new Date(order.created_at).toISOString().split("T")[0],
            pickup_location: "Primary",
            billing_customer_name: order.contact_name || "Customer",
            billing_last_name: "",
            billing_address: order.shipping_address?.line1 || "",
            billing_address_2: order.shipping_address?.line2 || "",
            billing_city: order.shipping_address?.city || "",
            billing_pincode: order.shipping_address?.pincode || "",
            billing_state: order.shipping_address?.state || "",
            billing_country: order.shipping_address?.country || "India",
            billing_email: order.contact_email || "",
            billing_phone: order.contact_phone || "",
            shipping_is_billing: true,
            order_items: (order.items || []).map((item: any) => ({
              name: item.name || "Product",
              sku: item.sku || `SKU-${Date.now()}`,
              units: item.quantity || 1,
              selling_price: item.price || 0,
            })),
            payment_method: order.payment_method === "cod" ? "COD" : "Prepaid",
            sub_total: order.total,
            length: 10,
            breadth: 10,
            height: 10,
            weight: 0.5,
          };

          const res = await fetch(
            `${partner.api_base_url}/v1/external/orders/create/adhoc`,
            { method: "POST", headers, body: JSON.stringify(shipPayload) }
          );

          const resData = await res.json();

          if (res.ok && resData.order_id) {
            // Update order with Shiprocket order ID
            await supabase
              .from("ecommerce_orders")
              .update({
                courier_partner: "Shiprocket",
                tracking_number: resData.shipment_id?.toString() || null,
                notes: `Shiprocket Order ID: ${resData.order_id}`,
                status: "confirmed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", order_id);

            return new Response(
              JSON.stringify({ success: true, shiprocket_order_id: resData.order_id, shipment_id: resData.shipment_id }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            return new Response(
              JSON.stringify({ error: "Failed to create Shiprocket order", details: resData }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        return new Response(
          JSON.stringify({ error: `Order creation not implemented for ${partner.name}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "track": {
        if (partner.slug === "shiprocket") {
          const { data: order } = await supabase
            .from("ecommerce_orders")
            .select("tracking_number")
            .eq("id", order_id)
            .single();

          if (!order?.tracking_number) {
            return new Response(
              JSON.stringify({ error: "No tracking number found" }),
              { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const res = await fetch(
            `${partner.api_base_url}/v1/external/courier/track/shipment/${order.tracking_number}`,
            { headers }
          );
          const trackData = await res.json();

          return new Response(JSON.stringify(trackData), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ error: `Tracking not implemented for ${partner.name}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "cancel": {
        if (partner.slug === "shiprocket") {
          const { data: order } = await supabase
            .from("ecommerce_orders")
            .select("notes")
            .eq("id", order_id)
            .single();

          const shiprocketId = order?.notes?.match(/Shiprocket Order ID: (\d+)/)?.[1];
          if (!shiprocketId) {
            return new Response(
              JSON.stringify({ error: "No Shiprocket order ID found" }),
              { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const res = await fetch(
            `${partner.api_base_url}/v1/external/orders/cancel`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({ ids: [parseInt(shiprocketId)] }),
            }
          );
          const cancelData = await res.json();

          if (res.ok) {
            await supabase
              .from("ecommerce_orders")
              .update({ status: "cancelled", updated_at: new Date().toISOString() })
              .eq("id", order_id);
          }

          return new Response(JSON.stringify(cancelData), {
            status: res.ok ? 200 : 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ error: `Cancel not implemented for ${partner.name}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    console.error("[Shiprocket Sync] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
