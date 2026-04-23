import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert car dealership stock parser. Parse the WhatsApp message from a car dealer and extract every car mentioned.

For each car return:
- brand (string e.g. "Maruti Suzuki")
- model (string e.g. "Swift")
- variant (optional, e.g. "VXi")
- color (optional)
- fuel_type ("petrol"|"diesel"|"cng"|"electric"|"hybrid", optional)
- transmission ("manual"|"automatic"|"amt"|"cvt"|"dct", optional)
- manufacturing_year (number, optional)
- ex_showroom_price (number INR, optional)
- on_road_price (number INR, optional)
- discount (string, optional)
- quantity (number, default 1)
- stock_status ("available"|"limited"|"sold_out"|"upcoming", default "available")
- notes (optional)

Convert: "8.5L"/"8.5 lakh" → 850000. "₹12,50,000" → 1250000.
If unsure omit the key. Never invent.
Return ONLY valid JSON: {"cars":[...]} — no markdown.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const message = (body.message || "").trim();
    if (!message) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `${body.default_brand ? `Default brand: ${body.default_brand}\n\n` : ""}Message:\n${message}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI ${aiRes.status}`, detail: t }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { cars: [] }; }
    const cars = Array.isArray(parsed.cars) ? parsed.cars : [];

    let saved = 0;
    if (body.auto_save && cars.length > 0) {
      const rows = cars.map((c: any) => ({
        dealer_rep_id: body.dealer_rep_id || null,
        brand: String(c.brand || body.default_brand || "Unknown").trim(),
        model: c.model ? String(c.model).trim() : null,
        car_name: `${c.brand || body.default_brand || ""} ${c.model || ""}`.trim() || "Unknown Car",
        variant: c.variant || null,
        color: c.color || null,
        fuel_type: c.fuel_type || null,
        transmission: c.transmission || null,
        manufacturing_year: c.manufacturing_year || null,
        year: c.manufacturing_year || null,
        ex_showroom_price: c.ex_showroom_price || null,
        on_road_price: c.on_road_price || null,
        discount: c.discount || null,
        quantity: c.quantity || 1,
        stock_status: c.stock_status || "available",
        notes: c.notes || null,
        source_message: message,
        source_date: new Date().toISOString(),
        is_active: true,
      }));
      const { error: insErr, count } = await supabase.from("dealer_inventory").insert(rows, { count: "exact" });
      if (insErr) {
        return new Response(JSON.stringify({ cars, saved: 0, insert_error: insErr.message }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      saved = count || rows.length;
    }

    return new Response(JSON.stringify({ cars, saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
