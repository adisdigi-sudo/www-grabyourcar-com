import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXTRACTION_PROMPT = `You are an expert Indian car insurance policy data extractor. Analyze this document carefully and extract the following fields as JSON:

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

// Safe base64 encode for large ArrayBuffers (avoids stack overflow with spread operator)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, bytes.length);
    for (let j = i; j < end; j++) {
      binary += String.fromCharCode(bytes[j]);
    }
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { file_url, file_base64, mime_type = "image/jpeg" } = await req.json();

    if (!file_url && !file_base64) {
      return new Response(JSON.stringify({ error: "file_url or file_base64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine if PDF or image
    const isPdf = mime_type === "application/pdf" || (file_url && file_url.endsWith(".pdf"));
    let b64Data: string;

    if (file_base64) {
      b64Data = file_base64;
    } else if (file_url) {
      // Fetch the file and convert to base64
      console.log("Fetching file from URL:", file_url.substring(0, 80));
      const resp = await fetch(file_url);
      if (!resp.ok) throw new Error(`Failed to fetch file: ${resp.status}`);
      const buffer = await resp.arrayBuffer();
      b64Data = arrayBufferToBase64(buffer);
      console.log("File fetched, base64 length:", b64Data.length);
    } else {
      throw new Error("No file data provided");
    }

    const actualMime = isPdf ? "application/pdf" : mime_type;
    const dataUrl = `data:${actualMime};base64,${b64Data}`;

    console.log("Sending to AI for extraction, mime:", actualMime, "data length:", dataUrl.length);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI extraction failed:", aiResponse.status, errText);

      // Handle rate limits and payment errors
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI extraction failed", details: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "";
    console.log("AI response received, length:", content.length);

    if (!content) {
      return new Response(JSON.stringify({ error: "AI returned empty response" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse JSON from response (handle markdown code blocks)
    const cleanContent = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not parse JSON from:", content.substring(0, 500));
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
