import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendApiKey);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find abandoned carts: >1 hour old, email present, no recovery email sent, not recovered
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: abandonedCarts, error } = await supabase
      .from("cart_events")
      .select("*")
      .not("email", "is", null)
      .not("abandoned_at", "is", null)
      .eq("recovery_email_sent", false)
      .eq("recovered", false)
      .lte("abandoned_at", oneHourAgo)
      .limit(50);

    if (error) throw error;
    if (!abandonedCarts || abandonedCarts.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No abandoned carts to recover" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    for (const cart of abandonedCarts) {
      try {
        const cartItems = typeof cart.cart_data === "string" ? JSON.parse(cart.cart_data) : cart.cart_data;
        const itemsHtml = Array.isArray(cartItems)
          ? cartItems.map((item: any) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${item.name || "Item"}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${item.price || 0}</td></tr>`).join("")
          : `<tr><td style="padding:8px">Your selected items</td><td style="padding:8px;text-align:right">₹${cart.cart_value || 0}</td></tr>`;

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2 style="color:#1a1a1a">You left something behind! 🛒</h2>
            <p>Hi there, looks like you didn't finish your purchase. Your cart is still waiting for you:</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0">
              <thead><tr><th style="padding:8px;text-align:left;border-bottom:2px solid #333">Item</th><th style="padding:8px;text-align:right;border-bottom:2px solid #333">Price</th></tr></thead>
              <tbody>${itemsHtml}</tbody>
              <tfoot><tr><td style="padding:12px 8px;font-weight:bold;border-top:2px solid #333">Total</td><td style="padding:12px 8px;text-align:right;font-weight:bold;border-top:2px solid #333">₹${cart.cart_value || 0}</td></tr></tfoot>
            </table>
            <div style="text-align:center;margin:30px 0">
              <a href="https://www.grabyourcar.com/accessories" style="background:#e53e3e;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold">Complete Your Purchase →</a>
            </div>
            <p style="color:#666;font-size:13px">Need help? Reply to this email and we'll assist you.</p>
          </div>`;

        await resend.emails.send({
          from: "GrabYourCar <noreply@grabyourcar.com>",
          to: [cart.email!],
          subject: "🛒 You left items in your cart — complete your order!",
          html,
        });

        await supabase.from("cart_events").update({
          recovery_email_sent: true,
          recovery_email_sent_at: new Date().toISOString(),
        }).eq("id", cart.id);

        sent++;
      } catch (e) {
        console.error(`Failed to send recovery for cart ${cart.id}:`, e);
      }
    }

    console.log(`Cart recovery: ${sent}/${abandonedCarts.length} emails sent`);
    return new Response(JSON.stringify({ processed: abandonedCarts.length, sent }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cart recovery error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
