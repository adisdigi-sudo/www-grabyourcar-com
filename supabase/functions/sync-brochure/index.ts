import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug } = await req.json();

    if (!slug) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required field: slug" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing ${slug}...`);

    // Get car data
    const { data: car, error: carError } = await supabase
      .from("cars")
      .select("id, brochure_url, name")
      .eq("slug", slug)
      .single();

    if (carError || !car) {
      return new Response(
        JSON.stringify({ success: false, error: `Car not found: ${carError?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip if already has Supabase URL
    if (car.brochure_url?.includes("supabase.co")) {
      return new Response(
        JSON.stringify({ success: true, url: car.brochure_url, message: "Already synced to Supabase storage" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!car.brochure_url) {
      return new Response(
        JSON.stringify({ success: false, error: "No brochure URL found for this car" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download PDF with proper headers
    console.log(`Downloading from: ${car.brochure_url}`);
    const pdfResponse = await fetch(car.brochure_url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/pdf,application/octet-stream,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.marutisuzuki.com/",
      },
    });

    if (!pdfResponse.ok) {
      console.error(`Download failed: ${pdfResponse.status}`);
      return new Response(
        JSON.stringify({ success: false, error: `Download failed: ${pdfResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuffer);
    
    console.log(`Downloaded ${pdfBytes.length} bytes`);

    // Validate it's actually a PDF (starts with %PDF)
    const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 5));
    if (!pdfHeader.startsWith("%PDF")) {
      console.error(`Invalid PDF: starts with "${pdfHeader}"`);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid PDF content (not a PDF file)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      console.error(`Upload error:`, uploadError);
      return new Response(
        JSON.stringify({ success: false, error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ 
          success: true, 
          url: publicUrlData.publicUrl,
          warning: `Brochure uploaded but car record update failed: ${updateError.message}` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✓ ${slug} synced to ${publicUrlData.publicUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrlData.publicUrl,
        message: `Brochure for ${car.name} synced successfully` 
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
