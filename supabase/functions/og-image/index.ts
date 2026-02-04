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
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return new Response("Missing slug parameter", { 
        status: 400,
        headers: corsHeaders 
      });
    }

    console.log(`Processing OG image request for slug: ${slug}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Default values
    let carName = "Car";
    let brand = "Brand";
    let price = "Contact for Price";
    let tagline = "Your Dream Car Awaits";
    let bodyType = "SUV";
    let carImageUrl = "";

    // Try to fetch car from database
    const { data: car, error } = await supabase
      .from("cars")
      .select("id, name, brand, price_range, tagline, body_type")
      .eq("slug", slug)
      .single();

    if (car && !error) {
      carName = car.name || carName;
      brand = car.brand || brand;
      price = car.price_range || price;
      tagline = car.tagline || tagline;
      bodyType = car.body_type || bodyType;
      console.log(`Found car in database: ${brand} ${carName}`);
      
      // Fetch car images
      const { data: carImages } = await supabase
        .from("car_images")
        .select("url")
        .eq("car_id", car.id)
        .eq("is_primary", true)
        .single();
      
      carImageUrl = carImages?.url || "";
    } else {
      // Fallback: Parse from slug
      console.log(`Car not in database, parsing slug: ${slug}`);
      const parts = slug.split("-");
      if (parts.length >= 2) {
        brand = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        carName = parts.slice(1).map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
      }
    }

    // If we have a car image and Lovable AI key, generate a branded OG image
    if (carImageUrl && lovableApiKey) {
      console.log("Generating branded OG image with Lovable AI...");
      
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Create a professional social media OG image (1200x630 aspect ratio) for a car dealership. 
                    
Add these elements to the car image:
- A sleek dark gradient overlay at the bottom (30% of image height)
- Bold white text showing: "${brand} ${carName}"
- Smaller text below showing: "${price}" in an accent color
- "Grabyourcar" logo/text in the bottom right corner
- A subtle "View Details →" call-to-action badge

Make it look premium, modern, and click-worthy for social media sharing. Keep the car as the hero but add professional branding.`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: carImageUrl
                    }
                  }
                ]
              }
            ],
            modalities: ["image", "text"]
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const generatedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          
          if (generatedImageUrl && generatedImageUrl.startsWith("data:image")) {
            console.log("Successfully generated branded OG image");
            
            // Extract base64 data and return as image
            const base64Data = generatedImageUrl.split(",")[1];
            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            
            return new Response(imageBytes, {
              headers: {
                ...corsHeaders,
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=86400",
              },
            });
          }
        } else {
          const errorText = await aiResponse.text();
          console.error("AI image generation failed:", aiResponse.status, errorText);
        }
      } catch (aiError) {
        console.error("AI image generation error:", aiError);
      }
    }

    // Fallback to SVG-based OG image
    console.log("Using fallback SVG OG image");
    const svg = generateFallbackSVG(carName, brand, price, tagline, bodyType);

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("OG image generation error:", error);
    
    const fallbackSvg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#1a1a2e"/>
  <text x="600" y="300" font-family="sans-serif" font-size="48" fill="#ffffff" text-anchor="middle">Grabyourcar</text>
  <text x="600" y="360" font-family="sans-serif" font-size="24" fill="#94a3b8" text-anchor="middle">Find Your Perfect Car</text>
</svg>`;
    
    return new Response(fallbackSvg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
      },
    });
  }
});

// Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Generate fallback SVG when AI generation is not available
function generateFallbackSVG(
  carName: string,
  brand: string,
  price: string,
  tagline: string,
  bodyType: string
): string {
  const safeName = escapeXml(carName);
  const safeBrand = escapeXml(brand);
  const safePrice = escapeXml(price);
  const safeTagline = escapeXml(tagline.substring(0, 60));
  const safeBodyType = escapeXml(bodyType || 'SUV');
  
  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#16213e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f3460;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#e94560;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ff6b6b;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bgGradient)"/>
  <circle cx="1100" cy="100" r="150" fill="#e94560" opacity="0.1"/>
  <circle cx="100" cy="530" r="200" fill="#0ea5e9" opacity="0.08"/>
  <rect x="60" y="180" width="120" height="6" rx="3" fill="url(#accentGradient)"/>
  <text x="60" y="160" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="500" fill="#94a3b8">${safeBrand}</text>
  <text x="60" y="260" font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="700" fill="#ffffff">${safeName}</text>
  <text x="60" y="320" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="#94a3b8">${safeTagline}</text>
  <rect x="60" y="380" width="400" height="80" rx="12" fill="#e94560" opacity="0.15"/>
  <rect x="60" y="380" width="4" height="80" rx="2" fill="#e94560"/>
  <text x="85" y="410" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="500" fill="#e94560">Starting at</text>
  <text x="85" y="445" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="700" fill="#ffffff">${safePrice}</text>
  <rect x="60" y="490" width="160" height="40" rx="20" fill="#0ea5e9" opacity="0.2"/>
  <text x="140" y="517" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#0ea5e9" text-anchor="middle">${safeBodyType}</text>
  <text x="60" y="590" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="700" fill="#ffffff">Grabyourcar</text>
  <text x="1140" y="590" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#64748b" text-anchor="end">grabyourcar.lovable.app</text>
  <g transform="translate(750, 150)">
    <rect width="380" height="280" rx="20" fill="#ffffff" opacity="0.05"/>
    <text x="190" y="155" font-family="system-ui, -apple-system, sans-serif" font-size="100" text-anchor="middle">🚗</text>
  </g>
</svg>`;
}
