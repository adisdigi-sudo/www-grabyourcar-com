import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// OEM website configurations
const OEM_SCRAPE_CONFIGS: Record<string, { 
  baseUrl: string;
  modelUrlPattern: (modelName: string, slug: string) => string;
  imageSelector?: string;
  brochureSelector?: string;
}> = {
  "Tata": {
    baseUrl: "https://cars.tatamotors.com",
    modelUrlPattern: (name, slug) => {
      const modelKey = name.toLowerCase().replace(/\s+ev$/i, '-ev').replace(/\s+/g, '-');
      return `https://cars.tatamotors.com/${modelKey}`;
    },
  },
  "Mahindra": {
    baseUrl: "https://auto.mahindra.com",
    modelUrlPattern: (name, slug) => {
      const modelKey = name.toLowerCase().replace(/\s+/g, '-');
      return `https://auto.mahindra.com/${modelKey}`;
    },
  },
  "Kia": {
    baseUrl: "https://www.kia.com/in",
    modelUrlPattern: (name, slug) => {
      return `https://www.kia.com/in/our-vehicles/${name.toLowerCase()}/showroom.html`;
    },
  },
  "Hyundai": {
    baseUrl: "https://www.hyundai.com/in/en",
    modelUrlPattern: (name, slug) => {
      return `https://www.hyundai.com/in/en/find-a-car/${name.toLowerCase()}/highlights`;
    },
  },
  "Toyota": {
    baseUrl: "https://www.toyotabharat.com",
    modelUrlPattern: (name, slug) => {
      const modelKey = name.toLowerCase().replace(/\s+/g, '-');
      return `https://www.toyotabharat.com/showroom/${modelKey}`;
    },
  },
  "Honda": {
    baseUrl: "https://www.hondacarindia.com",
    modelUrlPattern: (name, slug) => {
      return `https://www.hondacarindia.com/${name.toLowerCase().replace(/\s+/g, '-')}`;
    },
  },
  "MG": {
    baseUrl: "https://www.mgmotor.co.in",
    modelUrlPattern: (name, slug) => {
      return `https://www.mgmotor.co.in/vehicles/mg-${name.toLowerCase().replace(/\s+/g, '-')}`;
    },
  },
  "Skoda": {
    baseUrl: "https://www.skoda-auto.co.in",
    modelUrlPattern: (name, slug) => {
      return `https://www.skoda-auto.co.in/models/${name.toLowerCase()}`;
    },
  },
  "Volkswagen": {
    baseUrl: "https://www.volkswagen.co.in",
    modelUrlPattern: (name, slug) => {
      return `https://www.volkswagen.co.in/en/models/${name.toLowerCase()}.html`;
    },
  },
  "VinFast": {
    baseUrl: "https://vinfastauto.in",
    modelUrlPattern: (name, slug) => {
      return `https://vinfastauto.in/en/vehicles/${name.toLowerCase().replace(/\s+/g, '-')}`;
    },
  },
  "Tesla": {
    baseUrl: "https://www.tesla.com",
    modelUrlPattern: (name, slug) => {
      const modelKey = name.toLowerCase().replace('model ', 'model');
      return `https://www.tesla.com/en_in/${modelKey}`;
    },
  },
};

async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<{ 
  success: boolean; 
  images?: string[]; 
  brochureUrl?: string;
  error?: string;
}> {
  try {
    console.log(`Scraping ${url} with Firecrawl...`);
    
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'links'],
        onlyMainContent: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Firecrawl error: ${response.status} - ${errorText}`);
      return { success: false, error: `Firecrawl request failed: ${response.status}` };
    }

    const data = await response.json();
    
    // Extract image URLs from links
    const links = data.data?.links || data.links || [];
    const images: string[] = [];
    let brochureUrl: string | undefined;

    for (const link of links) {
      const linkUrl = typeof link === 'string' ? link : link.url || link.href;
      if (!linkUrl) continue;

      // Check for car images (exterior, gallery, hero images)
      if (/\.(jpg|jpeg|png|webp)$/i.test(linkUrl) && 
          /(exterior|gallery|hero|front|side|rear|car|vehicle)/i.test(linkUrl)) {
        // Filter out icons, logos, social icons
        if (!/(icon|logo|social|facebook|twitter|instagram|linkedin|youtube)/i.test(linkUrl)) {
          images.push(linkUrl);
        }
      }

      // Check for brochure PDFs
      if (/\.pdf$/i.test(linkUrl) && /brochure/i.test(linkUrl)) {
        brochureUrl = linkUrl;
      }
    }

    // Also check the HTML content for image sources
    const html = data.data?.html || data.html || '';
    const imgMatches = html.match(/<img[^>]+src=["']([^"']+)["']/gi) || [];
    for (const match of imgMatches) {
      const srcMatch = match.match(/src=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        const src = srcMatch[1];
        if (/\.(jpg|jpeg|png|webp)$/i.test(src) && 
            /(exterior|gallery|hero|front|side|rear)/i.test(src) &&
            !/(icon|logo|social|thumb)/i.test(src)) {
          images.push(src);
        }
      }
    }

    console.log(`Found ${images.length} images and brochure: ${brochureUrl ? 'yes' : 'no'}`);

    return { 
      success: true, 
      images: [...new Set(images)].slice(0, 10), // Dedupe and limit to 10 images
      brochureUrl 
    };
  } catch (error) {
    console.error(`Scrape error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, carId, limit = 5 } = await req.json();

    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "FIRECRAWL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get cars that need images/brochures
    let query = supabase
      .from("cars")
      .select(`
        id, brand, slug, name, brochure_url,
        car_images(id)
      `)
      .or("is_discontinued.is.null,is_discontinued.eq.false");

    if (carId) {
      query = query.eq("id", carId);
    } else if (brand) {
      query = query.eq("brand", brand);
    }

    // Filter to cars without images
    const { data: cars, error: carsError } = await query.limit(limit);

    if (carsError || !cars) {
      return new Response(
        JSON.stringify({ success: false, error: carsError?.message || "No cars found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to cars that actually need scraping
    const carsToProcess = cars.filter(car => {
      const config = OEM_SCRAPE_CONFIGS[car.brand];
      if (!config) return false;
      
      const hasImages = car.car_images && car.car_images.length > 0;
      const hasBrochure = car.brochure_url && car.brochure_url.includes("supabase.co");
      
      return !hasImages || !hasBrochure;
    });

    const results: any[] = [];

    for (const car of carsToProcess) {
      const config = OEM_SCRAPE_CONFIGS[car.brand];
      if (!config) continue;

      const modelUrl = config.modelUrlPattern(car.name, car.slug);
      const result: any = { 
        slug: car.slug, 
        brand: car.brand, 
        name: car.name,
        scrapedUrl: modelUrl 
      };

      const scrapeResult = await scrapeWithFirecrawl(modelUrl, firecrawlApiKey);
      
      if (!scrapeResult.success) {
        result.error = scrapeResult.error;
        results.push(result);
        continue;
      }

      // Process images
      if (scrapeResult.images && scrapeResult.images.length > 0) {
        const hasImages = car.car_images && car.car_images.length > 0;
        
        if (!hasImages) {
          // Insert first image as primary
          const primaryImage = scrapeResult.images[0];
          await supabase.from("car_images").insert({
            car_id: car.id,
            url: primaryImage,
            alt_text: `${car.name} exterior view`,
            is_primary: true,
            sort_order: 1,
          });

          // Insert additional images
          for (let i = 1; i < scrapeResult.images.length && i < 5; i++) {
            await supabase.from("car_images").insert({
              car_id: car.id,
              url: scrapeResult.images[i],
              alt_text: `${car.name} gallery image ${i + 1}`,
              is_primary: false,
              sort_order: i + 1,
            });
          }

          result.imagesAdded = Math.min(scrapeResult.images.length, 5);
        }
      }

      // Process brochure
      if (scrapeResult.brochureUrl) {
        const hasBrochure = car.brochure_url && car.brochure_url.includes("supabase.co");
        
        if (!hasBrochure) {
          // Try to download and store the brochure
          try {
            const pdfResponse = await fetch(scrapeResult.brochureUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/pdf,*/*",
              },
            });

            if (pdfResponse.ok) {
              const pdfBuffer = await pdfResponse.arrayBuffer();
              const pdfBytes = new Uint8Array(pdfBuffer);
              
              // Validate PDF
              const header = new TextDecoder().decode(pdfBytes.slice(0, 5));
              if (header.startsWith("%PDF")) {
                const storagePath = `${car.slug}-brochure.pdf`;
                await supabase.storage
                  .from("brochures")
                  .upload(storagePath, pdfBytes, {
                    contentType: "application/pdf",
                    upsert: true,
                  });

                const { data: publicUrlData } = supabase.storage
                  .from("brochures")
                  .getPublicUrl(storagePath);

                await supabase
                  .from("cars")
                  .update({ brochure_url: publicUrlData.publicUrl })
                  .eq("id", car.id);

                result.brochureUrl = publicUrlData.publicUrl;
              }
            }
          } catch (e) {
            result.brochureError = e.message;
          }
        }
      }

      results.push(result);
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          processed: results.length,
          withImages: results.filter(r => r.imagesAdded).length,
          withBrochures: results.filter(r => r.brochureUrl).length,
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
