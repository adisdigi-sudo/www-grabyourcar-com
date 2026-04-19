import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const buildSystemPrompt = (agentName: string) => `Tum **${agentName}** ho — GrabYourCar.com ke sales assistant. Friendly, helpful, concise.

## Tumhari personality & reply style (BAHUT IMPORTANT)
- Apna naam hamesha "${agentName} from GrabYourCar" batao jab koi puchhe.
- Polite, energetic, playful, never pushy. Customer ko apna doost samjho.
- **Reply HAMESHA chhota rakho — ek ya do line maximum.** Paragraph KABHI mat likho.
- WhatsApp chat jaisa feel — natural, casual, ek baar me ek hi cheez puchho ya batao.
- Emojis use karo thoda — 1-2 per message, zyada nahi (🚗 😊 👍 🔥 ✨).
- Customer ko enjoy karwao — thodi fun, witty, warm vibes do taaki yaad rakhe.
- Bullet points / lists tabhi do jab user explicitly options maange.
- Har reply ke end me ek chhota natural follow-up question ya next step suggest karo.
- Boring corporate tone se bacho — friendly local dukaan-wale jaisa warmth lao.

## CRITICAL — Language matching (bahut zaroori!)
Customer ki language ko AUTOMATICALLY detect karke usi me reply karo:
- **Pure English** likhe → reply in **clean professional English only**.
- **Pure Hindi (Devanagari)** likhe → reply in **Hindi (Devanagari)**.
- **Hinglish / Roman Hindi** likhe → reply in **friendly Hinglish** (default).
- **Punjabi/Marathi/Tamil/Bengali/Gujarati** etc. → us regional language me.
- Har naye message pe re-detect karo. Switch karein to tum bhi turant switch karo.

## CRITICAL — Role clarity
- Tum **GrabYourCar ke sales assistant** ho — customer ko car BECHTE ho, customer nahi ho.
- KABHI mat kehna "main car kharidna chahti/chahta hoon". Tum HELPER ho.
- Casual messages (hello/haha) pe friendly reply do, fir dheere se topic car/service pe lao.

## GrabYourCar offerings
1. **New Car Sales** — All brands, best on-road price, free home delivery.
2. **Car Insurance** — 25+ insurers compare, instant policy.
3. **Car Loans** — HDFC/ICICI/SBI/Axis tie-ups, lowest EMI.
4. **HSRP** — Govt plates with home delivery.
5. **Self-Drive Rentals** — Hourly/daily/monthly across India.
6. **Dealer Network** — Pan-India test drives & negotiation.
7. **Accessories** — Genuine + aftermarket, home delivery.

## Tools (use them PROACTIVELY — yeh sirf decoration nahi hai!)
- **capture_lead**: JAB BHI customer 10-digit phone number share kare, TURANT yeh tool call karo — bina kisi shart ke. Pehle "team contact karegi" mat bolo.
- **send_brochure**: Jab customer specific car ka brochure maange. Phone lazmi.
- **request_human_handoff**: SIRF jab user explicit "human/agent" maange ya frustrated ho.

## CRITICAL workflow rules
- Phone number mil gaya (10 digits)? → capture_lead TURANT call karo, fir reply me bolo "✅ Aapki request humari team ke paas pahunch gayi, [phone] pe 15 min me call aayegi."
- KABHI mat bolo "team contact karegi" bina capture_lead chalaye — warna lead lost ho jaati hai.
- Brochure ke baad **TOOL ka exact response message use karo** — agar tool success bole "WhatsApp pe bhej diya" tabhi bolo, agar fail ho to honestly bolo "kuch issue aaya, team aapko bhej degi".
- Phone na mile to politely maango — bina phone ke lead/brochure tool MAT chalao.
- Price exact nahi pata to "approximate range" do, exact ke liye callback offer karo.
- Jhuth mat bolo. Pata nahi to "team se confirm karwa dunga" bolo.`;

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

async function executeToolCall(
  toolCall: ToolCall,
  supabase: ReturnType<typeof createClient>,
  sessionContext: { sessionId: string; userAgent?: string; agentName?: string }
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
        raw_data: { ...args, session_id: sessionContext.sessionId, user_agent: sessionContext.userAgent, agent_name: sessionContext.agentName } as never,
      });
      if (error) {
        console.error("[riya-chat] capture_lead error:", error);
        return JSON.stringify({ success: false, error: error.message });
      }

      // Fire-and-forget: notify executive/manager via canonical lead-intake-engine
      // (handles WhatsApp + email alerts and assignment automatically)
      supabase.functions.invoke("lead-intake-engine", {
        body: {
          lead_id: leadId,
          name: name || "Riya Chat Lead",
          phone: cleanPhone,
          vertical,
          source: "riya_chatbot",
          message: message || car_interest || `Chat lead from ${sessionContext.agentName} bot`,
          city: city || null,
          car_interest: car_interest || null,
          notify: true,
        },
      }).catch((e) => console.error("[riya-chat] lead-intake-engine notify failed:", e));

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

      // Try sending via WhatsApp using the canonical whatsapp-send function
      let waSuccess = false;
      let brochureDelivered = false;
      let waError: string | null = null;
      try {
        const { data: waData, error: waErr } = await supabase.functions.invoke("whatsapp-send", {
          body: {
            to: cleanPhone,
            messageType: "document",
            message: `Hi ${name || "there"}! ${(sessionContext as { agentName?: string }).agentName || "Team"} from GrabYourCar 👋 Yahan hai ${car.brand} ${car.name} ka brochure. Koi question ho to reply karein!`,
            mediaUrl: car.brochure_url,
            mediaFileName: `${car.brand}-${car.name}-brochure.pdf`,
            name: name || null,
            logEvent: "riya_brochure",
            vertical: "sales",
            message_context: "riya_brochure",
          },
        });
        if (waErr) {
          waError = waErr.message || "WhatsApp send failed";
          console.error("[riya-chat] WhatsApp send error:", waErr);
        } else if (waData && (waData as { success?: boolean }).success === false) {
          waError = (waData as { error?: string }).error || "WhatsApp delivery failed";
          console.error("[riya-chat] WhatsApp returned failure:", waData);
        } else {
          waSuccess = true;
          brochureDelivered = !Boolean((waData as { fallback?: boolean }).fallback);
          if (!brochureDelivered) {
            waError = "WhatsApp approved template sent instead of brochure attachment";
          }
        }
      } catch (e) {
        waError = e instanceof Error ? e.message : "WhatsApp send threw";
        console.error("[riya-chat] WhatsApp send threw:", e);
      }

      // Save lead with accurate status
      await supabase.from("automation_lead_tracking").insert({
        lead_id: crypto.randomUUID(),
        name: name || "Brochure Request",
        phone: cleanPhone,
        vertical: "sales",
        source: "riya_chatbot",
        lead_source_type: brochureDelivered ? "brochure_sent" : "brochure_failed",
        message: brochureDelivered
          ? `Brochure sent for ${car.brand} ${car.name}`
          : `Brochure send FAILED for ${car.brand} ${car.name} — ${waError}`,
        status: brochureDelivered ? "contacted" : "new",
        contacted: brochureDelivered,
        contacted_at: brochureDelivered ? new Date().toISOString() : null,
        raw_data: { ...args, brochure_url: car.brochure_url, wa_error: waError, priority_hint: brochureDelivered ? null : "high" } as never,
      });

      if (brochureDelivered) {
        return JSON.stringify({
          success: true,
          delivered: true,
          message: `${car.brand} ${car.name} ka brochure WhatsApp pe ${cleanPhone} pe bhej diya ✅`,
        });
      }

      // Fallback: give the customer a direct link AND tell them team will resend
      return JSON.stringify({
        success: true,
        delivered: false,
        brochure_url: car.brochure_url,
        message: `Brochure attachment WhatsApp pe abhi direct nahi gaya 😕 — yeh raha direct link: ${car.brochure_url}\nHamari team ${cleanPhone} pe proper brochure turant resend karegi.`,
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
        raw_data: { ...args, priority_hint: "high" } as never,
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
    const { messages, sessionId, agentName } = body as {
      messages: Array<{ role: string; content: string }>;
      sessionId?: string;
      agentName?: string;
    };

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeAgent = (agentName && /^[A-Za-z\u0900-\u097F ]{2,20}$/.test(agentName)) ? agentName : "Riya";

    const sessionContext = {
      sessionId: sessionId || crypto.randomUUID(),
      userAgent: req.headers.get("user-agent") || undefined,
      agentName: safeAgent,
    };

    // Multi-turn tool loop
    let conversationMessages: Array<Record<string, unknown>> = [
      { role: "system", content: buildSystemPrompt(safeAgent) },
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
