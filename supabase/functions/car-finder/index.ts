import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuizAnswers {
  budget: string;
  primaryUse: string;
  fuelPreference: string;
  transmissionPreference: string;
  seatingCapacity: string;
  topPriorities: string[];
  bodyTypePreference: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const answers: QuizAnswers = await req.json();
    console.log("Quiz answers received:", answers);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert car advisor for an Indian car marketplace. Based on the user's preferences, recommend the top 5 best matching cars from our inventory.

Available cars in our inventory (with approximate prices):
- Maruti Alto K10 (₹3.99-5.96L) - Hatchback, Petrol/CNG
- Maruti Swift (₹6.49-9.64L) - Hatchback, Petrol/CNG
- Maruti Baleno (₹6.66-9.88L) - Premium Hatchback, Petrol/CNG
- Maruti Wagon R (₹5.54-7.42L) - Tall-Boy Hatchback, Petrol/CNG
- Maruti Fronx (₹7.51-13.04L) - Compact SUV, Petrol/CNG
- Maruti Brezza (₹8.34-14.14L) - Compact SUV, Petrol/CNG
- Maruti Grand Vitara (₹10.70-19.65L) - Mid-Size SUV, Petrol/Hybrid
- Maruti Dzire (₹6.79-9.79L) - Sedan, Petrol/CNG
- Maruti Ciaz (₹9.30-12.20L) - Mid-Size Sedan, Petrol
- Maruti Ertiga (₹8.69-13.03L) - MPV 7-Seater, Petrol/CNG
- Maruti XL6 (₹11.61-14.77L) - Premium MPV 6-Seater, Petrol
- Maruti Jimny (₹12.74-15.05L) - Off-Road SUV, Petrol
- Maruti Invicto (₹25.21-28.92L) - Premium MPV Hybrid

- Hyundai i20 (₹7.04-11.21L) - Premium Hatchback, Petrol
- Hyundai Venue (₹7.94-13.48L) - Compact SUV, Petrol/Diesel
- Hyundai Creta (₹11.00-20.15L) - Mid-Size SUV, Petrol/Diesel

- Tata Punch (₹6.13-10.20L) - Micro SUV, Petrol
- Tata Nexon (₹8.10-15.50L) - Compact SUV, Petrol/Diesel/Electric

- Kia Seltos (₹10.90-20.35L) - Mid-Size SUV, Petrol/Diesel
- Kia Sonet (₹7.99-15.69L) - Compact SUV, Petrol/Diesel
- Kia Carens (₹10.52-19.67L) - MPV 6/7-Seater, Petrol/Diesel

- Mahindra XUV700 (₹14.00-26.49L) - Full-Size SUV, Petrol/Diesel
- Mahindra Thar (₹11.35-16.99L) - Off-Road SUV, Petrol/Diesel
- Mahindra Scorpio N (₹13.85-24.54L) - Full-Size SUV, Petrol/Diesel

- Toyota Innova Crysta (₹19.99-26.55L) - Premium MPV, Petrol/Diesel
- Toyota Fortuner (₹33.43-51.44L) - Full-Size SUV, Petrol/Diesel
- Toyota Urban Cruiser Hyryder (₹11.14-19.99L) - Mid-Size SUV, Petrol/Hybrid

- Honda City (₹11.92-16.35L) - Mid-Size Sedan, Petrol
- Honda Elevate (₹11.69-16.43L) - Mid-Size SUV, Petrol
- Honda Amaze (₹7.20-9.96L) - Compact Sedan, Petrol

- MG Hector (₹14.00-22.00L) - Mid-Size SUV, Petrol/Diesel/Hybrid
- MG Astor (₹10.28-18.08L) - Compact SUV, Petrol
- MG ZS EV (₹18.98-25.20L) - Electric SUV

- Skoda Slavia (₹10.69-18.69L) - Mid-Size Sedan, Petrol
- Skoda Kushaq (₹10.89-18.79L) - Compact SUV, Petrol

- Volkswagen Virtus (₹11.56-19.41L) - Mid-Size Sedan, Petrol
- Volkswagen Taigun (₹11.70-19.30L) - Compact SUV, Petrol

Respond ONLY with valid JSON in this exact format:
{
  "recommendations": [
    {
      "rank": 1,
      "name": "Car Name",
      "brand": "Brand Name",
      "slug": "brand-model-name",
      "price": "₹X.XX - ₹Y.YY Lakh",
      "matchScore": 95,
      "matchReasons": ["Reason 1", "Reason 2", "Reason 3"],
      "highlights": ["Key Feature 1", "Key Feature 2"]
    }
  ],
  "summary": "A brief 2-sentence personalized summary of why these cars match the user's needs."
}

Guidelines:
1. Recommend exactly 5 cars, ranked by match score (100 = perfect match)
2. Consider ALL user preferences: budget, use case, fuel, transmission, seating, priorities
3. Match score should reflect how well the car fits ALL criteria
4. Be specific in match reasons - reference the user's actual preferences
5. Slug format: lowercase brand-model (e.g., "maruti-swift", "hyundai-creta")`;

    const userPrompt = `Find the best cars for a user with these preferences:

Budget: ${answers.budget}
Primary Use: ${answers.primaryUse}
Fuel Preference: ${answers.fuelPreference}
Transmission: ${answers.transmissionPreference}
Seating Capacity: ${answers.seatingCapacity}
Body Type Preference: ${answers.bodyTypePreference}
Top Priorities: ${answers.topPriorities?.join(", ") || "Not specified"}

Recommend the top 5 cars that best match ALL these criteria.`;

    console.log("Sending request to AI gateway...");

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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
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
      throw new Error("Failed to get recommendations from AI");
    }

    const data = await response.json();
    console.log("AI response received");
    
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response - handle potential markdown code blocks
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      const rawJsonMatch = content.match(/\{[\s\S]*\}/);
      if (rawJsonMatch) {
        jsonStr = rawJsonMatch[0];
      }
    }
    
    const recommendations = JSON.parse(jsonStr);
    console.log("Parsed recommendations:", recommendations);

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("car-finder error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
