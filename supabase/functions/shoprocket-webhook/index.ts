import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-shoprocket-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log("[ShopRocket Webhook] Received:", JSON.stringify(payload).slice(0, 500));

    const event = payload.event || payload.type || "order.created";
    const order = payload.order || payload.data?.order || payload;

    if (!order) {
      return new Response(JSON.stringify({ error: "No order data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map ShopRocket order to ecommerce_orders schema
    const orderNumber =
      order.order_number || order.reference || order.id?.toString() || `SR-${Date.now()}`;
    const items = (order.items || order.line_items || []).map((item: any) => ({
      name: item.name || item.title || "Product",
      quantity: item.quantity || 1,
      price: parseFloat(item.price || item.unit_price || "0"),
      sku: item.sku || null,
      image: item.image || item.image_url || null,
    }));

    const shipping = order.shipping_address || order.delivery_address || {};
    const customer = order.customer || order.billing_address || {};

    const subtotal = parseFloat(order.subtotal || order.sub_total || "0");
    const shippingFee = parseFloat(
      order.shipping_cost || order.delivery_cost || order.shipping || "0"
    );
    const discount = parseFloat(order.discount || order.discount_amount || "0");
    const total = parseFloat(order.total || order.grand_total || "0");

    const mappedOrder = {
      order_number: `SR-${orderNumber}`,
      contact_name:
        customer.name ||
        `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
        shipping.name ||
        null,
      contact_phone: customer.phone || shipping.phone || null,
      contact_email: customer.email || order.email || null,
      items,
      subtotal,
      shipping_fee: shippingFee,
      discount,
      total: total || subtotal + shippingFee - discount,
      payment_method: order.payment_method || order.gateway || "shoprocket",
      payment_status: mapPaymentStatus(order.payment_status || order.status),
      status: mapOrderStatus(order.status || order.order_status),
      shipping_address: {
        line1: shipping.address_1 || shipping.line1 || shipping.street || "",
        line2: shipping.address_2 || shipping.line2 || "",
        city: shipping.city || "",
        state: shipping.state || shipping.county || "",
        pincode: shipping.postcode || shipping.zip || shipping.postal_code || "",
        country: shipping.country || "IN",
      },
      source: "shoprocket",
      notes: order.notes || order.customer_notes || null,
      risk_score: 0,
      risk_level: "low",
      risk_factors: [],
      is_flagged: false,
      c2p_attempted: false,
      c2p_converted: false,
      ndr_attempts: 0,
    };

    // Upsert – if order_number already exists, update it
    const { data, error } = await supabase
      .from("ecommerce_orders")
      .upsert(mappedOrder, { onConflict: "order_number" })
      .select()
      .single();

    if (error) {
      console.error("[ShopRocket Webhook] DB error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[ShopRocket Webhook] Order synced:", data?.id);

    return new Response(
      JSON.stringify({ success: true, order_id: data?.id, event }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[ShopRocket Webhook] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function mapPaymentStatus(status: string): string {
  const s = (status || "").toLowerCase();
  if (["paid", "completed", "captured", "succeeded"].includes(s)) return "paid";
  if (["refunded", "refund"].includes(s)) return "refunded";
  if (["failed", "declined"].includes(s)) return "failed";
  return "pending";
}

function mapOrderStatus(status: string): string {
  const s = (status || "").toLowerCase();
  if (["delivered", "completed"].includes(s)) return "delivered";
  if (["shipped", "dispatched", "in_transit"].includes(s)) return "shipped";
  if (["processing", "confirmed"].includes(s)) return "confirmed";
  if (["cancelled", "canceled"].includes(s)) return "cancelled";
  if (["refunded"].includes(s)) return "rto";
  return "pending";
}
