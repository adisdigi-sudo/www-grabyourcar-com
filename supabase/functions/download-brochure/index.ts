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
    const { carId, oemUrl, carSlug } = await req.json();

    if (!carId || !oemUrl || !carSlug) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: carId, oemUrl, carSlug" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Downloading brochure for ${carSlug} from ${oemUrl}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download the PDF from OEM URL
    const pdfResponse = await fetch(oemUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/pdf,*/*",
      },
    });

    if (!pdfResponse.ok) {
      console.error(`Failed to download PDF: ${pdfResponse.status}`);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to download PDF: ${pdfResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuffer);
    
    console.log(`Downloaded ${pdfBytes.length} bytes`);

    // Generate storage path: brand/model-brochure.pdf
    const fileName = `${carSlug}-brochure.pdf`;
    const storagePath = fileName;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("brochures")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ success: false, error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("brochures")
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`Uploaded to: ${publicUrl}`);

    // Update the car record with the new brochure URL
    const { error: updateError } = await supabase
      .from("cars")
      .update({ brochure_url: publicUrl })
      .eq("id", carId);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          url: publicUrl,
          warning: `Brochure uploaded but car record update failed: ${updateError.message}` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrl,
        message: `Brochure downloaded and stored successfully` 
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
