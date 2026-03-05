import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Vehicle RC Lookup — Placeholder for API Setu (VAHAN/Parivahan) Integration
 * 
 * Once API Setu credentials are configured, this function will call:
 * POST https://apisetu.gov.in/api/v2/vahan/rc/{state_code}
 * Headers: X-APISETU-APIKEY, X-APISETU-CLIENTID
 * Body: { "reg_no": "DL01AB1234", "consent": "Y" }
 * 
 * For now, returns structured mock data matching the real API response shape.
 */

function mockVahanData(vehicleNumber: string) {
  const now = new Date();
  const stateCode = vehicleNumber.substring(0, 2);
  
  // Simulate different scenarios based on vehicle number patterns
  const lastDigit = parseInt(vehicleNumber.slice(-1));
  const isExpiringSoon = lastDigit <= 3; // 0-3: insurance expiring soon
  const isExpired = lastDigit === 0;     // 0: already expired
  const isOldVehicle = lastDigit >= 7;   // 7-9: old vehicle (loan refinance candidate)

  // Registration date: 1-10 years ago based on last digit
  const regYearsAgo = isOldVehicle ? (5 + lastDigit - 7) : (1 + lastDigit);
  const regDate = new Date(now);
  regDate.setFullYear(regDate.getFullYear() - regYearsAgo);

  // Insurance expiry
  let insuranceExpiry: string | null = null;
  let insuranceDaysLeft: number | null = null;
  if (isExpired) {
    const exp = new Date(now);
    exp.setDate(exp.getDate() - 15);
    insuranceExpiry = exp.toISOString().split("T")[0];
    insuranceDaysLeft = -15;
  } else if (isExpiringSoon) {
    const daysLeft = lastDigit * 15 + 5; // 5, 20, 35 days
    const exp = new Date(now);
    exp.setDate(exp.getDate() + daysLeft);
    insuranceExpiry = exp.toISOString().split("T")[0];
    insuranceDaysLeft = daysLeft;
  } else {
    const daysLeft = 90 + lastDigit * 30;
    const exp = new Date(now);
    exp.setDate(exp.getDate() + daysLeft);
    insuranceExpiry = exp.toISOString().split("T")[0];
    insuranceDaysLeft = daysLeft;
  }

  // PUC expiry
  const pucExpiry = new Date(now);
  pucExpiry.setMonth(pucExpiry.getMonth() + (lastDigit <= 2 ? -1 : 4));

  // Fitness expiry
  const fitnessExpiry = new Date(now);
  fitnessExpiry.setFullYear(fitnessExpiry.getFullYear() + (isOldVehicle ? 0 : 2));

  const vehicleAge = regYearsAgo;

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
    vehicle_age_years: vehicleAge,
    hypothecation: isOldVehicle ? "HDFC Bank Ltd" : null,
    triggers: {
      insurance_renewal: insuranceDaysLeft !== null && insuranceDaysLeft <= 60,
      insurance_days_left: insuranceDaysLeft,
      loan_refinance: vehicleAge >= 2 && !!( isOldVehicle),
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

    // TODO: Replace with real API Setu call when credentials are configured
    // const API_SETU_KEY = Deno.env.get("API_SETU_KEY");
    // const API_SETU_CLIENT = Deno.env.get("API_SETU_CLIENT_ID");
    // if (API_SETU_KEY && API_SETU_CLIENT) {
    //   const stateCode = vehicle_number.substring(0, 2);
    //   const resp = await fetch(`https://apisetu.gov.in/api/v2/vahan/rc/${stateCode}`, {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       "X-APISETU-APIKEY": API_SETU_KEY,
    //       "X-APISETU-CLIENTID": API_SETU_CLIENT,
    //     },
    //     body: JSON.stringify({ reg_no: vehicle_number, consent: "Y" }),
    //   });
    //   const data = await resp.json();
    //   // Transform and return real data...
    // }

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
