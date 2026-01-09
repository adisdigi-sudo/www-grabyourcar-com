import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { carName, brand, price, fuelTypes, bodyType, transmission } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert car advisor for an Indian car marketplace. Based on the car the user is viewing, suggest 3 similar or alternative cars they might like.

Consider these factors when recommending:
1. Similar price range (within 20% of the current car's price)
2. Similar body type or segment
3. Competing brands with similar offerings
4. Similar fuel type options
5. Features and target audience

Available car brands in our inventory: Maruti Suzuki, Hyundai, Tata, Mahindra, Kia, Toyota, Honda, MG, Skoda, Volkswagen

Respond in JSON format only with this structure:
{
  "recommendations": [
    {
      "name": "Car Name",
      "brand": "Brand Name",
      "reason": "Brief reason why this is a good alternative (max 15 words)",
      "priceRange": "₹X - ₹Y Lakh"
    }
  ]
}`;

    const userPrompt = `The user is viewing: ${carName} by ${brand}
Price: ${price}
Fuel Types: ${fuelTypes?.join(", ") || "Petrol"}
Body Type: ${bodyType || "Hatchback"}
Transmission: ${transmission?.join(", ") || "Manual"}

Suggest 3 similar cars they might also like.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get recommendations");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }
    
    const recommendations = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("car-recommendations error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
