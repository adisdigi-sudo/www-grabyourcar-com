import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Vehicle RC Lookup via Surepass API
 * Endpoint: https://sandbox.surepass.app/api/v1/rc/rc-v2
 * Falls back to mock data if SUREPASS_API_TOKEN is not configured.
 */

function mockVahanData(vehicleNumber: string) {
  const now = new Date();
  const stateCode = vehicleNumber.substring(0, 2);
  const lastDigit = parseInt(vehicleNumber.slice(-1));
  const isExpiringSoon = lastDigit <= 3;
  const isExpired = lastDigit === 0;
  const isOldVehicle = lastDigit >= 7;
  const regYearsAgo = isOldVehicle ? (5 + lastDigit - 7) : (1 + lastDigit);
  const regDate = new Date(now);
  regDate.setFullYear(regDate.getFullYear() - regYearsAgo);

  let insuranceExpiry: string | null = null;
  let insuranceDaysLeft: number | null = null;
  if (isExpired) {
    const exp = new Date(now); exp.setDate(exp.getDate() - 15);
    insuranceExpiry = exp.toISOString().split("T")[0]; insuranceDaysLeft = -15;
  } else if (isExpiringSoon) {
    const daysLeft = lastDigit * 15 + 5;
    const exp = new Date(now); exp.setDate(exp.getDate() + daysLeft);
    insuranceExpiry = exp.toISOString().split("T")[0]; insuranceDaysLeft = daysLeft;
  } else {
    const daysLeft = 90 + lastDigit * 30;
    const exp = new Date(now); exp.setDate(exp.getDate() + daysLeft);
    insuranceExpiry = exp.toISOString().split("T")[0]; insuranceDaysLeft = daysLeft;
  }

  const pucExpiry = new Date(now);
  pucExpiry.setMonth(pucExpiry.getMonth() + (lastDigit <= 2 ? -1 : 4));
  const fitnessExpiry = new Date(now);
  fitnessExpiry.setFullYear(fitnessExpiry.getFullYear() + (isOldVehicle ? 0 : 2));

  const makers = ["Maruti Suzuki Swift", "Hyundai Creta", "Tata Nexon", "Kia Seltos", "Mahindra XUV700", "Toyota Fortuner", "Honda City", "MG Hector", "Skoda Slavia", "Volkswagen Virtus"];
  const insurers = ["ICICI Lombard", "HDFC Ergo", "Bajaj Allianz", "New India Assurance", "Oriental Insurance", "SBI General", "Tata AIG", "United India", "Reliance General", "National Insurance"];
  const fuels = ["Petrol", "Diesel", "CNG", "Petrol", "Diesel", "Diesel", "Petrol", "Petrol+CNG", "Petrol", "Petrol"];

  const rtoMap: Record<string, string> = {
    DL: "Delhi", MH: "Maharashtra", KA: "Karnataka", TN: "Tamil Nadu",
    UP: "Uttar Pradesh", RJ: "Rajasthan", GJ: "Gujarat", HR: "Haryana",
    PB: "Punjab", WB: "West Bengal", AP: "Andhra Pradesh", TS: "Telangana",
  };

  return {
    registration_number: vehicleNumber,
    owner_name: `Owner - ${vehicleNumber.substring(0, 4)}****`,
    vehicle_class: lastDigit > 5 ? "Motor Car (LMV)" : "Motor Car (LMV-Non Transport)",
    fuel_type: fuels[lastDigit],
    maker_model: makers[lastDigit],
    registration_date: regDate.toISOString().split("T")[0],
    insurance_expiry: insuranceExpiry,
    insurance_company: insurers[lastDigit],
    puc_expiry: pucExpiry.toISOString().split("T")[0],
    fitness_expiry: fitnessExpiry.toISOString().split("T")[0],
    rto: `${stateCode} — ${rtoMap[stateCode] || "RTO Office"}`,
    chassis_number: `MAKE${vehicleNumber.replace(/\s/g, "")}CH${Math.floor(Math.random() * 9999).toString().padStart(4, "0")}`,
    engine_number: `ENG${Math.floor(Math.random() * 999999).toString().padStart(6, "0")}`,
    vehicle_age_years: regYearsAgo,
    hypothecation: isOldVehicle ? "HDFC Bank Ltd" : null,
    source: "mock" as const,
    triggers: {
      insurance_renewal: insuranceDaysLeft !== null && insuranceDaysLeft <= 60,
      insurance_days_left: insuranceDaysLeft,
      loan_refinance: regYearsAgo >= 2 && isOldVehicle,
      puc_renewal: pucExpiry < now || (pucExpiry.getTime() - now.getTime()) / 86400000 <= 30,
      fitness_renewal: fitnessExpiry < now || (fitnessExpiry.getTime() - now.getTime()) / 86400000 <= 60,
    },
  };
}

function transformSurepassResponse(data: any, vehicleNumber: string) {
  const d = data.data || data;
  const now = new Date();

  // Parse registration date
  const regDateStr = d.registration_date || d.reg_date || null;
  let regDate: Date | null = null;
  if (regDateStr) {
    // Surepass may return dd-mm-yyyy or dd/mm/yyyy
    const parts = regDateStr.split(/[-\/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        regDate = new Date(regDateStr);
      } else {
        regDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
  }

  const vehicleAge = regDate ? Math.floor((now.getTime() - regDate.getTime()) / (365.25 * 86400000)) : null;

  // Insurance expiry
  const insExpiryStr = d.insurance_upto || d.insurance_validity || null;
  let insuranceExpiry: string | null = null;
  let insuranceDaysLeft: number | null = null;
  if (insExpiryStr) {
    const parts = insExpiryStr.split(/[-\/]/);
    let insDate: Date;
    if (parts[0].length === 4) {
      insDate = new Date(insExpiryStr);
    } else {
      insDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    if (!isNaN(insDate.getTime())) {
      insuranceExpiry = insDate.toISOString().split("T")[0];
      insuranceDaysLeft = Math.floor((insDate.getTime() - now.getTime()) / 86400000);
    }
  }

  // PUC expiry
  const pucStr = d.pucc_upto || d.puc_validity || null;
  let pucExpiry: string | null = null;
  if (pucStr) {
    const parts = pucStr.split(/[-\/]/);
    const pucDate = parts[0].length === 4 ? new Date(pucStr) : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!isNaN(pucDate.getTime())) pucExpiry = pucDate.toISOString().split("T")[0];
  }

  // Fitness expiry
  const fitStr = d.fitness_upto || d.fitness_validity || null;
  let fitnessExpiry: string | null = null;
  if (fitStr) {
    const parts = fitStr.split(/[-\/]/);
    const fitDate = parts[0].length === 4 ? new Date(fitStr) : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!isNaN(fitDate.getTime())) fitnessExpiry = fitDate.toISOString().split("T")[0];
  }

  const pucDate = pucExpiry ? new Date(pucExpiry) : null;
  const fitDate = fitnessExpiry ? new Date(fitnessExpiry) : null;

  // Build maker_model from available fields
  const maker = d.maker || d.vehicle_manufacturer_name || "";
  const model = d.maker_model || d.model || d.vehicle_model || "";
  const makerModel = model || maker || "Unknown";

  return {
    registration_number: d.rc_number || d.registration_number || vehicleNumber,
    owner_name: d.owner_name || d.current_owner_name || "N/A",
    vehicle_class: d.vehicle_class_desc || d.vehicle_class || d.vh_class_desc || "N/A",
    fuel_type: d.fuel_descr || d.fuel_type || d.type_of_fuel || "N/A",
    maker_model: makerModel,
    registration_date: regDate ? regDate.toISOString().split("T")[0] : null,
    insurance_expiry: insuranceExpiry,
    insurance_company: d.insurance_company || d.insurer || null,
    puc_expiry: pucExpiry,
    fitness_expiry: fitnessExpiry,
    rto: d.registered_at || d.rto || d.office_name || "N/A",
    chassis_number: d.chassis_number || d.chasi_number || d.vehicle_chasi_number || "N/A",
    engine_number: d.engine_number || d.vehicle_engine_number || "N/A",
    vehicle_age_years: vehicleAge,
    hypothecation: d.financer || d.hypothecation || null,
    source: "surepass" as const,
    triggers: {
      insurance_renewal: insuranceDaysLeft !== null && insuranceDaysLeft <= 60,
      insurance_days_left: insuranceDaysLeft,
      loan_refinance: vehicleAge !== null && vehicleAge >= 2 && !!(d.financer || d.hypothecation),
      puc_renewal: pucDate ? (pucDate < now || (pucDate.getTime() - now.getTime()) / 86400000 <= 30) : false,
      fitness_renewal: fitDate ? (fitDate < now || (fitDate.getTime() - now.getTime()) / 86400000 <= 60) : false,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { vehicle_number } = await req.json();

    if (!vehicle_number || !/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(vehicle_number)) {
      return new Response(
        JSON.stringify({ error: "Invalid vehicle registration number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUREPASS_TOKEN = Deno.env.get("SUREPASS_API_TOKEN");

    if (SUREPASS_TOKEN) {
      try {
        console.log("Calling Surepass RC API for:", vehicle_number);
        const resp = await fetch("https://sandbox.surepass.app/api/v1/rc/rc-v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUREPASS_TOKEN}`,
          },
          body: JSON.stringify({ id_number: vehicle_number }),
        });

        const surepassData = await resp.json();
        console.log("Surepass response status:", resp.status, "success:", surepassData?.success);

        if (resp.ok && (surepassData.success || surepassData.status_code === 200 || surepassData.data)) {
          const transformed = transformSurepassResponse(surepassData, vehicle_number);
          return new Response(JSON.stringify(transformed), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          console.warn("Surepass API returned error:", JSON.stringify(surepassData));
          // Fall through to mock data
        }
      } catch (apiError) {
        console.error("Surepass API call failed:", apiError);
        // Fall through to mock data
      }
    }

    // Fallback to mock data
    const data = mockVahanData(vehicle_number);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Vehicle lookup error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
