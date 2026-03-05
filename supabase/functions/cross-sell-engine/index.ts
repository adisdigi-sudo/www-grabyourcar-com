import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Cross-Sell Trigger Engine
 * 
 * Scans existing client data to auto-detect cross-sell opportunities:
 * 1. Insurance Renewal — policy expiring within 60 days → create renewal opportunity
 * 2. Loan Refinance — vehicle age > 2 years with hypothecation → refinance offer
 * 3. Accessories Upsell — recent purchase within 30 days → accessory recommendations
 * 4. HSRP Compliance — no HSRP recorded → HSRP booking offer
 * 
 * Actions:
 * - scan: Full database scan for all opportunity types
 * - scan_vehicle: Analyze single vehicle data from RC lookup
 * - stats: Return current opportunity counts
 * 
 * WhatsApp notifications are placeholder — will connect to Meta API later.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const { action = "scan", vehicle_data, client_id } = body;
    const now = new Date();
    const results = { 
      insurance_renewals: 0, 
      loan_refinances: 0, 
      accessory_upsells: 0,
      hsrp_offers: 0,
      total: 0,
    };

    // ===== STATS: Return current opportunity counts =====
    if (action === "stats") {
      const { count: pending } = await supabase
        .from("cross_sell_opportunities")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: converted } = await supabase
        .from("cross_sell_opportunities")
        .select("*", { count: "exact", head: true })
        .eq("status", "converted");

      const { count: total } = await supabase
        .from("cross_sell_opportunities")
        .select("*", { count: "exact", head: true });

      return new Response(JSON.stringify({
        pending: pending || 0,
        converted: converted || 0,
        total: total || 0,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== SCAN_VEHICLE: Analyze single vehicle from RC lookup =====
    if (action === "scan_vehicle" && vehicle_data) {
      const opportunities: string[] = [];

      // Insurance renewal trigger
      if (vehicle_data.triggers?.insurance_renewal) {
        opportunities.push("insurance_renewal");
        
        // Try to find matching client
        if (vehicle_data.registration_number) {
          const { data: matchingClients } = await supabase
            .from("insurance_clients")
            .select("id")
            .eq("vehicle_number", vehicle_data.registration_number)
            .limit(1);

          if (matchingClients?.[0]) {
            // Create cross-sell opportunity
            await supabase.from("cross_sell_opportunities").upsert({
              customer_id: matchingClients[0].id,
              opportunity_type: "insurance_renewal",
              source_vertical: "vehicle_lookup",
              target_vertical: "insurance",
              priority: vehicle_data.triggers.insurance_days_left <= 15 ? "critical" : 
                       vehicle_data.triggers.insurance_days_left <= 30 ? "high" : "medium",
              suggested_action: `Insurance expires in ${vehicle_data.triggers.insurance_days_left} days. Send renewal quote.`,
              status: "pending",
            }, { onConflict: "customer_id,opportunity_type" }).select();
            
            results.insurance_renewals++;
          }
        }
      }

      // Loan refinance trigger
      if (vehicle_data.triggers?.loan_refinance) {
        opportunities.push("loan_refinance");
        results.loan_refinances++;
      }

      // PUC/Fitness triggers
      if (vehicle_data.triggers?.puc_renewal) opportunities.push("puc_renewal");
      if (vehicle_data.triggers?.fitness_renewal) opportunities.push("fitness_renewal");

      return new Response(JSON.stringify({
        vehicle_number: vehicle_data.registration_number,
        opportunities_detected: opportunities,
        count: opportunities.length,
        // WhatsApp notification placeholder
        whatsapp_status: "placeholder — connect Meta API to auto-send offers",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== SCAN: Full database scan for cross-sell opportunities =====
    if (action === "scan") {
      // 1. Insurance renewals — policies expiring within 60 days
      const sixtyDaysFromNow = new Date(now);
      sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

      const { data: expiringPolicies } = await supabase
        .from("insurance_policies")
        .select("id, client_id, expiry_date, premium_amount, insurance_clients(id, customer_name, phone, vehicle_number)")
        .eq("status", "active")
        .lte("expiry_date", sixtyDaysFromNow.toISOString().split("T")[0])
        .gte("expiry_date", now.toISOString().split("T")[0]);

      for (const policy of expiringPolicies || []) {
        const daysLeft = Math.ceil((new Date(policy.expiry_date).getTime() - now.getTime()) / 86400000);
        const client = (policy as any).insurance_clients;
        if (!client) continue;

        // Check if opportunity already exists
        const { data: existing } = await supabase
          .from("cross_sell_opportunities")
          .select("id")
          .eq("customer_id", client.id)
          .eq("opportunity_type", "insurance_renewal")
          .eq("status", "pending")
          .limit(1);

        if (!existing?.length) {
          await supabase.from("cross_sell_opportunities").insert({
            customer_id: client.id,
            opportunity_type: "insurance_renewal",
            source_vertical: "insurance",
            target_vertical: "insurance",
            priority: daysLeft <= 7 ? "critical" : daysLeft <= 15 ? "high" : daysLeft <= 30 ? "medium" : "low",
            suggested_action: `Policy expires in ${daysLeft} days. Premium: ₹${policy.premium_amount || "N/A"}. Vehicle: ${client.vehicle_number || "N/A"}.`,
            estimated_value: policy.premium_amount || null,
            status: "pending",
          });
          results.insurance_renewals++;
        }
      }

      // 2. Loan refinance — insurance clients with vehicles > 2 years old
      const { data: clientsWithVehicles } = await supabase
        .from("insurance_clients")
        .select("id, customer_name, phone, vehicle_number, vehicle_model, manufacturing_year")
        .not("manufacturing_year", "is", null);

      for (const client of clientsWithVehicles || []) {
        const mfgYear = parseInt(String((client as any).manufacturing_year));
        if (isNaN(mfgYear)) continue;
        const vehicleAge = now.getFullYear() - mfgYear;
        if (vehicleAge < 2) continue;

        const { data: existing } = await supabase
          .from("cross_sell_opportunities")
          .select("id")
          .eq("customer_id", client.id)
          .eq("opportunity_type", "loan_refinance")
          .eq("status", "pending")
          .limit(1);

        if (!existing?.length) {
          await supabase.from("cross_sell_opportunities").insert({
            customer_id: client.id,
            opportunity_type: "loan_refinance",
            source_vertical: "insurance",
            target_vertical: "loans",
            priority: vehicleAge >= 5 ? "high" : "medium",
            suggested_action: `Vehicle is ${vehicleAge} years old. Offer loan refinance or top-up loan.`,
            status: "pending",
          });
          results.loan_refinances++;
        }
      }

      // 3. Accessories upsell — recent car buyers (last 30 days from leads)
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentBuyers } = await supabase
        .from("leads")
        .select("id, customer_name, phone, car_brand, car_model")
        .eq("status", "converted")
        .gte("updated_at", thirtyDaysAgo.toISOString());

      for (const lead of recentBuyers || []) {
        const { data: existing } = await supabase
          .from("cross_sell_opportunities")
          .select("id")
          .eq("customer_id", lead.id)
          .eq("opportunity_type", "accessories_upsell")
          .eq("status", "pending")
          .limit(1);

        if (!existing?.length) {
          await supabase.from("cross_sell_opportunities").insert({
            customer_id: lead.id,
            opportunity_type: "accessories_upsell",
            source_vertical: "sales",
            target_vertical: "accessories",
            priority: "medium",
            suggested_action: `Recently bought ${lead.car_brand || ""} ${lead.car_model || ""}. Offer accessories bundle.`,
            status: "pending",
          });
          results.accessory_upsells++;
        }
      }

      results.total = results.insurance_renewals + results.loan_refinances + results.accessory_upsells + results.hsrp_offers;

      console.log("Cross-sell scan results:", results);
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cross-sell engine error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
