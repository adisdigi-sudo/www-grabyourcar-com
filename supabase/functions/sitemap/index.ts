import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml",
};

const BASE_URL = "https://grabyourcar.com";

// Static pages with their priorities and change frequencies
const staticPages = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/cars", priority: "0.9", changefreq: "daily" },
  { path: "/car-insurance", priority: "0.8", changefreq: "weekly" },
  { path: "/car-loans", priority: "0.8", changefreq: "weekly" },
  { path: "/corporate", priority: "0.7", changefreq: "weekly" },
  { path: "/accessories", priority: "0.7", changefreq: "weekly" },
  { path: "/hsrp", priority: "0.7", changefreq: "weekly" },
  { path: "/self-drive", priority: "0.7", changefreq: "weekly" },
  { path: "/brochures", priority: "0.6", changefreq: "weekly" },
  { path: "/compare", priority: "0.6", changefreq: "weekly" },
  { path: "/car-finder", priority: "0.6", changefreq: "weekly" },
  { path: "/upcoming-cars", priority: "0.7", changefreq: "daily" },
  { path: "/auto-news", priority: "0.7", changefreq: "daily" },
  { path: "/blog", priority: "0.6", changefreq: "weekly" },
  { path: "/about", priority: "0.5", changefreq: "monthly" },
  { path: "/dealers", priority: "0.7", changefreq: "weekly" },
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all cars from database
    const { data: cars, error } = await supabase
      .from("cars")
      .select("slug, updated_at, is_upcoming, is_discontinued")
      .eq("is_discontinued", false)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching cars:", error);
      throw error;
    }

    // Fetch blog posts
    const { data: blogs } = await supabase
      .from("ai_blog_posts")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false });


    const today = new Date().toISOString().split("T")[0];

    // Build XML sitemap
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    // Add static pages
    for (const page of staticPages) {
      xml += `  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Add dynamic car pages
    if (cars && cars.length > 0) {
      for (const car of cars) {
        const lastmod = car.updated_at 
          ? new Date(car.updated_at).toISOString().split("T")[0]
          : today;
        
        const priority = car.is_upcoming ? "0.7" : "0.8";
        const changefreq = car.is_upcoming ? "daily" : "weekly";

        xml += `  <url>
    <loc>${BASE_URL}/cars/${car.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>
`;

        // Add car images page
        xml += `  <url>
    <loc>${BASE_URL}/cars/${car.slug}/images</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;

        // Add car specifications page
        xml += `  <url>
    <loc>${BASE_URL}/cars/${car.slug}/specs</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;
      }
    }

    // Add blog post pages
    if (blogs && blogs.length > 0) {
      for (const blog of blogs) {
        const lastmod = blog.updated_at
          ? new Date(blog.updated_at).toISOString().split("T")[0]
          : today;

        xml += `  <url>
    <loc>${BASE_URL}/blog/${blog.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    console.log(`Generated sitemap with ${staticPages.length} static + ${cars?.length || 0} car + ${blogs?.length || 0} blog pages`);

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    
    // Return a basic sitemap on error
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(fallbackXml, {
      headers: corsHeaders,
    });
  }
});
