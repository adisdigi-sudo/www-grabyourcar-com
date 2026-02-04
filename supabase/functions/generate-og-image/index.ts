import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple SVG-based OG image generator
const generateOGImageSVG = (
  carName: string,
  brand: string,
  price: string,
  tagline: string,
  bodyType: string
): string => {
  // Create a branded OG image as SVG
  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
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
      
      <!-- Background -->
      <rect width="1200" height="630" fill="url(#bgGradient)"/>
      
      <!-- Decorative elements -->
      <circle cx="1100" cy="100" r="150" fill="#e94560" opacity="0.1"/>
      <circle cx="100" cy="530" r="200" fill="#0ea5e9" opacity="0.08"/>
      
      <!-- Accent line -->
      <rect x="60" y="180" width="120" height="6" rx="3" fill="url(#accentGradient)"/>
      
      <!-- Brand name -->
      <text x="60" y="160" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="500" fill="#94a3b8">${escapeXml(brand)}</text>
      
      <!-- Car name -->
      <text x="60" y="260" font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="700" fill="#ffffff">${escapeXml(carName)}</text>
      
      <!-- Tagline -->
      <text x="60" y="320" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="#94a3b8">${escapeXml(tagline.substring(0, 60))}</text>
      
      <!-- Price badge -->
      <rect x="60" y="380" width="400" height="80" rx="12" fill="#e94560" opacity="0.15"/>
      <rect x="60" y="380" width="4" height="80" rx="2" fill="#e94560"/>
      <text x="85" y="410" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="500" fill="#e94560">Starting at</text>
      <text x="85" y="445" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="700" fill="#ffffff">${escapeXml(price)}</text>
      
      <!-- Body type badge -->
      <rect x="60" y="490" width="160" height="40" rx="20" fill="#0ea5e9" opacity="0.2"/>
      <text x="140" y="517" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="600" fill="#0ea5e9" text-anchor="middle">${escapeXml(bodyType || 'SUV')}</text>
      
      <!-- Logo/Brand -->
      <text x="60" y="590" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="700" fill="#ffffff">Grab<tspan fill="#e94560">your</tspan>car</text>
      
      <!-- Website -->
      <text x="1140" y="590" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#64748b" text-anchor="end">grabyourcar.lovable.app</text>
      
      <!-- Car icon placeholder -->
      <g transform="translate(750, 150)">
        <rect width="380" height="280" rx="20" fill="#ffffff" opacity="0.05"/>
        <text x="190" y="155" font-family="system-ui, -apple-system, sans-serif" font-size="100" text-anchor="middle">🚗</text>
      </g>
    </svg>
  `;
  
  return svg;
};

// Escape XML special characters
const escapeXml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to fetch car from database
    const { data: car, error } = await supabase
      .from("cars")
      .select("name, brand, price_range, tagline, body_type")
      .eq("slug", slug)
      .single();

    let carName = "Car";
    let brand = "Brand";
    let price = "Contact for Price";
    let tagline = "Your Dream Car Awaits";
    let bodyType = "SUV";

    if (car && !error) {
      carName = car.name || carName;
      brand = car.brand || brand;
      price = car.price_range || price;
      tagline = car.tagline || tagline;
      bodyType = car.body_type || bodyType;
    } else {
      // Fallback: Parse from slug
      const parts = slug.split("-");
      if (parts.length >= 2) {
        brand = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        carName = parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
      }
    }

    console.log(`Generating OG image for: ${brand} ${carName}`);

    // Generate SVG
    const svg = generateOGImageSVG(carName, brand, price, tagline, bodyType);

    // Return SVG as image
    return new Response(svg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("OG image generation error:", error);
    
    // Return a fallback SVG
    const fallbackSvg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="630" fill="#1a1a2e"/>
        <text x="600" y="300" font-family="sans-serif" font-size="48" fill="#ffffff" text-anchor="middle">Grabyourcar</text>
        <text x="600" y="360" font-family="sans-serif" font-size="24" fill="#94a3b8" text-anchor="middle">Find Your Perfect Car</text>
      </svg>
    `;
    
    return new Response(fallbackSvg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
      },
    });
  }
});
