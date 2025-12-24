import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `You are an expert car advisor for GrabYourCar, a trusted used car dealership. You help customers find the perfect car based on their preferences, budget, and needs.

Available cars in our inventory:
1. Maruti Swift (₹5.5-8 Lakh) - Petrol, Manual/AMT, Great mileage (22-25 kmpl), Perfect for city driving
2. Tata Nexon (₹8-12 Lakh) - Petrol/Diesel, Manual/AMT, 5-star safety, Compact SUV
3. Hyundai Creta (₹11-18 Lakh) - Petrol/Diesel, Manual/Automatic, Premium SUV, Feature-rich
4. Kia Seltos (₹11-19 Lakh) - Petrol/Diesel, Manual/Automatic, Stylish SUV, Great tech features
5. Toyota Innova Crysta (₹18-25 Lakh) - Diesel, Manual/Automatic, Best-in-class MPV, 7-seater
6. Mahindra XUV700 (₹14-24 Lakh) - Petrol/Diesel, Manual/Automatic, ADAS features, 5/7 seater

Guidelines:
- Ask about their budget, family size, primary use (city/highway), fuel preference
- Recommend 1-3 cars that best match their needs
- Highlight key features and value propositions
- Be friendly, concise, and helpful
- If they want to see a car, suggest they check the listings or contact us
- Keep responses under 150 words unless detailed comparison is needed`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
          ...messages,
        ],
        stream: true,
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
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Car advisor error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
