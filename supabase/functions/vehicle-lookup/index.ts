import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseDateFlexible(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // Try multiple formats: dd-mm-yyyy, dd/mm/yyyy, yyyy-mm-dd
  const parts = dateStr.split(/[-\/]/);
  if (parts.length !== 3) return null;
  let d: Date;
  if (parts[0].length === 4) {
    d = new Date(dateStr);
  } else {
    d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return isNaN(d.getTime()) ? null : d;
}

function toDateStr(d: Date | null): string | null {
  return d ? d.toISOString().split("T")[0] : null;
}

function transformSurepassResponse(raw: any, vehicleNumber: string) {
  const d = raw.data || raw;
  const now = new Date();

  // Parse dates
  const regDate = parseDateFlexible(d.registration_date || d.reg_date);
  const vehicleAge = regDate ? Math.floor((now.getTime() - regDate.getTime()) / (365.25 * 86400000)) : null;

  const insDate = parseDateFlexible(d.insurance_upto || d.insurance_validity);
  const insuranceExpiry = toDateStr(insDate);
  const insuranceDaysLeft = insDate ? Math.floor((insDate.getTime() - now.getTime()) / 86400000) : null;

  const pucDate = parseDateFlexible(d.pucc_upto || d.puc_validity || d.pucc_validity);
  const fitDate = parseDateFlexible(d.fitness_upto || d.fitness_validity || d.fit_up_to);

  // Build maker_model from various possible fields
  const maker = d.maker || d.vehicle_manufacturer_name || d.maker_description || "";
  const model = d.maker_model || d.model || d.vehicle_model || d.maker_model_description || "";
  const makerModel = model || maker || "N/A";

  // Address fields
  const address = d.present_address || d.permanent_address || d.address || null;

  // Mobile number
  const mobile = d.mobile_number || d.owner_mobile_no || d.mobile || null;

  return {
    registration_number: d.rc_number || d.registration_number || d.reg_no || vehicleNumber,
    owner_name: d.owner_name || d.current_owner_name || "N/A",
    father_name: d.father_name || d.owner_father_name || null,
    mobile_number: mobile,
    present_address: address,
    vehicle_class: d.vehicle_class_desc || d.vehicle_class || d.vh_class_desc || d.class_of_vehicle || "N/A",
    fuel_type: d.fuel_descr || d.fuel_type || d.type_of_fuel || d.fuel_description || "N/A",
    maker_model: makerModel,
    maker: maker || null,
    registration_date: toDateStr(regDate),
    insurance_expiry: insuranceExpiry,
    insurance_company: d.insurance_company || d.insurer || d.insurance_name || null,
    insurance_policy_number: d.insurance_policy_number || d.policy_number || null,
    puc_expiry: toDateStr(pucDate),
    fitness_expiry: toDateStr(fitDate),
    rto: d.registered_at || d.rto || d.office_name || d.registering_authority || "N/A",
    chassis_number: d.vehicle_chasi_number || d.chassis_number || d.chasi_number || "N/A",
    engine_number: d.vehicle_engine_number || d.engine_number || "N/A",
    vehicle_age_years: vehicleAge,
    hypothecation: d.financer || d.hypothecation || d.financing_authority || null,
    vehicle_color: d.color || d.vehicle_color || null,
    vehicle_category: d.vehicle_category || d.category || null,
    norms_type: d.norms_type || d.emission_norms || null,
    source: "surepass" as const,
    triggers: {
      insurance_renewal: insuranceDaysLeft !== null && insuranceDaysLeft <= 60,
      insurance_days_left: insuranceDaysLeft,
      loan_refinance: vehicleAge !== null && vehicleAge >= 2 && !!(d.financer || d.hypothecation || d.financing_authority),
      puc_renewal: pucDate ? (pucDate < now || (pucDate.getTime() - now.getTime()) / 86400000 <= 30) : false,
      fitness_renewal: fitDate ? (fitDate < now || (fitDate.getTime() - now.getTime()) / 86400000 <= 60) : false,
    },
  };
}

function mockVahanData(vehicleNumber: string) {
  const now = new Date();
  const stateCode = vehicleNumber.substring(0, 2);
  const lastDigit = parseInt(vehicleNumber.slice(-1));
  const isOldVehicle = lastDigit >= 7;
  const regYearsAgo = isOldVehicle ? (5 + lastDigit - 7) : (1 + lastDigit);
  const regDate = new Date(now);
  regDate.setFullYear(regDate.getFullYear() - regYearsAgo);

  const isExpired = lastDigit === 0;
  const isExpiringSoon = lastDigit <= 3;
  let insuranceExpiry: string | null = null;
  let insuranceDaysLeft: number | null = null;
  if (isExpired) {
    const exp = new Date(now); exp.setDate(exp.getDate() - 15);
    insuranceExpiry = toDateStr(exp); insuranceDaysLeft = -15;
  } else if (isExpiringSoon) {
    const daysLeft = lastDigit * 15 + 5;
    const exp = new Date(now); exp.setDate(exp.getDate() + daysLeft);
    insuranceExpiry = toDateStr(exp); insuranceDaysLeft = daysLeft;
  } else {
    const daysLeft = 90 + lastDigit * 30;
    const exp = new Date(now); exp.setDate(exp.getDate() + daysLeft);
    insuranceExpiry = toDateStr(exp); insuranceDaysLeft = daysLeft;
  }

  const pucExpiry = new Date(now);
  pucExpiry.setMonth(pucExpiry.getMonth() + (lastDigit <= 2 ? -1 : 4));
  const fitnessExpiry = new Date(now);
  fitnessExpiry.setFullYear(fitnessExpiry.getFullYear() + (isOldVehicle ? 0 : 2));

  const makers = ["Maruti Suzuki Swift","Hyundai Creta","Tata Nexon","Kia Seltos","Mahindra XUV700","Toyota Fortuner","Honda City","MG Hector","Skoda Slavia","Volkswagen Virtus"];
  const insurers = ["ICICI Lombard","HDFC Ergo","Bajaj Allianz","New India Assurance","Oriental Insurance","SBI General","Tata AIG","United India","Reliance General","National Insurance"];
  const fuels = ["Petrol","Diesel","CNG","Petrol","Diesel","Diesel","Petrol","Petrol+CNG","Petrol","Petrol"];
  const rtoMap: Record<string,string> = { DL:"Delhi",MH:"Maharashtra",KA:"Karnataka",TN:"Tamil Nadu",UP:"Uttar Pradesh",RJ:"Rajasthan",GJ:"Gujarat",HR:"Haryana",PB:"Punjab",WB:"West Bengal",AP:"Andhra Pradesh",TS:"Telangana" };

  return {
    registration_number: vehicleNumber,
    owner_name: `Owner - ${vehicleNumber.substring(0,4)}****`,
    father_name: null,
    mobile_number: null,
    present_address: null,
    vehicle_class: lastDigit > 5 ? "Motor Car (LMV)" : "Motor Car (LMV-Non Transport)",
    fuel_type: fuels[lastDigit],
    maker_model: makers[lastDigit],
    maker: null,
    registration_date: toDateStr(regDate),
    insurance_expiry: insuranceExpiry,
    insurance_company: insurers[lastDigit],
    insurance_policy_number: null,
    puc_expiry: toDateStr(pucExpiry),
    fitness_expiry: toDateStr(fitnessExpiry),
    rto: `${stateCode} — ${rtoMap[stateCode] || "RTO Office"}`,
    chassis_number: `CH${Math.floor(Math.random()*999999).toString().padStart(6,"0")}`,
    engine_number: `ENG${Math.floor(Math.random()*999999).toString().padStart(6,"0")}`,
    vehicle_age_years: regYearsAgo,
    hypothecation: isOldVehicle ? "HDFC Bank Ltd" : null,
    vehicle_color: null,
    vehicle_category: null,
    norms_type: null,
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
        console.log("Surepass response status:", resp.status);
        // Log full response for debugging field mapping
        console.log("Surepass full response:", JSON.stringify(surepassData).substring(0, 2000));

        if (resp.ok && (surepassData.success || surepassData.status_code === 200 || surepassData.data)) {
          const transformed = transformSurepassResponse(surepassData, vehicle_number);
          return new Response(JSON.stringify(transformed), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          console.warn("Surepass API error:", surepassData.message || JSON.stringify(surepassData));
        }
      } catch (apiError) {
        console.error("Surepass API call failed:", apiError);
      }
    }

    // Fallback to mock
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
