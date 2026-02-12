import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// OEM configurations for scraping brochures and images
const OEM_CONFIGS: Record<string, { 
  brochurePattern: (modelName: string) => string[];
  imagePattern: (modelName: string) => string[];
}> = {
  "Tata": {
    brochurePattern: (name) => [
      `https://cars.tatamotors.com/images/${name.toLowerCase().replace(/\s+/g, '-')}/pdf/${name.replace(/\s+/g, '-')}-Brochure.pdf`,
      `https://ev.tatamotors.com/images/${name.toLowerCase().replace(/\s+/g, '-')}/pdf/${name.replace(/\s+/g, '-')}-Brochure.pdf`,
    ],
    imagePattern: (name) => [
      `https://cars.tatamotors.com/images/${name.toLowerCase().replace(/\s+/g, '-')}/exteriors/${name.toLowerCase().replace(/\s+/g, '-')}-exterior-front.jpg`,
      `https://cars.tatamotors.com/images/${name.toLowerCase().replace(/\s+/g, '-')}/gallery/exterior-1.jpg`,
    ],
  },
  "Mahindra": {
    brochurePattern: (name) => [
      `https://auto.mahindra.com/content/dam/mahindra-autosector/in/en/${name.toLowerCase().replace(/\s+/g, '-')}/pdf/${name.replace(/\s+/g, '')}-Brochure.pdf`,
    ],
    imagePattern: (name) => [
      `https://auto.mahindra.com/content/dam/mahindra-autosector/in/en/${name.toLowerCase().replace(/\s+/g, '-')}/gallery/exterior/${name.toLowerCase().replace(/\s+/g, '-')}-exterior-1.jpg`,
    ],
  },
  "Kia": {
    brochurePattern: (name) => [
      `https://www.kia.com/content/dam/kwcms/in/en/assets/vehicles/${name.toLowerCase()}/brochure/kia-${name.toLowerCase()}-brochure.pdf`,
    ],
    imagePattern: (name) => [
      `https://www.kia.com/content/dam/kwcms/in/en/images/vehicles/${name.toLowerCase()}/gallery/exterior/${name.toLowerCase()}-exterior-1.jpg`,
    ],
  },
  "Hyundai": {
    brochurePattern: (name) => [
      `https://www.hyundai.com/content/dam/hyundai/in/en/data/find-a-car/${name.toLowerCase()}/brochure/${name.toLowerCase()}-brochure.pdf`,
    ],
    imagePattern: (name) => [
      `https://www.hyundai.com/content/dam/hyundai/in/en/data/find-a-car/${name.toLowerCase()}/gallery/exterior/${name.toLowerCase()}-exterior-1.jpg`,
    ],
  },
  "Toyota": {
    brochurePattern: (name) => [
      `https://www.toyotabharat.com/content/dam/toyota/in/en/assets/${name.toLowerCase().replace(/\s+/g, '-')}/documents/${name.toLowerCase().replace(/\s+/g, '-')}-brochure.pdf`,
    ],
    imagePattern: (name) => [
      `https://www.toyotabharat.com/content/dam/toyota/in/en/assets/${name.toLowerCase().replace(/\s+/g, '-')}/gallery/exterior/${name.toLowerCase().replace(/\s+/g, '-')}-exterior-1.jpg`,
    ],
  },
  "Honda": {
    brochurePattern: (name) => [
      `https://www.hondacarindia.com/content/dam/hondacarindia/honda-cars/${name.replace(/\s+/g, '')}/pdf/${name.replace(/\s+/g, '-')}-Brochure.pdf`,
    ],
    imagePattern: (name) => [
      `https://www.hondacarindia.com/content/dam/hondacarindia/honda-cars/${name.replace(/\s+/g, '')}/gallery/exterior/${name.toLowerCase().replace(/\s+/g, '-')}-exterior-1.jpg`,
    ],
  },
  "MG": {
    brochurePattern: (name) => [
      `https://www.mgmotor.co.in/content/dam/mgmotor/in/en/vehicles/${name.toLowerCase().replace(/\s+/g, '-')}/brochure/${name.toLowerCase().replace(/\s+/g, '-')}-brochure.pdf`,
    ],
    imagePattern: (name) => [
      `https://www.mgmotor.co.in/content/dam/mgmotor/in/en/vehicles/${name.toLowerCase().replace(/\s+/g, '-')}/gallery/exterior/${name.toLowerCase().replace(/\s+/g, '-')}-exterior-1.jpg`,
    ],
  },
  "Skoda": {
    brochurePattern: (name) => [
      `https://www.skoda-auto.co.in/content/dam/skoda/in/en/models/${name.toLowerCase()}/brochure/${name.toLowerCase()}-brochure.pdf`,
    ],
    imagePattern: (name) => [
      `https://www.skoda-auto.co.in/content/dam/skoda/in/en/models/${name.toLowerCase()}/gallery/exterior/${name.toLowerCase()}-exterior-1.jpg`,
    ],
  },
  "Volkswagen": {
    brochurePattern: (name) => [
      `https://www.volkswagen.co.in/content/dam/vw/in/en/models/${name.toLowerCase()}/brochure/${name.toLowerCase()}-brochure.pdf`,
    ],
    imagePattern: (name) => [
      `https://www.volkswagen.co.in/content/dam/vw/in/en/models/${name.toLowerCase()}/gallery/exterior/${name.toLowerCase()}-exterior-1.jpg`,
    ],
  },
  "Mercedes-Benz": {
    brochurePattern: (name) => [
      `https://www.mercedes-benz.co.in/content/dam/mercedes-benz/in/en/data/find-a-car/${name.toLowerCase().replace(/\s+/g, '-')}/brochure/${name.toLowerCase().replace(/\s+/g, '-')}-brochure.pdf`,
    ],
    imagePattern: (name) => [
      `https://www.mercedes-benz.co.in/content/dam/mercedes-benz/in/en/data/find-a-car/${name.toLowerCase().replace(/\s+/g, '-')}/gallery/exterior/${name.toLowerCase().replace(/\s+/g, '-')}-exterior-1.jpg`,
      `https://media.oneweb.mercedes-benz.com/images/${name.toLowerCase().replace(/\s+/g, '-')}/exterior-1.jpg`,
    ],
  },
  "BMW": {
    brochurePattern: (name) => [
      `https://www.bmwindia.com/content/dam/bmw/marketIN/bmw_in/all_models/${name.toLowerCase().replace(/\s+/g, '-')}/brochure/${name.toLowerCase().replace(/\s+/g, '-')}-brochure.pdf`,
    ],
    imagePattern: (name) => [
      `https://www.bmwindia.com/content/dam/bmw/marketIN/bmw_in/all_models/${name.toLowerCase().replace(/\s+/g, '-')}/gallery/exterior/${name.toLowerCase().replace(/\s+/g, '-')}-exterior-1.jpg`,
      `https://bmwimg.bmwgroup.com/bmwimg/photo/marketing/${name.toLowerCase().replace(/\s+/g, '-')}/exterior.jpg`,
    ],
  },
};

async function tryFetchAsset(urls: string[], contentType: string): Promise<{ success: boolean; url?: string; data?: Uint8Array }> {
  for (const url of urls) {
    try {
      console.log(`Trying: ${url}`);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": contentType === "pdf" ? "application/pdf,*/*" : "image/*,*/*",
        },
      });

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const data = new Uint8Array(buffer);
        
        // Validate PDF
        if (contentType === "pdf") {
          const header = new TextDecoder().decode(data.slice(0, 5));
          if (!header.startsWith("%PDF")) continue;
        }
        
        return { success: true, url, data };
      }
    } catch (e) {
      console.log(`Failed: ${url}`);
    }
  }
  return { success: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, carId, forceRefresh } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query
    let query = supabase
      .from("cars")
      .select("id, brand, slug, name, brochure_url")
      .or("is_discontinued.is.null,is_discontinued.eq.false");

    if (carId) {
      query = query.eq("id", carId);
    } else if (brand) {
      query = query.eq("brand", brand);
    }

    const { data: cars, error: carsError } = await query;

    if (carsError || !cars) {
      return new Response(
        JSON.stringify({ success: false, error: carsError?.message || "No cars found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    for (const car of cars) {
      const config = OEM_CONFIGS[car.brand];
      if (!config) {
        results.push({ slug: car.slug, brand: car.brand, error: "No config for brand" });
        continue;
      }

      const result: any = { slug: car.slug, brand: car.brand, name: car.name };

      // Check if brochure needs syncing
      const needsBrochure = forceRefresh || !car.brochure_url || !car.brochure_url.includes("supabase.co");
      
      if (needsBrochure) {
        const brochureUrls = config.brochurePattern(car.name);
        const brochureResult = await tryFetchAsset(brochureUrls, "pdf");
        
        if (brochureResult.success && brochureResult.data) {
          const storagePath = `${car.slug}-brochure.pdf`;
          const { error: uploadError } = await supabase.storage
            .from("brochures")
            .upload(storagePath, brochureResult.data, {
              contentType: "application/pdf",
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from("brochures")
              .getPublicUrl(storagePath);

            await supabase
              .from("cars")
              .update({ brochure_url: publicUrlData.publicUrl })
              .eq("id", car.id);

            result.brochure = { success: true, url: publicUrlData.publicUrl };
          } else {
            result.brochure = { success: false, error: uploadError.message };
          }
        } else {
          result.brochure = { success: false, error: "Could not find brochure at expected URLs" };
        }
      } else {
        result.brochure = { success: true, status: "already synced" };
      }

      // Check if images need syncing
      const { data: existingImages } = await supabase
        .from("car_images")
        .select("id")
        .eq("car_id", car.id)
        .limit(1);

      const needsImages = forceRefresh || !existingImages || existingImages.length === 0;

      if (needsImages) {
        const imageUrls = config.imagePattern(car.name);
        const imageResult = await tryFetchAsset(imageUrls, "image");
        
        if (imageResult.success && imageResult.data) {
          const storagePath = `${car.slug}-hero.jpg`;
          const { error: uploadError } = await supabase.storage
            .from("car-images")
            .upload(storagePath, imageResult.data, {
              contentType: "image/jpeg",
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from("car-images")
              .getPublicUrl(storagePath);

            await supabase.from("car_images").upsert({
              car_id: car.id,
              url: publicUrlData.publicUrl,
              alt_text: `${car.name} exterior view`,
              is_primary: true,
              sort_order: 1,
            });

            result.image = { success: true, url: publicUrlData.publicUrl };
          } else {
            // Fallback: store OEM URL directly if it was accessible
            if (imageResult.url) {
              await supabase.from("car_images").upsert({
                car_id: car.id,
                url: imageResult.url,
                alt_text: `${car.name} exterior view`,
                is_primary: true,
                sort_order: 1,
              });
              result.image = { success: true, url: imageResult.url, note: "Using OEM URL directly" };
            } else {
              result.image = { success: false, error: uploadError.message };
            }
          }
        } else {
          result.image = { success: false, error: "Could not find image at expected URLs" };
        }
      } else {
        result.image = { success: true, status: "already has images" };
      }

      results.push(result);
    }

    const brochuresSynced = results.filter(r => r.brochure?.success && r.brochure?.url).length;
    const imagesSynced = results.filter(r => r.image?.success && r.image?.url).length;

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: results.length,
          brochuresSynced,
          imagesSynced,
        },
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
