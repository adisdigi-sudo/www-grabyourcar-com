import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Smart Policy Data Extraction using Gemini Vision
 * Extracts structured data from policy PDF/image uploads
 */

const EXTRACTION_PROMPT = `You are an expert Indian car insurance policy data extractor. Analyze this document and extract the following fields as JSON:

{
  "customer_name": "Full name of the insured",
  "phone": "Mobile number if visible",
  "email": "Email if visible",
  "vehicle_number": "Registration number (e.g., MH02AB1234)",
  "vehicle_make": "Car manufacturer (e.g., Maruti Suzuki)",
  "vehicle_model": "Car model (e.g., Swift VXI)",
  "vehicle_year": "Year of manufacture",
  "insurer": "Insurance company name",
  "policy_number": "Policy number",
  "policy_type": "comprehensive / third_party / own_damage",
  "idv": "Insured Declared Value as number",
  "premium_amount": "Total premium as number",
  "add_ons": ["list of add-on covers"],
  "start_date": "Policy start date in YYYY-MM-DD",
  "expiry_date": "Policy expiry date in YYYY-MM-DD",
  "ncb_percentage": "No Claim Bonus percentage as number",
  "engine_number": "Engine number if visible",
  "chassis_number": "Chassis number if visible",
  "previous_insurer": "Previous insurer if visible",
  "claim_history": "Any claim details if visible"
}

For each field, also provide a confidence score (0.0 to 1.0) in a separate "confidence" object with the same keys.

If a field is not found in the document, set it to null and confidence to 0.

Return ONLY valid JSON with two top-level keys: "extracted" and "confidence".`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { file_url, file_base64, mime_type = "image/jpeg" } = await req.json();

    if (!file_url && !file_base64) {
      return new Response(JSON.stringify({ error: "file_url or file_base64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get image data
    let imageData = file_base64;
    let imageMime = mime_type;

    if (file_url && !file_base64) {
      const resp = await fetch(file_url);
      const buffer = await resp.arrayBuffer();
      imageData = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      imageMime = resp.headers.get("content-type") || mime_type;
    }

    // Use Lovable AI (Gemini) for extraction
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.lovable.dev/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: EXTRACTION_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: file_url || `data:${imageMime};base64,${imageData}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      console.error("AI extraction failed:", err);
      return new Response(JSON.stringify({ error: "AI extraction failed", details: err }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Could not parse extraction result", raw: content }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({
      success: true,
      extracted: parsed.extracted || parsed,
      confidence: parsed.confidence || {},
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Extract policy error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
