import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// State-wise RTO rates
const stateRates: Record<string, { rtoPercent: number; roadTaxPercent: number }> = {
  DL: { rtoPercent: 4.0, roadTaxPercent: 4.0 },
  MH: { rtoPercent: 7.0, roadTaxPercent: 11.0 },
  KA: { rtoPercent: 8.0, roadTaxPercent: 13.0 },
  TN: { rtoPercent: 6.0, roadTaxPercent: 10.0 },
  GJ: { rtoPercent: 4.5, roadTaxPercent: 6.0 },
  UP: { rtoPercent: 5.0, roadTaxPercent: 8.0 },
  RJ: { rtoPercent: 4.0, roadTaxPercent: 6.0 },
  HR: { rtoPercent: 4.0, roadTaxPercent: 5.0 },
};

function calculatePriceBreakup(exShowroom: number, stateCode: string = "DL") {
  const rates = stateRates[stateCode] || stateRates.DL;
  
  const rto = Math.round(exShowroom * (rates.rtoPercent / 100));
  const roadTax = Math.round(exShowroom * (rates.roadTaxPercent / 100));
  const insurance = Math.round(exShowroom * 0.03); // 3% insurance
  const tcs = exShowroom > 1000000 ? Math.round(exShowroom * 0.01) : 0;
  const fastag = 500;
  const registration = 1000;
  const handling = 15000;
  // Agent/Processing fees: ₹7,550 for cars above ₹10 Lakh
  const agentFees = exShowroom > 1000000 ? 7550 : 0;
  
  const onRoadPrice = exShowroom + rto + roadTax + insurance + tcs + fastag + registration + handling + agentFees;
  
  return {
    ex_showroom: exShowroom,
    rto,
    insurance,
    tcs,
    fastag,
    registration,
    handling,
    on_road_price: onRoadPrice
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all variants
    const { data: variants, error: variantError } = await supabase
      .from('car_variants')
      .select('id, car_id, name, price_numeric')
      .not('price_numeric', 'is', null);

    if (variantError) throw variantError;

    let updated = 0;
    let cityPricingAdded = 0;

    for (const variant of variants || []) {
      if (!variant.price_numeric) continue;

      const breakup = calculatePriceBreakup(variant.price_numeric);

      // Update variant with price breakup
      const { error: updateError } = await supabase
        .from('car_variants')
        .update({
          ex_showroom: breakup.ex_showroom,
          rto: breakup.rto,
          insurance: breakup.insurance,
          tcs: breakup.tcs,
          fastag: breakup.fastag,
          registration: breakup.registration,
          handling: breakup.handling,
          on_road_price: breakup.on_road_price
        })
        .eq('id', variant.id);

      if (!updateError) updated++;

      // Add city-wise pricing for major cities
      const cities = [
        { state: "Delhi", city: "New Delhi", code: "DL" },
        { state: "Maharashtra", city: "Mumbai", code: "MH" },
        { state: "Karnataka", city: "Bangalore", code: "KA" },
        { state: "Tamil Nadu", city: "Chennai", code: "TN" },
        { state: "Gujarat", city: "Ahmedabad", code: "GJ" },
        { state: "Uttar Pradesh", city: "Noida", code: "UP" },
        { state: "Haryana", city: "Gurugram", code: "HR" },
      ];

      for (const cityInfo of cities) {
        const cityBreakup = calculatePriceBreakup(variant.price_numeric, cityInfo.code);
        
        await supabase
          .from('car_city_pricing')
          .upsert({
            car_id: variant.car_id,
            variant_id: variant.id,
            state: cityInfo.state,
            city: cityInfo.city,
            ex_showroom: cityBreakup.ex_showroom,
            rto: cityBreakup.rto,
            insurance: cityBreakup.insurance,
            tcs: cityBreakup.tcs,
            fastag: cityBreakup.fastag,
            registration: cityBreakup.registration,
            handling: cityBreakup.handling,
            on_road_price: cityBreakup.on_road_price,
            is_active: true
          }, { onConflict: 'car_id,variant_id,city' });
        
        cityPricingAdded++;
      }
    }

    // Update cars table with price range from variants - all brands
    const { data: cars } = await supabase
      .from('cars')
      .select('id, name')
      .not('brand', 'is', null);

    for (const car of cars || []) {
      const { data: carVariants } = await supabase
        .from('car_variants')
        .select('price_numeric, on_road_price')
        .eq('car_id', car.id)
        .order('price_numeric', { ascending: true });

      if (carVariants && carVariants.length > 0) {
        const minPrice = carVariants[0].price_numeric;
        const maxPrice = carVariants[carVariants.length - 1].price_numeric;
        
        const formatPrice = (p: number) => {
          if (p >= 10000000) return `₹${(p / 10000000).toFixed(2)} Cr`;
          return `₹${(p / 100000).toFixed(2)} Lakh`;
        };

        const priceRange = minPrice === maxPrice 
          ? formatPrice(minPrice)
          : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;

        await supabase
          .from('cars')
          .update({ 
            price_range: priceRange,
            price_numeric: minPrice 
          })
          .eq('id', car.id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      variantsUpdated: updated,
      cityPricingRecords: cityPricingAdded,
      message: `Updated ${updated} variants with price breakups and ${cityPricingAdded} city pricing records`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Pricing update error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
