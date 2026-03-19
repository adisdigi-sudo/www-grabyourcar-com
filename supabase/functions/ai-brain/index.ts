import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "openai/gpt-5-mini",
];

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_cars",
      description: "Search cars by brand, body type, fuel type, price range, or name. Returns matching cars with prices and key specs.",
      parameters: {
        type: "object",
        properties: {
          brand: { type: "string", description: "Car brand like Maruti, Hyundai, Tata, BMW etc." },
          body_type: { type: "string", description: "SUV, Sedan, Hatchback, MPV, Coupe etc." },
          fuel_type: { type: "string", description: "Petrol, Diesel, Electric, CNG, Hybrid" },
          min_price: { type: "number", description: "Minimum price in lakhs" },
          max_price: { type: "number", description: "Maximum price in lakhs" },
          search_term: { type: "string", description: "Free text search for car name" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_emi",
      description: "Calculate car loan EMI given principal amount, interest rate and tenure.",
      parameters: {
        type: "object",
        properties: {
          principal: { type: "number", description: "Loan amount in rupees" },
          rate: { type: "number", description: "Annual interest rate percentage (default 8.5)" },
          tenure_months: { type: "number", description: "Loan tenure in months (default 60)" },
        },
        required: ["principal"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_on_road_price",
      description: "Get on-road price breakdown for a specific car in a specific city.",
      parameters: {
        type: "object",
        properties: {
          car_name: { type: "string", description: "Car name like 'Hyundai Creta' or 'Maruti Swift'" },
          city: { type: "string", description: "City name like Delhi, Mumbai, Bangalore" },
        },
        required: ["car_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_dealers",
      description: "Find car dealers or showrooms in a specific city.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City to search dealers in" },
          brand: { type: "string", description: "Specific car brand" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "capture_lead",
      description: "Save customer contact details when they share name, phone, or express strong buying intent.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Customer name" },
          phone: { type: "string", description: "Customer phone number" },
          car_interest: { type: "string", description: "Car model they are interested in" },
          city: { type: "string", description: "Customer city" },
          service: { type: "string", enum: ["new_car", "insurance", "loan", "hsrp", "accessories", "rental", "general"], description: "Service category" },
        },
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI service not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const {
      messages,
      channel = "website",
      customer_name,
      customer_phone,
      page_context,
      stream = false,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load knowledge base
    const { data: knowledgeRows } = await supabase
      .from("ai_knowledge_base")
      .select("category, title, content")
      .eq("is_active", true)
      .order("sort_order");

    const knowledgeContext = (knowledgeRows || [])
      .map((r: any) => `[${r.category.toUpperCase()}] ${r.title}: ${r.content}`)
      .join("\n\n");

    // Channel-specific instructions
    const channelInstructions: Record<string, string> = {
      whatsapp: `You are GrabYourCar's WhatsApp AI assistant. Keep responses under 200 words. Use emojis sparingly. Use friendly Hindi-English mix tone. Always try to capture name, phone, preferred car, and city. End with a call-to-action. When using tools, summarize results naturally.`,
      website: `You are GrabYourCar's website car advisor chatbot. Be helpful, informative, and guide users to explore cars. Mention specific car pages and features. Use markdown formatting for readability. When you find relevant cars via search, present them with prices and key highlights. Always try to naturally capture lead information when the user shows buying intent.`,
      crm: `You are GrabYourCar's internal CRM AI assistant. Help staff with lead analysis, follow-up suggestions, draft messages, and data insights. Be concise and action-oriented. Use tables and bullet points.`,
    };

    const systemPrompt = `${channelInstructions[channel] || channelInstructions.website}

=== COMPANY KNOWLEDGE BASE ===
${knowledgeContext}

=== TOOLS AVAILABLE ===
You have tools to search our car database, calculate EMIs, find on-road prices, locate dealers, and capture leads. USE THEM whenever relevant to give accurate, real-time data instead of generic answers.

=== GUIDELINES ===
- When a customer asks about a specific car, USE search_cars to get real data
- When they ask about price/cost, USE get_on_road_price with their city
- When they mention budget or EMI, USE calculate_emi
- When they share contact info or show strong intent, USE capture_lead
- For dealer/showroom queries, USE find_dealers
- Always be helpful and provide specific, data-backed answers
- For website channel: use markdown (bold, bullets, links)
- Link to relevant pages: /car/{slug}, /car-loans, /car-insurance, /compare

${page_context ? `User is currently viewing: ${page_context}` : ""}
${customer_name ? `Customer name: ${customer_name}` : ""}
${customer_phone ? `Customer phone: ${customer_phone}` : ""}`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-15),
    ];

    // === STREAMING MODE (Website Chatbot) ===
    if (stream) {
      // For streaming, we do a non-tool call first pass, then stream the response
      // Use tool calling in non-stream mode, get result, then stream final answer
      const toolResult = await executeWithTools(LOVABLE_API_KEY, supabase, aiMessages, channel, customer_name, customer_phone);
      
      if (toolResult.toolsUsed) {
        // Tools were called — stream the final response with tool context
        const finalMessages = [
          ...aiMessages,
          { role: "assistant", content: null, tool_calls: toolResult.toolCalls },
          ...toolResult.toolResults,
          { role: "user", content: "Now provide a helpful response incorporating the tool results above. Use markdown formatting." },
        ];
        
        const streamResponse = await callAI(LOVABLE_API_KEY, finalMessages, true);
        if (!streamResponse.ok) {
          return handleAIError(streamResponse);
        }
        return new Response(streamResponse.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      // No tools needed — direct stream
      const streamResponse = await callAI(LOVABLE_API_KEY, aiMessages, true);
      if (!streamResponse.ok) {
        return handleAIError(streamResponse);
      }
      return new Response(streamResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // === NON-STREAMING MODE (WhatsApp / CRM) ===
    const result = await executeWithTools(LOVABLE_API_KEY, supabase, aiMessages, channel, customer_name, customer_phone);

    // Log analytics
    try {
      await supabase.from("ai_conversation_analytics").insert({
        channel,
        intent_detected: result.intent || "general",
        lead_captured: result.leadCaptured,
        message_count: messages.length,
      });
    } catch (e) {
      console.error("Analytics log error:", e);
    }

    return new Response(JSON.stringify({
      response: result.response,
      intent: result.intent,
      lead_captured: result.leadCaptured,
      suggested_actions: result.suggestedActions,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Brain error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("credits") ? 402 : message.includes("Rate") ? 429 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ===== TOOL EXECUTION ENGINE =====
async function executeWithTools(
  apiKey: string,
  supabase: any,
  messages: any[],
  channel: string,
  customerName?: string,
  customerPhone?: string,
): Promise<{
  response: string;
  intent: string;
  leadCaptured: boolean;
  suggestedActions: string[];
  toolsUsed: boolean;
  toolCalls?: any[];
  toolResults?: any[];
}> {
  // First call with tools
  const firstResponse = await callAIWithTools(apiKey, messages);

  if (!firstResponse.ok) {
    if (firstResponse.status === 402) throw new Error("AI credits exhausted");
    if (firstResponse.status === 429) throw new Error("Rate limited");
    throw new Error(`AI error: ${firstResponse.status}`);
  }

  const firstData = await firstResponse.json();
  const firstChoice = firstData.choices?.[0];

  if (!firstChoice) throw new Error("No AI response");

  // Check if AI wants to call tools
  if (firstChoice.finish_reason === "tool_calls" && firstChoice.message?.tool_calls?.length) {
    const toolCalls = firstChoice.message.tool_calls;
    const toolResults: any[] = [];
    let leadCaptured = false;
    let intent = "general";

    for (const tc of toolCalls) {
      const fn = tc.function;
      let args: any;
      try {
        args = JSON.parse(fn.arguments);
      } catch {
        args = {};
      }

      let result: any;
      switch (fn.name) {
        case "search_cars":
          result = await toolSearchCars(supabase, args);
          intent = "car_inquiry";
          break;
        case "calculate_emi":
          result = toolCalculateEMI(args);
          intent = "loan";
          break;
        case "get_on_road_price":
          result = await toolGetOnRoadPrice(supabase, args);
          intent = "car_inquiry";
          break;
        case "find_dealers":
          result = await toolFindDealers(supabase, args);
          intent = "general";
          break;
        case "capture_lead":
          result = await toolCaptureLead(supabase, args, customerName, customerPhone, channel);
          leadCaptured = true;
          intent = args.service || "new_car";
          break;
        default:
          result = { error: "Unknown tool" };
      }

      toolResults.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }

    // Second call with tool results
    const secondMessages = [
      ...messages,
      firstChoice.message,
      ...toolResults,
    ];

    const finalContent = await callAIWithFallback(apiKey, secondMessages);

    return {
      response: finalContent,
      intent,
      leadCaptured,
      suggestedActions: getSuggestedActions(intent),
      toolsUsed: true,
      toolCalls,
      toolResults,
    };
  }

  // No tools called — direct response
  const content = firstChoice.message?.content?.trim() || "I'm here to help!";
  return {
    response: content,
    intent: "general",
    leadCaptured: false,
    suggestedActions: [],
    toolsUsed: false,
  };
}

// ===== TOOL IMPLEMENTATIONS =====
async function toolSearchCars(supabase: any, args: any) {
  let query = supabase.from("cars").select("name, brand, slug, price_range, body_type, fuel_types, is_bestseller, is_new, tagline, discount").eq("is_discontinued", false);

  if (args.brand) query = query.ilike("brand", `%${args.brand}%`);
  if (args.body_type) query = query.ilike("body_type", `%${args.body_type}%`);
  if (args.fuel_type) query = query.contains("fuel_types", [args.fuel_type]);
  if (args.min_price) query = query.gte("price_numeric", args.min_price * 100000);
  if (args.max_price) query = query.lte("price_numeric", args.max_price * 100000);
  if (args.search_term) query = query.ilike("name", `%${args.search_term}%`);

  const { data, error } = await query.limit(8);
  if (error) return { error: error.message };
  if (!data?.length) return { message: "No cars found matching your criteria.", cars: [] };

  return {
    cars: data.map((c: any) => ({
      name: `${c.brand} ${c.name}`,
      price: c.price_range || "Contact for price",
      type: c.body_type,
      fuel: c.fuel_types?.join(", "),
      slug: c.slug,
      url: `/car/${c.slug}`,
      bestseller: c.is_bestseller,
      new: c.is_new,
      tagline: c.tagline,
      discount: c.discount,
    })),
    total: data.length,
  };
}

function toolCalculateEMI(args: any) {
  const P = args.principal;
  const annualRate = args.rate || 8.5;
  const months = args.tenure_months || 60;
  const r = annualRate / 12 / 100;
  const emi = Math.round((P * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
  const totalPayment = emi * months;
  const totalInterest = totalPayment - P;

  return {
    emi: `₹${emi.toLocaleString("en-IN")}`,
    monthly_emi: emi,
    total_payment: `₹${totalPayment.toLocaleString("en-IN")}`,
    total_interest: `₹${totalInterest.toLocaleString("en-IN")}`,
    principal: `₹${P.toLocaleString("en-IN")}`,
    rate: `${annualRate}%`,
    tenure: `${months} months`,
    apply_url: "/car-loans",
  };
}

async function toolGetOnRoadPrice(supabase: any, args: any) {
  // Find the car first
  const { data: cars } = await supabase.from("cars")
    .select("id, name, brand, price_range, slug")
    .ilike("name", `%${args.car_name.replace(/\s+/g, "%")}%`)
    .limit(1);

  if (!cars?.length) {
    // Try brand + name combo
    const parts = args.car_name.split(" ");
    const { data: cars2 } = await supabase.from("cars")
      .select("id, name, brand, price_range, slug")
      .ilike("brand", `%${parts[0]}%`)
      .ilike("name", `%${parts.slice(1).join(" ")}%`)
      .limit(1);
    
    if (!cars2?.length) return { error: `Car "${args.car_name}" not found in our database.` };
    return await getPricingForCar(supabase, cars2[0], args.city);
  }

  return await getPricingForCar(supabase, cars[0], args.city);
}

async function getPricingForCar(supabase: any, car: any, city?: string) {
  // Get variants
  const { data: variants } = await supabase.from("car_variants")
    .select("name, price, fuel_type, transmission, ex_showroom, on_road_price")
    .eq("car_id", car.id)
    .order("sort_order")
    .limit(5);

  // Get city pricing if city specified
  let cityPricing = null;
  if (city) {
    const { data } = await supabase.from("car_city_pricing")
      .select("*")
      .eq("car_id", car.id)
      .ilike("city", `%${city}%`)
      .limit(3);
    cityPricing = data;
  }

  return {
    car: `${car.brand} ${car.name}`,
    price_range: car.price_range,
    url: `/car/${car.slug}`,
    variants: variants?.map((v: any) => ({
      name: v.name,
      price: v.price,
      fuel: v.fuel_type,
      transmission: v.transmission,
      ex_showroom: v.ex_showroom ? `₹${(v.ex_showroom / 100000).toFixed(2)} Lakh` : null,
      on_road: v.on_road_price ? `₹${(v.on_road_price / 100000).toFixed(2)} Lakh` : null,
    })) || [],
    city_pricing: cityPricing?.map((p: any) => ({
      city: p.city,
      ex_showroom: `₹${(p.ex_showroom / 100000).toFixed(2)} Lakh`,
      on_road: `₹${(p.on_road_price / 100000).toFixed(2)} Lakh`,
      rto: `₹${p.rto?.toLocaleString("en-IN")}`,
      insurance: `₹${p.insurance?.toLocaleString("en-IN")}`,
    })) || null,
  };
}

async function toolFindDealers(supabase: any, args: any) {
  let query = supabase.from("dealer_companies")
    .select("company_name, city, state, address, phone, email, brands_carried")
    .eq("is_active", true);

  if (args.city) query = query.ilike("city", `%${args.city}%`);
  if (args.brand) query = query.contains("brands_carried", [args.brand]);

  const { data, error } = await query.limit(5);
  if (error || !data?.length) {
    return { message: `No dealers found in ${args.city || "your area"}. Contact us: www.grabyourcar.com/contact`, dealers: [] };
  }

  return {
    dealers: data.map((d: any) => ({
      name: d.company_name,
      city: d.city,
      address: d.address,
      phone: d.phone,
      brands: d.brands_carried,
    })),
    contact_url: "/dealers",
  };
}

async function toolCaptureLead(supabase: any, args: any, customerName?: string, customerPhone?: string, channel?: string) {
  const leadData: any = {
    customer_name: args.name || customerName || "Website Lead",
    phone: args.phone || customerPhone || "",
    source: channel === "whatsapp" ? "whatsapp_ai_bot" : "website_chatbot",
    service_category: args.service || "new_car",
    status: "new",
    priority: "high",
    notes: `AI-captured lead. Car interest: ${args.car_interest || "N/A"}. City: ${args.city || "N/A"}`,
    city: args.city || null,
  };

  if (!leadData.phone) {
    return { captured: false, message: "Could you share your phone number so our expert can call you?" };
  }

  try {
    await supabase.from("leads").upsert(leadData, { onConflict: "phone" });
    return { captured: true, message: "Your details have been saved! Our car expert will contact you shortly." };
  } catch (e) {
    console.error("Lead capture error:", e);
    return { captured: false, message: "We noted your interest. Our team will reach out soon." };
  }
}

function getSuggestedActions(intent: string): string[] {
  const actionMap: Record<string, string[]> = {
    car_inquiry: ["View car details", "Compare with alternatives", "Book test drive"],
    loan: ["Apply for car loan", "Check eligibility", "Compare EMI plans"],
    insurance: ["Get insurance quote", "Compare plans", "Renew policy"],
    test_drive: ["Book test drive", "Find nearest dealer"],
    general: ["Browse cars", "Calculate EMI", "Get expert help"],
  };
  return actionMap[intent] || actionMap.general;
}

// ===== AI CALLING FUNCTIONS =====
function callAI(apiKey: string, messages: any[], stream = false) {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      stream,
      max_tokens: 1200,
      temperature: 0.7,
    }),
  });
}

function callAIWithTools(apiKey: string, messages: any[]) {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      max_tokens: 1200,
      temperature: 0.7,
    }),
  });
}

async function callAIWithFallback(apiKey: string, messages: any[]): Promise<string> {
  for (const model of AI_MODELS) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages, max_tokens: 1200, temperature: 0.7 }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      }
      if (response.status === 402) throw new Error("AI credits exhausted");
      if (response.status === 429 || response.status === 404) continue;
    } catch (e) {
      if ((e as Error).message?.includes("credits")) throw e;
      console.error(`AI exception ${model}:`, e);
    }
  }
  throw new Error("All AI models failed");
}

function handleAIError(response: Response) {
  if (response.status === 429) {
    return new Response(JSON.stringify({ error: "Rate limited, please try again" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (response.status === 402) {
    return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
      status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ error: `AI error: ${response.status}` }), {
    status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
