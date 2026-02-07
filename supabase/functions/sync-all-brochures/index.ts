import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Verified OEM brochure URLs from database
const OEM_BROCHURE_URLS: Record<string, string> = {
  "maruti-suzuki-swift": "https://www.marutisuzuki.com/content/dam/msil/arena/in/en/assets/cars/swift/documents/Arena-Swift-Brochure.pdf",
  "maruti-suzuki-dzire": "https://www.marutisuzuki.com/content/dam/msil/arena/in/en/assets/cars/dzire/documents/Arena-Dzire-Brochure.pdf",
  "maruti-suzuki-baleno": "https://www.nexaexperience.com/content/dam/msil/nexa/in/en/assets/cars/baleno/documents/NEXA-Baleno-Brochure.pdf",
  "maruti-suzuki-brezza": "https://www.marutisuzuki.com/content/dam/msil/arena/in/en/assets/cars/brezza/documents/Arena-Brezza-Brochure.pdf",
  "maruti-suzuki-ertiga": "https://www.marutisuzuki.com/content/dam/msil/arena/in/en/assets/cars/ertiga/document/Arena-Ertiga-Brochure.pdf",
  "maruti-suzuki-wagon-r": "https://marutisuzuki.scene7.com/is/content/maruti/WagonR-Brochurepdf",
  "maruti-suzuki-alto-k10": "https://www.marutisuzuki.com/content/dam/msil/arena/in/en/assets/cars/alto-k10/documents/AltoK10-KV-Brochure.pdf",
  "maruti-suzuki-celerio": "https://www.marutisuzuki.com/content/dam/msil/arena/in/en/assets/cars/celerio/documents/Arena-Celerio-Brochure.pdf",
  "maruti-suzuki-s-presso": "https://www.marutisuzuki.com/content/dam/msil/arena/in/en/assets/cars/s-presso/documents/S-presso-Brochure.pdf",
  "maruti-suzuki-eeco": "https://marutisuzuki.scene7.com/is/content/maruti/EECO-Passenger-Brochure-Arenapdf",
  "maruti-suzuki-xl6": "https://www.nexaexperience.com/content/dam/msil/nexa/in/en/assets/cars/xl6/Documents/NEXA-Xl6-Brochure.pdf",
  "maruti-suzuki-ciaz": "https://www.nexaexperience.com/-/media/feature/nexawebsiteherobanner/brochure/ciaz_brochure.pdf",
  "maruti-suzuki-grand-vitara": "https://www.nexaexperience.com/content/dam/msil/nexa/in/en/assets/cars/grand-vitara/sigma/documents/NEXA-Grand-Vitara-Brochure.pdf",
  "maruti-suzuki-fronx": "https://www.nexaexperience.com/content/dam/msil/nexa/in/en/assets/cars/fronx/documents/NEXA%20FRONX%20Brochure.pdf",
  "maruti-suzuki-jimny": "https://www.nexaexperience.com/content/dam/msil/nexa/in/en/assets/cars/jimny/documents/NEXA-Jimny-Brochure.pdf",
  "maruti-suzuki-invicto": "https://www.nexaexperience.com/content/dam/msil/nexa/in/en/assets/cars/invicto/documents/NEXA-Invicto-Brochure.pdf",
  "maruti-suzuki-ignis": "https://www.nexaexperience.com/content/dam/msil/nexa/in/en/assets/cars/ignis/documents/Nexa-Ignis-Brochure.pdf",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: { slug: string; success: boolean; url?: string; error?: string }[] = [];

    for (const [slug, oemUrl] of Object.entries(OEM_BROCHURE_URLS)) {
      try {
        console.log(`Processing ${slug}...`);

        // Get car ID
        const { data: car, error: carError } = await supabase
          .from("cars")
          .select("id, brochure_url")
          .eq("slug", slug)
          .single();

        if (carError || !car) {
          results.push({ slug, success: false, error: `Car not found: ${carError?.message}` });
          continue;
        }

        // Skip if already has Supabase URL
        if (car.brochure_url?.includes("supabase.co")) {
          results.push({ slug, success: true, url: car.brochure_url, error: "Already synced" });
          continue;
        }

        // Download PDF with proper headers
        console.log(`Downloading from: ${oemUrl}`);
        const pdfResponse = await fetch(oemUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/pdf,application/octet-stream,*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.marutisuzuki.com/",
          },
        });

        if (!pdfResponse.ok) {
          console.error(`Download failed for ${slug}: ${pdfResponse.status}`);
          results.push({ slug, success: false, error: `Download failed: ${pdfResponse.status}` });
          continue;
        }

        const contentType = pdfResponse.headers.get("content-type");
        console.log(`Content-Type for ${slug}: ${contentType}`);
        
        const pdfBuffer = await pdfResponse.arrayBuffer();
        const pdfBytes = new Uint8Array(pdfBuffer);
        
        console.log(`Downloaded ${pdfBytes.length} bytes for ${slug}`);

        // Validate it's actually a PDF (starts with %PDF)
        const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 5));
        if (!pdfHeader.startsWith("%PDF")) {
          console.error(`Invalid PDF for ${slug}: starts with "${pdfHeader}"`);
          results.push({ slug, success: false, error: `Invalid PDF content (not a PDF file)` });
          continue;
        }

        // Upload to storage
        const storagePath = `${slug}-brochure.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("brochures")
          .upload(storagePath, pdfBytes, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${slug}:`, uploadError);
          results.push({ slug, success: false, error: `Upload failed: ${uploadError.message}` });
          continue;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from("brochures")
          .getPublicUrl(storagePath);

        // Update car record
        const { error: updateError } = await supabase
          .from("cars")
          .update({ brochure_url: publicUrlData.publicUrl })
          .eq("id", car.id);

        if (updateError) {
          results.push({ slug, success: true, url: publicUrlData.publicUrl, error: `DB update failed: ${updateError.message}` });
        } else {
          results.push({ slug, success: true, url: publicUrlData.publicUrl });
        }

        console.log(`✓ ${slug} synced to ${publicUrlData.publicUrl}`);
      } catch (error) {
        console.error(`Error processing ${slug}:`, error);
        results.push({ slug, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success && !r.error?.includes("Already")).length;
    const alreadySynced = results.filter(r => r.error?.includes("Already")).length;
    const failedCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true,
        summary: {
          total: results.length,
          synced: successCount,
          alreadySynced,
          failed: failedCount,
        },
        results 
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
