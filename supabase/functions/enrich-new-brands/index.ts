import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Brand-specific enrichment data
const BRAND_DATA: Record<string, {
  variants: { name: string; price: string; priceNumeric: number; fuelType: string; transmission: string; features: string[] }[];
  specs: { category: string; label: string; value: string }[];
  images: { url: string; isPrimary: boolean }[];
}> = {
  "Tesla": {
    variants: [
      { name: "Model 3 Standard Range", price: "₹40.00 Lakh", priceNumeric: 4000000, fuelType: "Electric", transmission: "Automatic", features: ["Autopilot", "15\" Touchscreen", "Glass Roof", "360 km Range"] },
      { name: "Model 3 Long Range", price: "₹50.00 Lakh", priceNumeric: 5000000, fuelType: "Electric", transmission: "Automatic", features: ["Autopilot", "Premium Audio", "614 km Range", "Dual Motor AWD"] },
      { name: "Model Y Standard", price: "₹55.00 Lakh", priceNumeric: 5500000, fuelType: "Electric", transmission: "Automatic", features: ["7 Seats", "Autopilot", "Glass Roof", "450 km Range"] },
      { name: "Model S Plaid", price: "₹1.50 Cr", priceNumeric: 15000000, fuelType: "Electric", transmission: "Automatic", features: ["1020 HP", "2.1s 0-100", "Yoke Steering", "637 km Range"] },
    ],
    specs: [
      { category: "engine", label: "Motor Type", value: "Permanent Magnet Synchronous" },
      { category: "engine", label: "Power Output", value: "283 - 1020 HP" },
      { category: "engine", label: "Torque", value: "420 - 1400 Nm" },
      { category: "performance", label: "0-100 km/h", value: "2.1 - 6.1 seconds" },
      { category: "performance", label: "Top Speed", value: "225 - 322 km/h" },
      { category: "performance", label: "Range", value: "360 - 637 km" },
      { category: "features", label: "Autopilot", value: "Standard" },
      { category: "features", label: "Supercharging", value: "250 kW DC Fast Charging" },
      { category: "safety", label: "Safety Rating", value: "5-Star NHTSA" },
    ],
    images: [
      { url: "https://www.tesla.com/ownersmanual/images/GUID-B5641257-9E85-404B-9667-4DA5FD5E5E98-online-en-US.png", isPrimary: true },
    ]
  },
  "VinFast": {
    variants: [
      { name: "VF 5 Plus", price: "₹10.00 Lakh", priceNumeric: 1000000, fuelType: "Electric", transmission: "Automatic", features: ["190 km Range", "134 HP", "10.1\" Screen", "ADAS"] },
      { name: "VF 6 Eco", price: "₹18.00 Lakh", priceNumeric: 1800000, fuelType: "Electric", transmission: "Automatic", features: ["381 km Range", "174 HP", "Level 2 ADAS"] },
      { name: "VF 7 Plus", price: "₹35.00 Lakh", priceNumeric: 3500000, fuelType: "Electric", transmission: "Automatic", features: ["431 km Range", "349 HP", "AWD", "15.6\" Screen"] },
      { name: "VF 8 Eco", price: "₹50.00 Lakh", priceNumeric: 5000000, fuelType: "Electric", transmission: "Automatic", features: ["420 km Range", "402 HP", "AWD", "Premium Sound"] },
      { name: "VF 9 Plus", price: "₹80.00 Lakh", priceNumeric: 8000000, fuelType: "Electric", transmission: "Automatic", features: ["594 km Range", "402 HP", "7 Seats", "Air Suspension"] },
    ],
    specs: [
      { category: "engine", label: "Motor Type", value: "Permanent Magnet Synchronous" },
      { category: "engine", label: "Power Output", value: "134 - 402 HP" },
      { category: "engine", label: "Battery", value: "37.23 - 123 kWh" },
      { category: "performance", label: "0-100 km/h", value: "5.5 - 11.5 seconds" },
      { category: "performance", label: "Range", value: "190 - 594 km" },
      { category: "features", label: "Infotainment", value: "10.1 - 15.6\" Touchscreen" },
      { category: "features", label: "ADAS", value: "Level 2+ Autonomy" },
      { category: "safety", label: "Airbags", value: "6-8 Airbags" },
    ],
    images: []
  },
  "Rivian": {
    variants: [
      { name: "R1T Adventure", price: "₹75.00 Lakh", priceNumeric: 7500000, fuelType: "Electric", transmission: "Automatic", features: ["505 km Range", "835 HP", "Quad Motor", "Tank Turn"] },
      { name: "R1S Adventure", price: "₹80.00 Lakh", priceNumeric: 8000000, fuelType: "Electric", transmission: "Automatic", features: ["7 Seats", "505 km Range", "835 HP", "Air Suspension"] },
      { name: "R2 Standard", price: "₹45.00 Lakh", priceNumeric: 4500000, fuelType: "Electric", transmission: "Automatic", features: ["480 km Range", "Dual Motor", "Adventure Package"] },
    ],
    specs: [
      { category: "engine", label: "Motor Configuration", value: "Quad Motor AWD" },
      { category: "engine", label: "Power Output", value: "600 - 835 HP" },
      { category: "engine", label: "Torque", value: "1,231 Nm" },
      { category: "performance", label: "0-100 km/h", value: "3.0 seconds" },
      { category: "performance", label: "Range", value: "480 - 505 km" },
      { category: "performance", label: "Towing Capacity", value: "5,000 kg" },
      { category: "features", label: "Off-Road Mode", value: "Tank Turn, Wading 1m" },
      { category: "safety", label: "Driver Assist", value: "Driver+" },
    ],
    images: []
  },
  "Lucid": {
    variants: [
      { name: "Air Pure", price: "₹75.00 Lakh", priceNumeric: 7500000, fuelType: "Electric", transmission: "Automatic", features: ["660 km Range", "480 HP", "RWD", "Glass Canopy"] },
      { name: "Air Touring", price: "₹95.00 Lakh", priceNumeric: 9500000, fuelType: "Electric", transmission: "Automatic", features: ["685 km Range", "620 HP", "AWD", "DreamDrive"] },
      { name: "Air Grand Touring", price: "₹1.40 Cr", priceNumeric: 14000000, fuelType: "Electric", transmission: "Automatic", features: ["830 km Range", "819 HP", "AWD", "21 Speakers"] },
      { name: "Air Sapphire", price: "₹2.50 Cr", priceNumeric: 25000000, fuelType: "Electric", transmission: "Automatic", features: ["1,234 HP", "Tri-Motor", "1.89s 0-100", "Track Mode"] },
    ],
    specs: [
      { category: "engine", label: "Motor Type", value: "In-house Developed" },
      { category: "engine", label: "Power Output", value: "480 - 1,234 HP" },
      { category: "engine", label: "Battery", value: "88 - 118 kWh" },
      { category: "performance", label: "0-100 km/h", value: "1.89 - 4.5 seconds" },
      { category: "performance", label: "Range", value: "660 - 830 km" },
      { category: "performance", label: "Top Speed", value: "270 - 330 km/h" },
      { category: "features", label: "DreamDrive", value: "32 Sensors, LiDAR" },
      { category: "safety", label: "ADAS Level", value: "Level 2+" },
    ],
    images: []
  },
  "Polestar": {
    variants: [
      { name: "Polestar 2 Standard", price: "₹50.00 Lakh", priceNumeric: 5000000, fuelType: "Electric", transmission: "Automatic", features: ["478 km Range", "272 HP", "Google Built-in"] },
      { name: "Polestar 2 Long Range", price: "₹60.00 Lakh", priceNumeric: 6000000, fuelType: "Electric", transmission: "Automatic", features: ["592 km Range", "408 HP", "AWD", "Pilot Pack"] },
      { name: "Polestar 3 Long Range", price: "₹85.00 Lakh", priceNumeric: 8500000, fuelType: "Electric", transmission: "Automatic", features: ["610 km Range", "489 HP", "AWD", "Pilot Pack"] },
      { name: "Polestar 4 Long Range", price: "₹75.00 Lakh", priceNumeric: 7500000, fuelType: "Electric", transmission: "Automatic", features: ["580 km Range", "544 HP", "AWD", "No Rear Window"] },
    ],
    specs: [
      { category: "engine", label: "Motor Type", value: "Permanent Magnet Synchronous" },
      { category: "engine", label: "Power Output", value: "272 - 544 HP" },
      { category: "engine", label: "Battery", value: "69 - 111 kWh" },
      { category: "performance", label: "0-100 km/h", value: "3.8 - 7.4 seconds" },
      { category: "performance", label: "Range", value: "478 - 610 km" },
      { category: "features", label: "Infotainment", value: "Google Built-in" },
      { category: "features", label: "Sound", value: "Harman Kardon / B&W" },
      { category: "safety", label: "Pilot Assist", value: "Standard" },
    ],
    images: []
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { brand } = await req.json().catch(() => ({}));
    const brandsToEnrich = brand ? [brand] : Object.keys(BRAND_DATA);

    const results: { brand: string; cars: number; variants: number; specs: number }[] = [];

    for (const brandName of brandsToEnrich) {
      const enrichmentData = BRAND_DATA[brandName];
      if (!enrichmentData) continue;

      console.log(`Enriching brand: ${brandName}`);

      // Get all cars for this brand
      const { data: cars, error: carsError } = await supabase
        .from("cars")
        .select("id, name, slug")
        .eq("brand", brandName);

      if (carsError || !cars?.length) {
        console.log(`No cars found for ${brandName}`);
        continue;
      }

      let totalVariants = 0;
      let totalSpecs = 0;

      for (const car of cars) {
        // Add variants
        for (const variant of enrichmentData.variants) {
          // Check if variant already exists
          const { data: existing } = await supabase
            .from("car_variants")
            .select("id")
            .eq("car_id", car.id)
            .eq("name", variant.name)
            .single();

          if (!existing) {
            const { error: variantError } = await supabase
              .from("car_variants")
              .insert({
                car_id: car.id,
                name: variant.name,
                price: variant.price,
                price_numeric: variant.priceNumeric,
                fuel_type: variant.fuelType,
                transmission: variant.transmission,
                features: variant.features,
                ex_showroom: variant.priceNumeric,
                on_road_price: Math.round(variant.priceNumeric * 1.15), // ~15% on-road markup
              });

            if (!variantError) totalVariants++;
          }
        }

        // Add specifications (only if none exist)
        const { data: existingSpecs } = await supabase
          .from("car_specifications")
          .select("id")
          .eq("car_id", car.id)
          .limit(1);

        if (!existingSpecs?.length) {
          for (let i = 0; i < enrichmentData.specs.length; i++) {
            const spec = enrichmentData.specs[i];
            const { error: specError } = await supabase
              .from("car_specifications")
              .insert({
                car_id: car.id,
                category: spec.category,
                label: spec.label,
                value: spec.value,
                sort_order: i,
              });

            if (!specError) totalSpecs++;
          }
        }

        // Add images if available
        for (const image of enrichmentData.images) {
          const { data: existingImg } = await supabase
            .from("car_images")
            .select("id")
            .eq("car_id", car.id)
            .eq("url", image.url)
            .single();

          if (!existingImg) {
            await supabase.from("car_images").insert({
              car_id: car.id,
              url: image.url,
              is_primary: image.isPrimary,
              alt_text: `${car.name} - ${brandName}`,
            });
          }
        }
      }

      results.push({
        brand: brandName,
        cars: cars.length,
        variants: totalVariants,
        specs: totalSpecs,
      });

      console.log(`Enriched ${brandName}: ${cars.length} cars, ${totalVariants} variants, ${totalSpecs} specs`);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Enrichment error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
