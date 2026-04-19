import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tum **Riya** ho — GrabYourCar.com ki AI sales assistant. Friendly Hinglish me baat karo (English + Hindi mix, jaise normal Indian customer support karta hai). Concise, warm aur helpful.

## Tumhari personality
- Apna naam hamesha "Riya from GrabYourCar" batao jab koi puchhe.
- Polite, energetic, never pushy. Customer ko apna doost samjho.
- Short, scannable replies. Bullet points use karo jab list ho.

## CRITICAL — Language matching (bahut zaroori!)
Customer ki language ko AUTOMATICALLY detect karke usi me reply karo:
- **Pure English** likhe (e.g. "hello, I want to buy a car") → reply in **clean professional English only**, no Hindi words.
- **Pure Hindi/Devanagari** likhe (e.g. "मुझे कार चाहिए") → reply in **Hindi (Devanagari script)**.
- **Hinglish / Roman Hindi** likhe (e.g. "bhai car chahiye", "kitne ka hai") → reply in **friendly Hinglish** (default).
- **Punjabi/Marathi/Tamil/Bengali/Gujarati** etc. likhe → us regional language me reply karo (Roman script chalega agar customer Roman use kare).
- Har naye message pe language re-detect karo. Beech me switch karein to tum bhi switch karo immediately.
- Greeting/intro line bhi customer ki language me hi do.

## CRITICAL — Role clarity (bahut zaroori!)
- Tum **GrabYourCar ki sales assistant** ho — tum customer ko car BECHTI ho, customer nahi ho.
- **KABHI BHI** customer se mat kehna ki "main car kharidna chahti hoon" ya "meri madad karein". Tum HELPER ho, asker nahi.
- Hamesha customer ki need samjho aur unko solution do — cars dikhao, price batao, brochure bhejo, EMI calculate karo.
- Agar user casual/funny baat kare (jaise "hello", "hahaha"), to friendly reply do aur dheere se topic ko car/service pe le aao. Example: "Haha 😄 Waise bataiye, koi car dhundh rahe ho ya insurance/loan ki info chahiye?"
- Tum AI/assistant ho jo GrabYourCar ki taraf se kaam karti ho — customer apni need batayega, tum solution dogi.

## GrabYourCar kya offer karta hai
1. **New Car Sales** — All brands (Maruti, Hyundai, Tata, Mahindra, Kia, Toyota, Honda, MG, Skoda, VW, Premium brands). Best on-road price + free home delivery.
2. **Car Insurance** — Comprehensive, Third-party, Own Damage. 25+ insurers compare. Instant policy.
3. **Car Loans** — Tie-ups with HDFC, ICICI, SBI, Axis, BoB. Lowest EMI, fast approval.
4. **HSRP (High Security Number Plates)** — Govt-approved plates with home delivery.
5. **Self-Drive Car Rentals** — Hourly/daily/monthly rentals across India.
6. **Dealer Network** — Pan-India dealer connect for test drives & best price negotiation.
7. **Accessories** — Genuine + aftermarket accessories home delivery.

## Tools tum use kar sakti ho
- **capture_lead**: Jab user kisi service me interested ho aur naam + phone share kare. Vertical sahi choose karo (sales/insurance/loans/hsrp/rentals/dealer/accessories).
- **send_brochure**: Jab user kisi specific car ka brochure maange. Phone number lazmi hai.
- **request_human_handoff**: SIRF jab user explicit bole "human chahiye", "agent se baat karni hai", "talk to person", ya bahut frustrated ho.

## Rules
- Jab tak phone number nahi mile tab tak lead capture mat karo. Politely maango.
- Brochure ke liye: pehle car name + phone number lo, fir send_brochure call karo.
- Price exact nahi pata to "approximate range" do aur exact ke liye executive callback offer karo.
- Kabhi mat bolo ki tum AI/bot ho jab tak user direct na puchhe — bolo "I'm Riya, your assistant".
- Jhuth mat bolo. Pata nahi to "let me connect you with our expert" bolo.`;

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

async function executeToolCall(
  toolCall: ToolCall,
  supabase: ReturnType<typeof createClient>,
  sessionContext: { sessionId: string; userAgent?: string }
): Promise<string> {
  const args = JSON.parse(toolCall.function.arguments || "{}");
  const fn = toolCall.function.name;

  try {
    if (fn === "capture_lead") {
      const { name, phone, vertical = "sales", city, message, car_interest } = args;
      if (!phone) return JSON.stringify({ success: false, error: "Phone number required" });
      const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
      if (cleanPhone.length !== 10) return JSON.stringify({ success: false, error: "Invalid phone (need 10 digits)" });

      // Insert into automation_lead_tracking
      const leadId = crypto.randomUUID();
      const { error } = await supabase.from("automation_lead_tracking").insert({
        lead_id: leadId,
        name: name || "Riya Chat Lead",
        phone: cleanPhone,
        vertical,
        source: "riya_chatbot",
        lead_source_type: "ai_chat",
        message: message || car_interest || "Captured via Riya AI chatbot",
        city: city || null,
        status: "new",
        raw_data: { ...args, session_id: sessionContext.sessionId, user_agent: sessionContext.userAgent } as never,
      });
      if (error) {
        console.error("[riya-chat] capture_lead error:", error);
        return JSON.stringify({ success: false, error: error.message });
      }
      return JSON.stringify({ success: true, lead_id: leadId, message: `Lead saved! Hamari team aapko 15 min me ${cleanPhone} pe call karegi.` });
    }

    if (fn === "send_brochure") {
      const { car_name, phone, name } = args;
      if (!phone || !car_name) return JSON.stringify({ success: false, error: "Phone & car_name required" });
      const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);

      // Find brochure
      const { data: cars } = await supabase
        .from("cars")
        .select("id, name, brand, brochure_url, slug")
        .or(`name.ilike.%${car_name}%,brand.ilike.%${car_name}%`)
        .limit(1);

      const car = cars?.[0];
      if (!car?.brochure_url) {
        // Save lead anyway and let team send
        await supabase.from("automation_lead_tracking").insert({
          lead_id: crypto.randomUUID(),
          name: name || "Brochure Request",
          phone: cleanPhone,
          vertical: "sales",
          source: "riya_chatbot",
          lead_source_type: "brochure_request",
          message: `Brochure requested for: ${car_name}`,
          status: "new",
          raw_data: args as never,
        });
        return JSON.stringify({
          success: true,
          message: `${car_name} ka brochure ready kar rahe hain. 5 min me WhatsApp pe ${cleanPhone} pe pahunch jayega.`,
        });
      }

      // Try sending via WhatsApp
      try {
        await supabase.functions.invoke("wa-send-inbox", {
          body: {
            phone: `91${cleanPhone}`,
            message_type: "document",
            content: `Hi ${name || "there"}! Riya here from GrabYourCar 👋\n\n${car.brand} ${car.name} ka brochure attached hai. Koi bhi question ho to reply karein!`,
            media_url: car.brochure_url,
            media_filename: `${car.brand}-${car.name}-brochure.pdf`,
            sent_by_name: "Riya (AI)",
          },
        });
      } catch (e) {
        console.warn("[riya-chat] WhatsApp send failed, brochure URL will be returned:", e);
      }

      // Save lead
      await supabase.from("automation_lead_tracking").insert({
        lead_id: crypto.randomUUID(),
        name: name || "Brochure Request",
        phone: cleanPhone,
        vertical: "sales",
        source: "riya_chatbot",
        lead_source_type: "brochure_sent",
        message: `Brochure sent for ${car.brand} ${car.name}`,
        status: "contacted",
        contacted: true,
        contacted_at: new Date().toISOString(),
        raw_data: { ...args, brochure_url: car.brochure_url } as never,
      });

      return JSON.stringify({
        success: true,
        brochure_url: car.brochure_url,
        message: `${car.brand} ${car.name} ka brochure WhatsApp pe bhej diya (${cleanPhone}). Direct link: ${car.brochure_url}`,
      });
    }

    if (fn === "request_human_handoff") {
      const { name, phone, reason } = args;
      const cleanPhone = phone ? String(phone).replace(/\D/g, "").slice(-10) : null;
      if (!cleanPhone) return JSON.stringify({ success: false, error: "Phone number chahiye taaki agent call kar sake" });

      await supabase.from("automation_lead_tracking").insert({
        lead_id: crypto.randomUUID(),
        name: name || "Human Handoff Request",
        phone: cleanPhone,
        vertical: "sales",
        source: "riya_chatbot",
        lead_source_type: "human_handoff",
        message: `URGENT — Human agent requested. Reason: ${reason || "Not specified"}`,
        status: "new",
        priority: "high",
        raw_data: args as never,
      } as never);

      return JSON.stringify({
        success: true,
        message: `Aapki request agent team ko forward kar di hai. 5-10 min me hamari team ${cleanPhone} pe call karegi.`,
      });
    }

    return JSON.stringify({ error: `Unknown tool: ${fn}` });
  } catch (e) {
    console.error("[riya-chat] tool error:", fn, e);
    return JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Tool execution failed" });
  }
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "capture_lead",
      description: "Save a customer lead to the CRM when they show interest in any service and have shared their phone number.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Customer name" },
          phone: { type: "string", description: "10-digit Indian phone number" },
          vertical: { type: "string", enum: ["sales", "insurance", "loans", "hsrp", "rentals", "dealer", "accessories"], description: "Service category" },
          city: { type: "string" },
          message: { type: "string", description: "What customer is looking for" },
          car_interest: { type: "string", description: "Specific car they asked about" },
        },
        required: ["phone", "vertical"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_brochure",
      description: "Send a car brochure PDF to the customer via WhatsApp. Requires car name and phone number.",
      parameters: {
        type: "object",
        properties: {
          car_name: { type: "string", description: "Car model name e.g. Swift, Creta" },
          phone: { type: "string", description: "10-digit Indian phone number" },
          name: { type: "string", description: "Customer name" },
        },
        required: ["car_name", "phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_human_handoff",
      description: "Transfer the conversation to a human agent. Use ONLY when customer explicitly asks for a human or is frustrated.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string", description: "10-digit Indian phone number for callback" },
          reason: { type: "string", description: "Why they want a human" },
        },
        required: ["phone"],
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { messages, sessionId } = body as { messages: Array<{ role: string; content: string }>; sessionId?: string };

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionContext = {
      sessionId: sessionId || crypto.randomUUID(),
      userAgent: req.headers.get("user-agent") || undefined,
    };

    // Multi-turn tool loop (non-streaming for tool calls, stream final response)
    let conversationMessages: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    // First pass — check for tool calls
    let iterations = 0;
    while (iterations < 4) {
      iterations++;
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: conversationMessages,
          tools: TOOLS,
          stream: false,
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded, try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const txt = await aiResp.text();
        console.error("[riya-chat] AI gateway error:", aiResp.status, txt);
        return new Response(JSON.stringify({ error: "AI service unavailable" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await aiResp.json();
      const choice = data.choices?.[0]?.message;
      if (!choice) {
        return new Response(JSON.stringify({ error: "Empty AI response" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const toolCalls: ToolCall[] | undefined = choice.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        // Execute tools, append, loop again
        conversationMessages.push(choice as Record<string, unknown>);
        for (const tc of toolCalls) {
          const result = await executeToolCall(tc, supabase, sessionContext);
          conversationMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: result,
          });
        }
        continue;
      }

      // Final response — no tool calls
      return new Response(
        JSON.stringify({
          message: choice.content || "Sorry, I didn't catch that. Phir se bolenge?",
          sessionId: sessionContext.sessionId,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hit iteration limit
    return new Response(
      JSON.stringify({
        message: "Lagta hai kuch complex hai. Hamari team aapko call karegi — kya phone number share karenge?",
        sessionId: sessionContext.sessionId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[riya-chat] fatal:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
