import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateRequest {
  field: "tagline" | "disclaimer" | "footerCTA";
  tone: "professional" | "friendly" | "persuasive";
  companyName: string;
  carName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { field, tone, companyName, carName }: GenerateRequest = await req.json();

    const toneDescriptions = {
      professional: "formal, trustworthy, and suitable for financial documents",
      friendly: "warm, approachable, and builds customer rapport",
      persuasive: "compelling, action-oriented, and drives conversions"
    };

    const prompts: Record<string, string> = {
      tagline: `Generate a catchy tagline for ${companyName}, a car dealership and finance company in India. 
The tagline should be ${toneDescriptions[tone]}. 
Make it memorable, under 10 words, and highlight the value proposition of easy car buying and best financing.
Only return the tagline text, nothing else.`,

      disclaimer: `Generate a professional disclaimer for an EMI estimate PDF from ${companyName}, an Indian car finance company.
The tone should be ${toneDescriptions[tone]}.
Include:
- That this is an indicative estimate
- EMI may vary based on bank policies and credit score
- Processing fees may apply
- Contact for personalized quotes
Keep it under 50 words. Only return the disclaimer text.`,

      footerCTA: `Generate a compelling call-to-action for the footer of an EMI estimate PDF from ${companyName}.
The tone should be ${toneDescriptions[tone]}.
It should encourage customers to contact for the best car loan rates.
${carName ? `This is for the ${carName}.` : ""}
Keep it under 12 words. Only return the CTA text.`
    };

    const systemPrompt = `You are a marketing copywriter specializing in automotive and finance content for the Indian market. 
Generate concise, impactful content that resonates with Indian car buyers.
Use INR references where appropriate. Keep language simple and accessible.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompts[field] }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content?.trim() || "";

    console.log("Generated content:", { field, tone, content });

    return new Response(
      JSON.stringify({ content, field, tone }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generate EMI content error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
