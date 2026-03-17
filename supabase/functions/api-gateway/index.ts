import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-api-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const apiKey = req.headers.get("x-api-key");
  const apiSecret = req.headers.get("x-api-secret");
  const url = new URL(req.url);
  const endpoint = url.pathname.replace(/^\/api-gateway\/?/, "") || "/";

  const logAndRespond = async (partnerId: string | null, status: number, body: any) => {
    const duration = Date.now() - startTime;
    if (partnerId) {
      await supabase.from("api_logs").insert({
        partner_id: partnerId,
        endpoint,
        method: req.method,
        response_code: status,
        duration_ms: duration,
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
        user_agent: req.headers.get("user-agent"),
      });
      // Increment total_requests
      await supabase.from("api_partners").update({
        total_requests: undefined, // We'll use RPC instead
        last_request_at: new Date().toISOString(),
      }).eq("id", partnerId);
    }
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  try {
    if (!apiKey || !apiSecret) {
      return logAndRespond(null, 401, { error: "Missing x-api-key or x-api-secret headers" });
    }

    // Validate partner
    const { data: partner, error: partnerErr } = await supabase
      .from("api_partners")
      .select("*")
      .eq("api_key_hash", apiKey)
      .eq("api_secret_hash", apiSecret)
      .eq("is_active", true)
      .maybeSingle();

    if (partnerErr || !partner) {
      return logAndRespond(null, 401, { error: "Invalid API credentials" });
    }

    // IP whitelist check
    if (partner.ip_whitelist && partner.ip_whitelist.length > 0) {
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      if (clientIp && !partner.ip_whitelist.includes(clientIp)) {
        return logAndRespond(partner.id, 403, { error: "IP not whitelisted" });
      }
    }

    // Rate limit check (simple per-minute via api_logs count)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count } = await supabase
      .from("api_logs")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partner.id)
      .gte("created_at", oneMinuteAgo);

    if (count && partner.rate_limit_per_minute && count >= partner.rate_limit_per_minute) {
      return logAndRespond(partner.id, 429, { error: "Rate limit exceeded", limit: partner.rate_limit_per_minute });
    }

    // Get partner's vertical access
    const { data: verticalAccess } = await supabase
      .from("api_key_vertical_access")
      .select("vertical_id, can_read, can_write, can_delete")
      .eq("partner_id", partner.id);

    const body = req.method !== "GET" ? await req.json().catch(() => ({})) : {};

    // Route by endpoint
    if (endpoint === "health" || endpoint === "/") {
      return logAndRespond(partner.id, 200, {
        status: "ok",
        partner: partner.name,
        verticals: verticalAccess?.length || 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Leads endpoints
    if (endpoint.startsWith("leads")) {
      const verticalIds = verticalAccess?.filter(v => v.can_read).map(v => v.vertical_id) || [];
      
      if (endpoint === "leads" && req.method === "GET") {
        const query = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(100);
        if (verticalIds.length > 0) {
          query.in("vertical_id", verticalIds);
        }
        const { data, error } = await query;
        if (error) return logAndRespond(partner.id, 500, { error: error.message });
        return logAndRespond(partner.id, 200, { data, count: data?.length });
      }

      if (endpoint === "leads" && req.method === "POST") {
        const canWrite = verticalAccess?.some(v => v.can_write);
        if (!canWrite) return logAndRespond(partner.id, 403, { error: "No write access" });
        
        const { name, phone, email, source, vertical_id, service_category, message, city } = body;
        if (!phone) return logAndRespond(partner.id, 400, { error: "phone is required" });

        const { data, error } = await supabase.from("leads").insert({
          name, phone, email, source: source || `api:${partner.slug}`,
          vertical_id, service_category, message, city,
          status: "New", priority: "medium",
        }).select().single();

        if (error) return logAndRespond(partner.id, 500, { error: error.message });
        return logAndRespond(partner.id, 201, { data });
      }
    }

    // Cars/inventory endpoints
    if (endpoint === "cars" && req.method === "GET") {
      const { data, error } = await supabase
        .from("cars")
        .select("id, name, brand, slug, price_range, body_type, fuel_types, transmission_types, is_new, is_hot")
        .eq("is_discontinued", false)
        .order("name");
      if (error) return logAndRespond(partner.id, 500, { error: error.message });
      return logAndRespond(partner.id, 200, { data, count: data?.length });
    }

    // Verticals endpoint
    if (endpoint === "verticals" && req.method === "GET") {
      const { data } = await supabase.from("business_verticals").select("id, name, slug").eq("is_active", true);
      return logAndRespond(partner.id, 200, { data });
    }

    return logAndRespond(partner.id, 404, { error: `Endpoint '${endpoint}' not found` });
  } catch (err) {
    console.error("API Gateway error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
