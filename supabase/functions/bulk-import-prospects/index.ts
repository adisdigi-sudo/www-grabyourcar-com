import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { prospects, data_source, batch_id, source_file } = await req.json();

    if (!prospects || !Array.isArray(prospects) || prospects.length === 0) {
      return new Response(JSON.stringify({ error: "No prospects provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const batchSize = 500;

    for (let i = 0; i < prospects.length; i += batchSize) {
      const batch = prospects.slice(i, i + batchSize).map((p: any) => {
        const model = p.vehicle_model || p.model || "";
        const submodel = p.submodel || "";
        const vehicleModel = model ? (submodel ? `${model} ${submodel}` : model) : submodel;
        
        return {
          phone: String(p.phone || "").replace(/\D/g, "").slice(-10) || `P_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          customer_name: p.customer_name || p.name || null,
          email: p.email || null,
          vehicle_number: p.vehicle_number || null,
          vehicle_make: p.vehicle_make || null,
          vehicle_model: vehicleModel || null,
          insurer: p.insurer || null,
          expiry_date: p.expiry_date || null,
          premium_amount: p.premium_amount ? Number(p.premium_amount) : null,
          city: p.city || null,
          state: p.state || null,
          data_source: data_source || "purchased_database",
          prospect_status: "new",
          source_file: source_file || null,
          batch_id: batch_id || null,
        };
      });

      const { error } = await supabase.from("insurance_prospects").insert(batch);
      if (error) {
        // Try one by one for this batch
        for (const row of batch) {
          const { error: e } = await supabase.from("insurance_prospects").insert(row);
          if (e) {
            failed++;
            if (errors.length < 10) errors.push(`${row.phone}: ${e.message}`);
          } else {
            success++;
          }
        }
      } else {
        success += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ success, failed, total: prospects.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
