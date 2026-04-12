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
  // ====== CUSTOMER SELF-SERVICE TOOLS ======
  {
    type: "function",
    function: {
      name: "lookup_my_policy",
      description: "Look up customer's insurance policy details. ONLY returns data for the customer's own registered phone number. Use when customer asks about their insurance policy, policy copy, policy status, or renewal.",
      parameters: {
        type: "object",
        properties: {
          vehicle_number: { type: "string", description: "Vehicle registration number like DL10CJ4761" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_my_invoices",
      description: "Look up customer's invoices and bills. ONLY returns invoices linked to the customer's registered phone number. Use when customer asks for invoice, bill, receipt, or payment history.",
      parameters: {
        type: "object",
        properties: {
          invoice_type: { type: "string", enum: ["all", "insurance", "hsrp", "accessories", "car_sales", "self_drive"], description: "Filter by service type" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_my_loan",
      description: "Look up customer's car loan application status, EMI details, and disbursement info. ONLY returns data for the customer's registered phone number.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_my_hsrp",
      description: "Look up customer's HSRP booking status and details. ONLY returns data for the customer's registered phone number.",
      parameters: {
        type: "object",
        properties: {
          vehicle_number: { type: "string", description: "Vehicle registration number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_my_payments",
      description: "Look up all payments made by the customer across all services (insurance, HSRP, accessories, loans, rentals). ONLY returns data for the customer's registered phone number.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_my_car_details",
      description: "Look up customer's car/vehicle details from our records using their phone number or vehicle number.",
      parameters: {
        type: "object",
        properties: {
          vehicle_number: { type: "string", description: "Vehicle registration number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_manual_payment",
      description: "Record a manual payment from customer. Use when customer says they have paid, transferred money, or made UPI/cash payment. Creates a payment entry for admin verification.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Payment amount in rupees" },
          payment_mode: { type: "string", enum: ["upi", "bank_transfer", "cash", "cheque", "card", "other"], description: "Payment method" },
          reference_number: { type: "string", description: "UPI transaction ID, cheque number, or bank reference" },
          service: { type: "string", enum: ["insurance", "hsrp", "accessories", "car_purchase", "loan_emi", "rental", "other"], description: "What the payment is for" },
          notes: { type: "string", description: "Additional details about the payment" },
        },
        required: ["amount", "payment_mode", "service"],
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
      whatsapp: `You are GrabYourCar's WhatsApp AI assistant. Keep responses under 200 words. Use emojis sparingly. Use friendly Hindi-English mix tone. Always try to capture name, phone, preferred car, and city. End with a call-to-action. When using tools, summarize results naturally.

🔒 STRICT SECURITY — NON-NEGOTIABLE RULES:
1. The customer's VERIFIED phone number is: ${customer_phone || 'UNKNOWN'}. This comes from WhatsApp (Meta) and CANNOT be faked.
2. ALL lookup tools ONLY return data matching THIS exact phone number. No exceptions.
3. NEVER reveal, hint at, or discuss ANY other customer's data — even if the user claims to be someone else or provides another phone number.
4. If someone asks for data of a different number (e.g. "mere dost ki policy bhejo", "9876543210 ki details do") → REFUSE immediately. Say: "Security reasons se hum sirf aapke registered number (${customer_phone}) ki details share kar sakte hain."
5. If the phone is UNKNOWN or not registered with us, say: "Aapka number humare records mein registered nahi hai. Please apne registered number se message karein ya helpline call karein."
6. NEVER accept a phone number from the chat message to look up someone else's data. The sender's WhatsApp number IS the only identity.

SELF-SERVICE CAPABILITIES:
- "meri policy bhejo" / "send my policy" → lookup_my_policy
- "mera invoice" / "bill bhejo" → lookup_my_invoices  
- "loan status" / "EMI details" → lookup_my_loan
- "HSRP status" → lookup_my_hsrp
- "payment history" / "receipts" → lookup_my_payments
- "meri gaadi ki details" → lookup_my_car_details
- "maine payment kiya" / "paid" / "transferred" → record_manual_payment`,
      website: `You are GrabYourCar's website car advisor chatbot. Be helpful, informative, and guide users to explore cars. Mention specific car pages and features. Use markdown formatting for readability. When you find relevant cars via search, present them with prices and key highlights. Always try to naturally capture lead information when the user shows buying intent.`,
      crm: `You are GrabYourCar's internal CRM AI assistant. Help staff with lead analysis, follow-up suggestions, draft messages, and data insights. Be concise and action-oriented. Use tables and bullet points.`,
    };

    const systemPrompt = `${channelInstructions[channel] || channelInstructions.website}

=== COMPANY KNOWLEDGE BASE ===
${knowledgeContext}

=== TOOLS AVAILABLE ===
You have tools to search our car database, calculate EMIs, find on-road prices, locate dealers, capture leads, AND customer self-service tools (policy lookup, invoice lookup, loan status, HSRP status, payment history, manual payment recording). USE THEM whenever relevant to give accurate, real-time data instead of generic answers.

=== GUIDELINES ===
- When a customer asks about a specific car, USE search_cars to get real data
- When they ask about price/cost, USE get_on_road_price with their city
- When they mention budget or EMI, USE calculate_emi
- When they share contact info or show strong intent, USE capture_lead
- For dealer/showroom queries, USE find_dealers
- For personal data requests (policy/invoice/loan/HSRP/payments), USE the lookup tools — STRICTLY phone-verified
- For payment confirmations, USE record_manual_payment
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
      const toolResult = await executeWithTools(LOVABLE_API_KEY, supabase, aiMessages, channel, customer_name, customer_phone);
      
      if (toolResult.toolsUsed) {
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
  const firstResponse = await callAIWithTools(apiKey, messages);

  if (!firstResponse.ok) {
    if (firstResponse.status === 402) throw new Error("AI credits exhausted");
    if (firstResponse.status === 429) throw new Error("Rate limited");
    throw new Error(`AI error: ${firstResponse.status}`);
  }

  const firstData = await firstResponse.json();
  const firstChoice = firstData.choices?.[0];

  if (!firstChoice) throw new Error("No AI response");

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
        // ====== SELF-SERVICE TOOLS ======
        case "lookup_my_policy":
          result = await toolLookupPolicy(supabase, customerPhone, args.vehicle_number);
          intent = "insurance";
          break;
        case "lookup_my_invoices":
          result = await toolLookupInvoices(supabase, customerPhone, args.invoice_type);
          intent = "invoice";
          break;
        case "lookup_my_loan":
          result = await toolLookupLoan(supabase, customerPhone);
          intent = "loan";
          break;
        case "lookup_my_hsrp":
          result = await toolLookupHSRP(supabase, customerPhone, args.vehicle_number);
          intent = "hsrp";
          break;
        case "lookup_my_payments":
          result = await toolLookupPayments(supabase, customerPhone);
          intent = "payments";
          break;
        case "lookup_my_car_details":
          result = await toolLookupCarDetails(supabase, customerPhone, args.vehicle_number);
          intent = "car_details";
          break;
        case "record_manual_payment":
          result = await toolRecordManualPayment(supabase, customerPhone, customerName, args);
          intent = "payment_recorded";
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

  const content = firstChoice.message?.content?.trim() || "I'm here to help!";
  return {
    response: content,
    intent: "general",
    leadCaptured: false,
    suggestedActions: [],
    toolsUsed: false,
  };
}

// ===== ORIGINAL TOOL IMPLEMENTATIONS =====
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
  const { data: cars } = await supabase.from("cars")
    .select("id, name, brand, price_range, slug")
    .ilike("name", `%${args.car_name.replace(/\s+/g, "%")}%`)
    .limit(1);

  if (!cars?.length) {
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
  const { data: variants } = await supabase.from("car_variants")
    .select("name, price, fuel_type, transmission, ex_showroom, on_road_price")
    .eq("car_id", car.id)
    .order("sort_order")
    .limit(5);

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

// ===== CUSTOMER SELF-SERVICE TOOL IMPLEMENTATIONS =====

/** Normalize phone for DB matching: try with/without 91 prefix */
function phoneVariants(phone?: string): string[] {
  if (!phone) return [];
  const clean = phone.replace(/\D/g, "");
  const variants = [clean];
  if (clean.startsWith("91") && clean.length > 10) variants.push(clean.slice(2));
  if (!clean.startsWith("91") && clean.length === 10) variants.push("91" + clean);
  return variants;
}

async function toolLookupPolicy(supabase: any, customerPhone?: string, vehicleNumber?: string) {
  if (!customerPhone) return { error: "Phone number not available. Please share your registered mobile number." };
  
  const phones = phoneVariants(customerPhone);
  
  // Find insurance client by phone
  let query = supabase.from("insurance_clients")
    .select("id, customer_name, phone, vehicle_number, vehicle_make, vehicle_model, vehicle_year, current_policy_number, current_policy_type, current_insurer, current_premium, policy_expiry_date, policy_start_date, pipeline_stage, ncb_percentage")
    .or(phones.map(p => `phone.eq.${p}`).join(","));

  if (vehicleNumber) {
    const cleanVehicle = vehicleNumber.replace(/\s+/g, "").toUpperCase();
    query = supabase.from("insurance_clients")
      .select("id, customer_name, phone, vehicle_number, vehicle_make, vehicle_model, vehicle_year, current_policy_number, current_policy_type, current_insurer, current_premium, policy_expiry_date, policy_start_date, pipeline_stage, ncb_percentage")
      .or(phones.map(p => `phone.eq.${p}`).join(",") + `,vehicle_number.ilike.%${cleanVehicle}%`);
  }

  const { data: clients } = await query.limit(5);
  
  if (!clients?.length) {
    return { found: false, message: "No insurance records found for your number. Would you like to get a new insurance quote?" };
  }

  // Verify phone matches (strict security)
  const verifiedClients = clients.filter((c: any) => phones.includes(c.phone?.replace(/\D/g, "")));
  if (!verifiedClients.length) {
    return { found: false, message: "For security, we can only share policy details with the registered mobile number. Please contact from your registered number." };
  }

  // Get policies for verified clients
  const clientIds = verifiedClients.map((c: any) => c.id);
  const { data: policies } = await supabase.from("insurance_policies")
    .select("policy_number, policy_type, insurer, premium_amount, start_date, expiry_date, status, is_renewal")
    .in("client_id", clientIds)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(3);

  return {
    found: true,
    customer: verifiedClients[0].customer_name,
    vehicles: verifiedClients.map((c: any) => ({
      vehicle: `${c.vehicle_make || ""} ${c.vehicle_model || ""}`.trim() || "N/A",
      vehicle_number: c.vehicle_number,
      year: c.vehicle_year,
      policy_number: c.current_policy_number,
      policy_type: c.current_policy_type,
      insurer: c.current_insurer,
      premium: c.current_premium ? `₹${c.current_premium.toLocaleString("en-IN")}` : "N/A",
      expiry: c.policy_expiry_date,
      ncb: c.ncb_percentage ? `${c.ncb_percentage}%` : "N/A",
      status: c.pipeline_stage,
    })),
    active_policies: policies?.map((p: any) => ({
      policy_number: p.policy_number,
      type: p.policy_type,
      insurer: p.insurer,
      premium: p.premium_amount ? `₹${p.premium_amount.toLocaleString("en-IN")}` : "N/A",
      valid_from: p.start_date,
      valid_until: p.expiry_date,
      renewal: p.is_renewal ? "Yes" : "No",
    })) || [],
  };
}

async function toolLookupInvoices(supabase: any, customerPhone?: string, invoiceType?: string) {
  if (!customerPhone) return { error: "Phone number not available." };
  
  const phones = phoneVariants(customerPhone);
  
  let query = supabase.from("invoices")
    .select("invoice_number, invoice_date, client_name, total_amount, amount_paid, balance_due, status, vertical_name, paid_at")
    .or(phones.map(p => `client_phone.eq.${p}`).join(","))
    .order("invoice_date", { ascending: false })
    .limit(10);

  if (invoiceType && invoiceType !== "all") {
    const verticalMap: Record<string, string> = {
      insurance: "Insurance", hsrp: "HSRP", accessories: "Accessories",
      car_sales: "Car Sales", self_drive: "Self Drive",
    };
    if (verticalMap[invoiceType]) query = query.eq("vertical_name", verticalMap[invoiceType]);
  }

  const { data: invoices } = await query;
  
  if (!invoices?.length) return { found: false, message: "No invoices found for your number." };

  return {
    found: true,
    total_invoices: invoices.length,
    invoices: invoices.map((inv: any) => ({
      invoice_number: inv.invoice_number,
      date: inv.invoice_date,
      amount: `₹${inv.total_amount?.toLocaleString("en-IN")}`,
      paid: `₹${(inv.amount_paid || 0).toLocaleString("en-IN")}`,
      balance: `₹${(inv.balance_due || 0).toLocaleString("en-IN")}`,
      status: inv.status,
      service: inv.vertical_name,
    })),
  };
}

async function toolLookupLoan(supabase: any, customerPhone?: string) {
  if (!customerPhone) return { error: "Phone number not available." };
  
  const phones = phoneVariants(customerPhone);
  
  const { data: loans } = await supabase.from("loan_applications")
    .select("id, customer_name, phone, vehicle_name, vehicle_number, loan_amount, interest_rate, tenure_months, emi_amount, lender_name, stage, disbursement_amount, disbursement_date, approval_date, sanction_amount")
    .or(phones.map(p => `phone.eq.${p}`).join(","))
    .order("created_at", { ascending: false })
    .limit(5);

  if (!loans?.length) return { found: false, message: "No loan applications found for your number." };

  return {
    found: true,
    loans: loans.map((l: any) => ({
      vehicle: l.vehicle_name || l.vehicle_number || "N/A",
      loan_amount: l.loan_amount ? `₹${(l.loan_amount / 100000).toFixed(1)}L` : "N/A",
      emi: l.emi_amount ? `₹${l.emi_amount.toLocaleString("en-IN")}/mo` : "N/A",
      rate: l.interest_rate ? `${l.interest_rate}%` : "N/A",
      tenure: l.tenure_months ? `${l.tenure_months} months` : "N/A",
      lender: l.lender_name || "Processing",
      status: l.stage,
      sanctioned: l.sanction_amount ? `₹${(l.sanction_amount / 100000).toFixed(1)}L` : null,
      disbursed: l.disbursement_amount ? `₹${(l.disbursement_amount / 100000).toFixed(1)}L` : null,
      disbursement_date: l.disbursement_date,
    })),
  };
}

async function toolLookupHSRP(supabase: any, customerPhone?: string, vehicleNumber?: string) {
  if (!customerPhone) return { error: "Phone number not available." };
  
  const phones = phoneVariants(customerPhone);
  
  let query = supabase.from("hsrp_bookings")
    .select("id, owner_name, mobile, registration_number, vehicle_category, service_type, service_price, payment_status, payment_amount, order_status, razorpay_order_id, created_at")
    .or(phones.map(p => `mobile.eq.${p}`).join(","))
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: bookings } = await query;
  
  if (!bookings?.length) return { found: false, message: "No HSRP bookings found for your number." };

  return {
    found: true,
    bookings: bookings.map((b: any) => ({
      vehicle: b.registration_number,
      category: b.vehicle_category,
      service: b.service_type,
      price: `₹${(b.service_price || b.payment_amount || 0).toLocaleString("en-IN")}`,
      payment_status: b.payment_status,
      order_status: b.order_status,
      booked_on: b.created_at?.split("T")[0],
    })),
  };
}

async function toolLookupPayments(supabase: any, customerPhone?: string) {
  if (!customerPhone) return { error: "Phone number not available." };
  
  const phones = phoneVariants(customerPhone);
  const results: any[] = [];

  // Invoices (paid)
  const { data: paidInvoices } = await supabase.from("invoices")
    .select("invoice_number, total_amount, paid_at, vertical_name, status")
    .or(phones.map(p => `client_phone.eq.${p}`).join(","))
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(10);

  if (paidInvoices?.length) {
    for (const inv of paidInvoices) {
      results.push({
        type: inv.vertical_name || "Invoice",
        amount: `₹${inv.total_amount?.toLocaleString("en-IN")}`,
        date: inv.paid_at?.split("T")[0],
        reference: inv.invoice_number,
        status: "Paid ✅",
      });
    }
  }

  // HSRP payments
  const { data: hsrpPayments } = await supabase.from("hsrp_bookings")
    .select("registration_number, payment_amount, payment_status, created_at")
    .or(phones.map(p => `mobile.eq.${p}`).join(","))
    .eq("payment_status", "paid")
    .limit(5);

  if (hsrpPayments?.length) {
    for (const h of hsrpPayments) {
      results.push({
        type: "HSRP",
        amount: `₹${(h.payment_amount || 0).toLocaleString("en-IN")}`,
        date: h.created_at?.split("T")[0],
        reference: h.registration_number,
        status: "Paid ✅",
      });
    }
  }

  // Accessory orders
  const { data: accOrders } = await supabase.from("accessory_orders")
    .select("order_id, total_amount, payment_status, created_at")
    .or(phones.map(p => `shipping_phone.eq.${p}`).join(","))
    .limit(5);

  if (accOrders?.length) {
    for (const o of accOrders) {
      results.push({
        type: "Accessories",
        amount: `₹${o.total_amount?.toLocaleString("en-IN")}`,
        date: o.created_at?.split("T")[0],
        reference: o.order_id,
        status: o.payment_status === "paid" ? "Paid ✅" : o.payment_status,
      });
    }
  }

  // Manual payments
  const { data: manualPayments } = await supabase.from("wa_manual_payments")
    .select("amount, payment_mode, reference_number, service, status, created_at")
    .or(phones.map(p => `customer_phone.eq.${p}`).join(","))
    .order("created_at", { ascending: false })
    .limit(10);

  if (manualPayments?.length) {
    for (const mp of manualPayments) {
      results.push({
        type: mp.service,
        amount: `₹${mp.amount?.toLocaleString("en-IN")}`,
        date: mp.created_at?.split("T")[0],
        reference: mp.reference_number || "Manual",
        status: mp.status === "verified" ? "Verified ✅" : mp.status === "rejected" ? "Rejected ❌" : "Pending ⏳",
      });
    }
  }

  if (!results.length) return { found: false, message: "No payment records found for your number." };

  return { found: true, total: results.length, payments: results };
}

async function toolLookupCarDetails(supabase: any, customerPhone?: string, vehicleNumber?: string) {
  if (!customerPhone) return { error: "Phone number not available." };
  
  const phones = phoneVariants(customerPhone);
  const vehicles: any[] = [];

  // Insurance clients
  const { data: insClients } = await supabase.from("insurance_clients")
    .select("vehicle_number, vehicle_make, vehicle_model, vehicle_year, current_insurer, policy_expiry_date")
    .or(phones.map(p => `phone.eq.${p}`).join(","))
    .limit(5);

  if (insClients?.length) {
    for (const c of insClients) {
      vehicles.push({
        vehicle_number: c.vehicle_number,
        make: c.vehicle_make,
        model: c.vehicle_model,
        year: c.vehicle_year,
        insurer: c.current_insurer,
        insurance_expiry: c.policy_expiry_date,
        source: "Insurance Records",
      });
    }
  }

  // HSRP bookings
  const { data: hsrpBookings } = await supabase.from("hsrp_bookings")
    .select("registration_number, vehicle_category")
    .or(phones.map(p => `mobile.eq.${p}`).join(","))
    .limit(5);

  if (hsrpBookings?.length) {
    for (const h of hsrpBookings) {
      if (!vehicles.some(v => v.vehicle_number === h.registration_number)) {
        vehicles.push({ vehicle_number: h.registration_number, category: h.vehicle_category, source: "HSRP Records" });
      }
    }
  }

  // Loan applications
  const { data: loans } = await supabase.from("loan_applications")
    .select("vehicle_name, vehicle_number, stage")
    .or(phones.map(p => `phone.eq.${p}`).join(","))
    .limit(5);

  if (loans?.length) {
    for (const l of loans) {
      if (l.vehicle_number && !vehicles.some(v => v.vehicle_number === l.vehicle_number)) {
        vehicles.push({ vehicle_number: l.vehicle_number, vehicle_name: l.vehicle_name, loan_status: l.stage, source: "Loan Records" });
      }
    }
  }

  if (!vehicles.length) return { found: false, message: "No vehicle records found for your number." };

  return { found: true, total: vehicles.length, vehicles };
}

async function toolRecordManualPayment(supabase: any, customerPhone?: string, customerName?: string, args?: any) {
  if (!customerPhone) return { error: "Phone number not available. Cannot record payment." };

  const { data, error } = await supabase.from("wa_manual_payments").insert({
    customer_phone: customerPhone,
    customer_name: customerName || "WhatsApp Customer",
    amount: args.amount,
    payment_mode: args.payment_mode,
    reference_number: args.reference_number || null,
    service: args.service,
    notes: args.notes || null,
    status: "pending_verification",
    source: "whatsapp_bot",
  }).select("id").single();

  if (error) {
    console.error("Manual payment record error:", error);
    return { recorded: false, message: "Could not record payment. Please try again or contact our team." };
  }

  return {
    recorded: true,
    payment_id: data.id,
    message: `Payment of ₹${args.amount.toLocaleString("en-IN")} recorded successfully! Our team will verify it within 30 minutes. You'll receive a confirmation once verified. 🧾`,
  };
}

function getSuggestedActions(intent: string): string[] {
  const actionMap: Record<string, string[]> = {
    car_inquiry: ["View car details", "Compare with alternatives", "Book test drive"],
    loan: ["Apply for car loan", "Check eligibility", "Compare EMI plans"],
    insurance: ["Get insurance quote", "Compare plans", "Renew policy"],
    test_drive: ["Book test drive", "Find nearest dealer"],
    invoice: ["Download invoice", "Payment history"],
    hsrp: ["Track HSRP order", "Book HSRP"],
    payments: ["View all payments", "Download receipts"],
    payment_recorded: ["Check payment status", "Contact support"],
    car_details: ["View car specs", "Get insurance quote"],
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
