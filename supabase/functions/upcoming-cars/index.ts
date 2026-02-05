import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const currentDate = new Date().toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Use structured output with tool calling for reliable JSON
    const requestBody = {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are an automotive expert with up-to-date knowledge of upcoming car launches in India. Today's date is ${currentDate}. Focus ONLY on the Indian market with accurate expected prices in INR.`
        },
        {
          role: "user",
          content: `List the 12 most anticipated upcoming cars launching in India in 2025-2026. Include a mix of segments (SUV, EV, Sedan, Hatchback, MPV, Luxury) from major brands like Maruti, Hyundai, Tata, Mahindra, Kia, Toyota, MG, Skoda, Volkswagen, BMW, and Mercedes. Provide accurate expected prices and launch timelines.`
        }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "list_upcoming_cars",
            description: "Return a list of upcoming car launches in India",
            parameters: {
              type: "object",
              properties: {
                cars: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Car model name" },
                      brand: { type: "string", description: "Car manufacturer brand" },
                      expectedPrice: { type: "string", description: "Expected price range in INR like '₹12-15 Lakh' or '₹45-55 Lakh'" },
                      launchDate: { type: "string", description: "Expected launch date like 'Q2 2025' or 'Mid 2025'" },
                      segment: { type: "string", enum: ["SUV", "Sedan", "Hatchback", "EV", "MPV", "Luxury"] },
                      highlights: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "3-4 key features/highlights"
                      },
                      imageDescription: { type: "string", description: "Brief description of car appearance for placeholder" }
                    },
                    required: ["name", "brand", "expectedPrice", "launchDate", "segment", "highlights", "imageDescription"]
                  }
                }
              },
              required: ["cars"]
            }
          }
        }
      ],
      tool_choice: { type: "function", function: { name: "list_upcoming_cars" } },
      temperature: 0.3,
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "API credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();

    // Extract structured output from tool call
    let cars;
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        cars = parsed.cars;
      } catch (parseError) {
        console.error("Tool call parse error:", parseError);
        throw new Error("Failed to parse structured response");
      }
    } else {
      // Fallback to content parsing if tool call not available
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("No content in AI response");
      }
      
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
        const parsed = JSON.parse(jsonStr);
        cars = Array.isArray(parsed) ? parsed : parsed.cars;
      } catch (parseError) {
        console.error("JSON parse error:", parseError, "Content:", content.substring(0, 500));
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    if (!Array.isArray(cars) || cars.length === 0) {
      throw new Error("Failed to parse AI response as JSON");
    }

    console.log(`Successfully fetched ${cars.length} upcoming cars`);

    return new Response(JSON.stringify({ cars, generatedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
