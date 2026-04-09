import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const url = new URL(req.url);
    const slug = url.searchParams.get("endpoint") || url.pathname.split("/").pop();

    if (!slug) {
      return new Response(JSON.stringify({ error: "endpoint parameter required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find endpoint config
    const { data: endpoint } = await supabase
      .from("webhook_endpoints").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();

    if (!endpoint) {
      return new Response(JSON.stringify({ error: "Webhook endpoint not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate secret if configured
    if (endpoint.secret_value) {
      const headerName = endpoint.secret_header || "X-Webhook-Secret";
      const providedSecret = req.headers.get(headerName);
      if (providedSecret !== endpoint.secret_value) {
        await supabase.from("webhook_logs").insert({
          endpoint_id: endpoint.id, event_type: "auth_failed", status: "rejected",
          ip_address: req.headers.get("x-forwarded-for") || "unknown",
          processing_time_ms: Date.now() - startTime,
        });
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse payload
    let payload: unknown = {};
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      payload = await req.json();
    } else {
      payload = { raw: await req.text() };
    }

    const eventType = (payload as any)?.type || (payload as any)?.event || "unknown";

    // Log the webhook
    await supabase.from("webhook_logs").insert({
      endpoint_id: endpoint.id,
      event_type: eventType,
      payload,
      headers: Object.fromEntries([...req.headers.entries()].filter(([k]) => !k.includes("secret") && !k.includes("authorization"))),
      status: "processed",
      processing_time_ms: Date.now() - startTime,
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
    });

    // Update endpoint stats
    await supabase.from("webhook_endpoints").update({
      last_received_at: new Date().toISOString(),
      total_received: (endpoint.total_received || 0) + 1,
      total_processed: (endpoint.total_processed || 0) + 1,
    }).eq("id", endpoint.id);

    return new Response(JSON.stringify({ success: true, event: eventType }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook receiver error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
