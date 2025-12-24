import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting (per IP, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 20; // Max requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

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
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();
    
    // Validate messages array exists and has valid length
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (messages.length > 50) {
      return new Response(JSON.stringify({ error: "Too many messages. Maximum 50 allowed." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Validate each message structure
    for (const msg of messages) {
      if (!msg || typeof msg !== 'object') {
        return new Response(JSON.stringify({ error: "Invalid message format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
        return new Response(JSON.stringify({ error: "Invalid message role. Must be 'user' or 'assistant'." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (typeof msg.content !== 'string') {
        return new Response(JSON.stringify({ error: "Message content must be a string" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (msg.content.length > 2000) {
        return new Response(JSON.stringify({ error: "Message content too long. Maximum 2000 characters." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    
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
