import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseDateFlexible(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split(/[-\/]/);
  if (parts.length !== 3) return null;
  let d: Date;
  if (parts[0].length === 4) d = new Date(dateStr);
  else d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  return isNaN(d.getTime()) ? null : d;
}

function toDateStr(d: Date | null): string | null {
  return d ? d.toISOString().split("T")[0] : null;
}

// Premium calculation engine (mirrors client-side logic)
function calculatePremium(enrichedData: any) {
  const fuelType = (enrichedData.fuel_type || "").toLowerCase();
  const makerModel = enrichedData.maker_model || "";
  const vehicleAge = enrichedData.vehicle_age_years || 0;

  // Estimate engine CC from maker_model heuristics
  let estimatedCC = 1200; // default
  const modelLower = makerModel.toLowerCase();
  if (modelLower.includes("fortuner") || modelLower.includes("xuv700") || modelLower.includes("innova") || modelLower.includes("scorpio")) {
    estimatedCC = 2000;
  } else if (modelLower.includes("creta") || modelLower.includes("seltos") || modelLower.includes("hector") || modelLower.includes("nexon")) {
    estimatedCC = 1500;
  } else if (modelLower.includes("swift") || modelLower.includes("i20") || modelLower.includes("baleno") || modelLower.includes("alto") || modelLower.includes("wagon")) {
    estimatedCC = 1200;
  } else if (modelLower.includes("city") || modelLower.includes("verna") || modelLower.includes("slavia") || modelLower.includes("virtus")) {
    estimatedCC = 1500;
  }

  // IDV estimation based on ex-showroom price and vehicle age
  // Use ex_showroom_price if available, otherwise estimate from CC
  let basePrice = enrichedData.ex_showroom_price || 800000;
  if (!enrichedData.ex_showroom_price) {
    if (estimatedCC > 1500) basePrice = 1500000;
    else if (estimatedCC > 1000) basePrice = 1000000;
    else basePrice = 600000;
  }

  // Depreciation: Year 0 (new) = 5%, then +10% every subsequent year
  // Year 0: 5%, Year 1: 15%, Year 2: 25%, Year 3: 35%, Year 4: 45%...
  // Minimum IDV = 10% of ex-showroom (cap at 90% depreciation)
  const depRate = Math.min(0.90, 0.05 + vehicleAge * 0.10);
  const idv = Math.round(basePrice * (1 - depRate));

  // OD calculation (Zone B rates)
  const odRate = estimatedCC > 1500 ? 0.03343 : 0.03191;
  const basicOD = Math.round(idv * odRate);

  // NCB - auto by vehicle age (year-wise slab)
  // Age 0: 0%, Age 1: 20%, Age 2: 25%, Age 3: 35%, Age 4: 45%, Age 5+: 50%
  let ncbPercent = 0;
  if (vehicleAge >= 5) ncbPercent = 50;
  else if (vehicleAge === 4) ncbPercent = 45;
  else if (vehicleAge === 3) ncbPercent = 35;
  else if (vehicleAge === 2) ncbPercent = 25;
  else if (vehicleAge === 1) ncbPercent = 20;

  // NCB applied on OD AFTER OD discount
  const odAfterDiscount = basicOD - odDiscount;
  const ncbDiscount = Math.round(odAfterDiscount * ncbPercent / 100);

  // TP rates 2026
  let tp = 3416; // 1000-1500cc
  if (estimatedCC < 1000) tp = 2094;
  else if (estimatedCC > 1500) tp = 7897;

  // OD discount (market competitive - 10%)
  const odDiscount = Math.round(basicOD * 0.10);

  const netOD = basicOD - odDiscount - ncbDiscount;
  const subtotal = netOD + tp;
  const gst = Math.round(subtotal * 0.18);
  const securePremium = subtotal + gst;

  return {
    idv,
    basic_od: basicOD,
    od_discount: odDiscount,
    ncb_discount: ncbDiscount,
    third_party: tp,
    secure_premium: securePremium,
    addon_premium: 0,
    estimated_cc: estimatedCC,
    ncb_percent: ncbPercent,
  };
}

function transformSurepassData(raw: any, vehicleNumber: string) {
  const d = raw.data || raw;
  const now = new Date();
  const regDate = parseDateFlexible(d.registration_date || d.reg_date);
  const vehicleAge = regDate ? Math.floor((now.getTime() - regDate.getTime()) / (365.25 * 86400000)) : null;
  const insDate = parseDateFlexible(d.insurance_upto || d.insurance_validity);
  const insuranceExpiry = toDateStr(insDate);
  const insuranceDaysLeft = insDate ? Math.floor((insDate.getTime() - now.getTime()) / 86400000) : null;
  const maker = d.maker || d.vehicle_manufacturer_name || d.maker_description || "";
  const model = d.maker_model || d.model || d.vehicle_model || d.maker_model_description || "";
  const makerModel = model || maker || "N/A";
  const mobile = d.mobile_number || d.owner_mobile_no || d.mobile || null;

  return {
    registration_number: d.rc_number || d.registration_number || d.reg_no || vehicleNumber,
    owner_name: d.owner_name || d.current_owner_name || "N/A",
    mobile_number: mobile,
    vehicle_class: d.vehicle_class_desc || d.vehicle_class || d.vh_class_desc || "N/A",
    fuel_type: d.fuel_descr || d.fuel_type || d.type_of_fuel || "N/A",
    maker_model: makerModel,
    maker: maker || null,
    registration_date: toDateStr(regDate),
    insurance_expiry: insuranceExpiry,
    insurance_company: d.insurance_company || d.insurer || d.insurance_name || null,
    insurance_days_left: insuranceDaysLeft,
    vehicle_age_years: vehicleAge,
    vehicle_color: d.color || d.vehicle_color || null,
    rto: d.registered_at || d.rto || d.office_name || "N/A",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUREPASS_TOKEN = Deno.env.get("SUREPASS_API_TOKEN");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing server config" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { prospects, batch_label } = await req.json();

    // prospects = [{ name, phone, vehicle_number }]
    if (!Array.isArray(prospects) || prospects.length === 0) {
      return new Response(JSON.stringify({ error: "prospects array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (prospects.length > 500) {
      return new Response(JSON.stringify({ error: "Max 500 prospects per batch" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    const errors: any[] = [];
    let enrichedCount = 0;
    let mockCount = 0;

    for (let i = 0; i < prospects.length; i++) {
      const p = prospects[i];
      const cleanVehicle = (p.vehicle_number || "").replace(/\s+/g, "").toUpperCase();
      const cleanPhone = (p.phone || "").replace(/\D/g, "").replace(/^91/, "");

      if (!cleanVehicle || cleanVehicle.length < 5) {
        errors.push({ index: i, name: p.name, error: "Invalid vehicle number" });
        continue;
      }

      let enriched: any = null;
      let source = "mock";

      // Try Surepass API
      if (SUREPASS_TOKEN) {
        try {
          const resp = await fetch("https://sandbox.surepass.app/api/v1/rc/rc-v2", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUREPASS_TOKEN}`,
            },
            body: JSON.stringify({ id_number: cleanVehicle }),
          });

          const data = await resp.json();
          if (resp.ok && (data.success || data.status_code === 200 || data.data)) {
            enriched = transformSurepassData(data, cleanVehicle);
            source = "surepass";
            enrichedCount++;
          }
        } catch (e) {
          console.error(`Surepass failed for ${cleanVehicle}:`, e);
        }

        // Rate limit: ~50/min
        if (i < prospects.length - 1) {
          await new Promise(r => setTimeout(r, 1200));
        }
      }

      // Fallback mock enrichment
      if (!enriched) {
        mockCount++;
        enriched = {
          registration_number: cleanVehicle,
          owner_name: p.name || "N/A",
          mobile_number: cleanPhone || null,
          fuel_type: "Petrol",
          maker_model: "Unknown Model",
          maker: null,
          insurance_company: "Unknown",
          insurance_expiry: null,
          insurance_days_left: null,
          vehicle_age_years: 3,
          vehicle_color: null,
          rto: cleanVehicle.substring(0, 2),
        };
      }

      // Calculate premium
      const premium = calculatePremium(enriched);

      // Parse maker/model
      const makerModel = enriched.maker_model || "";
      const parts = makerModel.split(/\s+/);
      const vehicleMake = enriched.maker || parts[0] || "Unknown";
      const vehicleModel = parts.slice(1).join(" ") || makerModel || "Unknown";

      const quoteRecord = {
        customer_name: p.name || enriched.owner_name || "Customer",
        phone: cleanPhone || enriched.mobile_number || "",
        email: p.email || null,
        city: p.city || null,
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_number: cleanVehicle,
        vehicle_year: enriched.registration_date
          ? new Date(enriched.registration_date).getFullYear()
          : new Date().getFullYear() - (enriched.vehicle_age_years || 0),
        fuel_type: enriched.fuel_type || "Petrol",
        insurance_company: enriched.insurance_company || "N/A",
        policy_type: "Comprehensive",
        idv: premium.idv,
        basic_od: premium.basic_od,
        od_discount: premium.od_discount,
        ncb_discount: premium.ncb_discount,
        third_party: premium.third_party,
        secure_premium: premium.secure_premium,
        addon_premium: 0,
        addons: [],
        status: "draft",
        notes: `Source: ${source} | Insurance Expiry: ${enriched.insurance_expiry || "N/A"} | Days Left: ${enriched.insurance_days_left ?? "N/A"}`,
        batch_label: batch_label || `Batch-${new Date().toISOString().split("T")[0]}`,
      };

      results.push(quoteRecord);
    }

    // Insert in batches of 100
    let insertedCount = 0;
    for (let i = 0; i < results.length; i += 100) {
      const batch = results.slice(i, i + 100);
      const { data, error } = await supabase
        .from("bulk_renewal_quotes")
        .insert(batch)
        .select("id");
      if (error) {
        console.error("Insert error:", error);
        errors.push({ batch: Math.floor(i / 100), error: error.message });
      } else {
        insertedCount += data?.length || 0;
      }
    }

    console.log(`Bulk RC enrichment complete: ${insertedCount} inserted, ${enrichedCount} enriched via API, ${mockCount} mock, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      total_processed: results.length,
      inserted: insertedCount,
      enriched_via_api: enrichedCount,
      mock_fallback: mockCount,
      errors,
      batch_label: results[0]?.batch_label || batch_label,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Bulk RC enrichment error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
