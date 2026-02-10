import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand, limit = 5 } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get cars with external brochure URLs (not already in supabase storage)
    let query = supabase
      .from("cars")
      .select("id, name, slug, brochure_url")
      .not("brochure_url", "is", null)
      .not("brochure_url", "like", "%supabase%")
      .limit(limit);

    if (brand) {
      query = query.eq("brand", brand);
    }

    const { data: cars, error } = await query;
    if (error) throw error;

    if (!cars || cars.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No brochures to sync", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    for (const car of cars) {
      try {
        // Only process direct PDF URLs
        const url = car.brochure_url;
        if (!url || (!url.endsWith('.pdf') && !url.includes('/brochure'))) {
          results.push({ slug: car.slug, status: "skipped", reason: "Not a direct PDF URL" });
          continue;
        }

        console.log(`Downloading: ${car.slug} from ${url}`);

        const pdfResponse = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/pdf,application/octet-stream,*/*",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });

        if (!pdfResponse.ok) {
          results.push({ slug: car.slug, status: "failed", reason: `HTTP ${pdfResponse.status}` });
          continue;
        }

        const pdfBuffer = await pdfResponse.arrayBuffer();
        const pdfBytes = new Uint8Array(pdfBuffer);

        // Validate PDF
        const header = new TextDecoder().decode(pdfBytes.slice(0, 5));
        if (!header.startsWith("%PDF")) {
          results.push({ slug: car.slug, status: "failed", reason: "Not a valid PDF" });
          continue;
        }

        console.log(`${car.slug}: ${pdfBytes.length} bytes downloaded`);

        const storagePath = `${car.slug}-brochure.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("brochures")
          .upload(storagePath, pdfBytes, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) {
          results.push({ slug: car.slug, status: "failed", reason: uploadError.message });
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from("brochures")
          .getPublicUrl(storagePath);

        await supabase
          .from("cars")
          .update({ brochure_url: publicUrlData.publicUrl })
          .eq("id", car.id);

        results.push({ slug: car.slug, status: "synced", url: publicUrlData.publicUrl, size: `${Math.round(pdfBytes.length / 1024)}KB` });
        console.log(`✓ ${car.slug} synced`);
      } catch (err) {
        results.push({ slug: car.slug, status: "error", reason: err.message });
      }
    }

    const synced = results.filter(r => r.status === "synced").length;

    return new Response(
      JSON.stringify({ success: true, total: cars.length, synced, results }),
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
