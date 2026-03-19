import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAGES = [
  { key: "home", path: "/", name: "Homepage" },
  { key: "cars", path: "/cars", name: "Cars Listing" },
  { key: "car_detail", path: "/cars/:slug", name: "Car Detail" },
  { key: "compare", path: "/compare", name: "Compare Cars" },
  { key: "car_loans", path: "/car-loans", name: "Car Loans" },
  { key: "car_insurance", path: "/car-insurance", name: "Car Insurance" },
  { key: "self_drive", path: "/self-drive", name: "Self-Drive Rentals" },
  { key: "hsrp", path: "/hsrp", name: "HSRP Services" },
  { key: "accessories", path: "/accessories", name: "Accessories" },
  { key: "about", path: "/about", name: "About Us" },
  { key: "blog", path: "/blog", name: "Blog" },
  { key: "contact", path: "/contact", name: "Contact" },
  { key: "dealers", path: "/dealers", name: "Dealer Locator" },
  { key: "brochures", path: "/brochures", name: "Brochures" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action = "optimize_all", page_key } = body;

    if (action === "optimize_single" && page_key) {
      const page = PAGES.find(p => p.key === page_key);
      if (!page) {
        return new Response(JSON.stringify({ error: "Page not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await optimizePage(supabase, LOVABLE_API_KEY, page);
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optimize all pages
    const results = [];
    for (const page of PAGES) {
      try {
        const result = await optimizePage(supabase, LOVABLE_API_KEY, page);
        results.push({ page: page.key, status: "success", ...result });
      } catch (e) {
        results.push({ page: page.key, status: "error", error: (e as Error).message });
      }
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SEO Agent error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function optimizePage(
  supabase: any,
  apiKey: string,
  page: { key: string; path: string; name: string }
) {
  const prompt = `Generate SEO-optimized metadata for this page of GrabYourCar.com (India's leading car buying platform):

Page: ${page.name}
URL Path: ${page.path}
Website: www.grabyourcar.com
Business: New car sales, car insurance (70% discount), car loans (8.5%+), HSRP, accessories, self-drive rentals (Delhi NCR)

Generate:
1. Title tag (under 60 chars, include "GrabYourCar" brand)
2. Meta description (under 160 chars, compelling with CTA)
3. Keywords (comma-separated, 5-8 relevant terms)
4. OG title (under 60 chars)
5. OG description (under 160 chars)

Respond in JSON:
{
  "title": "...",
  "description": "...",
  "keywords": "...",
  "og_title": "...",
  "og_description": "..."
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are an SEO expert. Respond only with valid JSON." },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
    }),
  });

  if (!response.ok) throw new Error(`AI error: ${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || "";

  let seoData: any;
  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    seoData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : content);
  } catch {
    throw new Error("Failed to parse AI SEO response");
  }

  // Upsert into seo_settings table
  const { error } = await supabase.from("seo_settings").upsert({
    page_key: page.key,
    title: seoData.title,
    description: seoData.description,
    keywords: seoData.keywords,
    og_title: seoData.og_title,
    og_description: seoData.og_description,
    updated_at: new Date().toISOString(),
  }, { onConflict: "page_key" });

  if (error) {
    console.error(`SEO upsert error for ${page.key}:`, error);
    throw error;
  }

  return seoData;
}
