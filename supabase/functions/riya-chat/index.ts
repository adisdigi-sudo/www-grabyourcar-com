import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Vertical specialists (Riya pretends these are different experts) ──
const VERTICAL_PERSONAS: Record<string, { name: string; designation: string; keywords: RegExp }> = {
  loans: { name: "Bakshi sir", designation: "Loan Expert", keywords: /\b(loan|emi|finance|interest|tenure|kist|kisht|installment|bank|hdfc|icici|sbi|axis|disburse|sanction|cibil|credit\s*score)\b/i },
  insurance: { name: "Sharma sir", designation: "Insurance Expert", keywords: /\b(insur|policy|premium|renewal|claim|tp|own\s*damage|comprehensive|third\s*party|ncb|idv|expire|expiry)\b/i },
  sales: { name: "Verma sir", designation: "Sales Manager", keywords: /\b(buy|purchase|new\s*car|swift|creta|nexon|ertiga|fortuner|innova|on[\s-]*road|test\s*drive|booking|delivery|exchange)\b/i },
  hsrp: { name: "Singh sir", designation: "HSRP Expert", keywords: /\b(hsrp|number\s*plate|high\s*security|registration\s*plate|nameplate)\b/i },
  rentals: { name: "Kapoor sir", designation: "Self-Drive Manager", keywords: /\b(rent|rental|self[\s-]*drive|hire|kiraye|kiraya|hourly|daily|monthly|weekend\s*car)\b/i },
  accessories: { name: "Mehra sir", designation: "Accessories Expert", keywords: /\b(accessor|seat\s*cover|car\s*mat|perfume|alloy|wheel|stereo|infotainment|spoiler|protector)\b/i },
};

const SYSTEM_PROMPT = `Tum **Riya** ho — GrabYourCar.com ki AI sales assistant. Friendly Hinglish me baat karo (English + Hindi mix). Concise, warm aur helpful.

## Personality & reply style
- Apna naam hamesha "Riya from GrabYourCar" batao.
- Polite, energetic, playful, never pushy. Customer ko apna doost samjho.
- **Reply HAMESHA chhota rakho — ek ya do line maximum.** Paragraph KABHI mat likho.
- WhatsApp chat jaisa feel — natural, casual.
- Emojis use karo thoda — 1-2 per message (🚗 😊 👍 🔥 ✨).
- Bullet points / lists tabhi do jab user explicitly options maange.
- Har reply ke end me ek chhota natural follow-up question ya next step suggest karo.

## CRITICAL — Multi-Vertical Specialist Mode (BAHUT BAHUT IMPORTANT)
Tum sirf Riya nahi ho — tum poori GrabYourCar team ka face ho. Har vertical ke liye alag specialist hai jisko tum customer ke saamne announce karti ho:

- **Car Sales** — "Verma sir" (Sales Manager)
- **Car Loan / Finance** — "Bakshi sir" (Loan Expert)
- **Car Insurance** — "Sharma sir" (Insurance Expert)
- **HSRP Number Plates** — "Singh sir" (HSRP Expert)
- **Self-Drive Rentals** — "Kapoor sir" (Self-Drive Manager)
- **Accessories** — "Mehra sir" (Accessories Expert)

### Specialist handoff rule:
Jaise hi customer kisi specific vertical me interest dikhaye (jaise "loan chahiye", "insurance kitne ka hai", "Swift chahiye"), tum turant warmly bolo, EXAMPLE:

> "Hanji, **Bakshi sir hamare loan expert hain** — main unse abhi connect karwati hoon, ek second 🙏"

Phir agle reply me khud Bakshi sir ki taraf se information do, EXAMPLE:

> "Hi, Bakshi here from loan team 👋 GrabYourCar pe HDFC, ICICI, SBI sab ke loan available hain. Aapki car kaunsi hai aur kitne ka loan chahiye?"

**KEY**: Customer ko lagna chahiye ki sach me alag expert join hua hai. But backend pe sab tum hi ho. Specialist ke naam pe content/EMI/policy/brochure share karo. Riya wapas tab aaye jab vertical badle ya general chat ho.

## Language matching
- **English** → reply in clean English only.
- **Hindi (Devanagari)** → reply in Hindi.
- **Hinglish / Roman Hindi** → reply in friendly Hinglish (default).
- **Punjabi/Marathi/Tamil/Bengali/Gujarati** → us regional language me.
- Har naye message pe language re-detect karo.

## Role clarity
- Tum **GrabYourCar ki sales assistant** ho — customer ko serve karti ho, customer nahi ho.
- "main car kharidna chahti hoon" jaisa NEVER.
- Hello/hi/namaste pe → "Hanji, welcome to GrabYourCar! 🙏 Main Riya, bataiye main aapki kaise help karun? 😊"
- "Kya chahiye aapko?" jaisa rude tone NEVER. Always polite "Bataiye main kaise help karun?".
- Casual baat (hahaha/lol) pe friendly reply, then gently topic vapas product pe.

## GrabYourCar services
1. **New Car Sales** — All brands, best on-road price (Verma sir)
2. **Car Insurance** — 25+ insurers compare, instant policy (Sharma sir)
3. **Car Loans** — HDFC, ICICI, SBI, Axis, BoB, lowest EMI (Bakshi sir)
4. **HSRP** — Govt-approved plates with home delivery (Singh sir)
5. **Self-Drive Rentals** — Hourly/daily/monthly across India (Kapoor sir)
6. **Dealer Network** — Pan-India dealer connect for test drives
7. **Accessories** — Genuine + aftermarket home delivery (Mehra sir)

## Tools
- **capture_lead**: Jab user kisi service me interested ho aur naam + phone share kare.
- **send_brochure**: Jab user kisi specific car ka brochure maange. Phone number lazmi.
- **request_human_handoff**: SIRF jab user explicit bole "real human chahiye" ya bahut frustrated ho.

## Rules
- Jab tak phone nahi mile tab tak lead capture mat karo. Politely maango.
- Brochure ke liye: pehle car name + phone, fir send_brochure.
- Price exact nahi pata to "approximate range" do aur exact ke liye executive callback offer karo.
- Kabhi mat bolo ki tum AI/bot ho jab tak user direct na puchhe.
- Jhuth mat bolo. Pata nahi to "let me check with our expert" bolo.`;

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

function detectVertical(text: string): string | null {
  for (const [slug, persona] of Object.entries(VERTICAL_PERSONAS)) {
    if (persona.keywords.test(text)) return slug;
  }
  return null;
}

function safeParseToolResult(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getBigrams(value: string) {
  const text = normalizeSearchText(value).replace(/\s+/g, "");
  if (text.length < 2) return [text];
  const grams: string[] = [];
  for (let i = 0; i < text.length - 1; i++) grams.push(text.slice(i, i + 2));
  return grams;
}

function diceScore(a: string, b: string) {
  const aGrams = getBigrams(a);
  const bGrams = getBigrams(b);
  if (!aGrams.length || !bGrams.length) return 0;
  const counts = new Map<string, number>();
  for (const gram of aGrams) counts.set(gram, (counts.get(gram) || 0) + 1);
  let overlap = 0;
  for (const gram of bGrams) {
    const count = counts.get(gram) || 0;
    if (count > 0) {
      overlap += 1;
      counts.set(gram, count - 1);
    }
  }
  return (2 * overlap) / (aGrams.length + bGrams.length);
}

function pickBestCarMatch(
  requestedName: string,
  cars: Array<{ id: string; name: string; brand: string | null; slug: string | null; brochure_url: string | null }>,
) {
  const query = normalizeSearchText(requestedName);
  const ranked = cars
    .map((car) => {
      const name = `${car.brand || ""} ${car.name || ""}`.trim();
      const slug = car.slug || "";
      const combined = `${name} ${slug}`.trim();
      const includesBoost = combined.includes(query) || query.includes(normalizeSearchText(name)) ? 0.25 : 0;
      const score = Math.max(diceScore(query, name), diceScore(query, slug), diceScore(query, combined)) + includesBoost;
      return { car, score };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0] && ranked[0].score >= 0.38 ? ranked[0].car : null;
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

      const { data: cars, error: carsError } = await supabase
        .from("cars")
        .select("id, name, brand, brochure_url, slug")
        .limit(500);

      if (carsError) {
        return JSON.stringify({
          success: false,
          error: carsError.message,
          customer_message: "Brochure check karte waqt technical issue aa gaya. Ek minute, main human team se confirm karwati hoon. 🙏",
        });
      }

      const car = pickBestCarMatch(car_name, (cars || []) as Array<{ id: string; name: string; brand: string | null; slug: string | null; brochure_url: string | null }>);
      if (!car?.brochure_url) {
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
          success: false,
          error: car ? "Brochure not available" : "Car not matched",
          customer_message: car
            ? `${car.brand || ""} ${car.name} ka brochure abhi system me available nahi hai. Main details text me share kar sakti hoon ya expert se connect kara du?`
            : `Mujhe ${car_name} ka exact brochure match nahi mila. Aap spelling confirm kar dein ya car ka full name bhej dein, main turant check karti hoon.`,
        });
      }

      try {
        const { data: sendData, error: sendError } = await supabase.functions.invoke("wa-send-inbox", {
          body: {
            phone: `91${cleanPhone}`,
            message_type: "document",
            content: `Hi ${name || "there"}! Riya here from GrabYourCar 👋\n\n${car.brand} ${car.name} ka brochure attached hai.`,
            media_url: car.brochure_url,
            media_filename: `${car.brand}-${car.name}-brochure.pdf`,
            sent_by_name: "Riya (AI)",
          },
        });
        if (sendError || !sendData?.success) {
          return JSON.stringify({
            success: false,
            error: sendError?.message || sendData?.error || "WhatsApp send failed",
            customer_message: `${car.brand || ""} ${car.name} ka brochure abhi send nahi ho paya. Main dobara try kar sakti hoon ya direct link share kar dun: ${car.brochure_url}`,
          });
        }
      } catch (e) {
        console.warn("[riya-chat] WhatsApp send failed:", e);
        return JSON.stringify({
          success: false,
          error: e instanceof Error ? e.message : "WhatsApp send failed",
          customer_message: `${car.brand || ""} ${car.name} ka brochure abhi send nahi ho paya. Main direct link share kar rahi hoon: ${car.brochure_url}`,
        });
      }

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
        customer_message: `${car.brand} ${car.name} ka brochure abhi aapke WhatsApp par share kar diya hai. Agar 1 minute me na aaye toh yahi bata dena — main link bhi share kar dungi. 👍`,
        message: `${car.brand} ${car.name} brochure sent to ${cleanPhone}`,
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
        message: `Reason: ${reason || "Customer wants human"}`,
        status: "new",
        raw_data: args as never,
      });
      return JSON.stringify({ success: true, message: `Hamari team aapko ${cleanPhone} pe 5 min me call karegi.` });
    }

    return JSON.stringify({ success: false, error: `Unknown tool: ${fn}` });
  } catch (e) {
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
          name: { type: "string" },
          phone: { type: "string", description: "10-digit Indian phone number" },
          vertical: { type: "string", enum: ["sales", "insurance", "loans", "hsrp", "rentals", "dealer", "accessories"] },
          city: { type: "string" },
          message: { type: "string" },
          car_interest: { type: "string" },
        },
        required: ["phone", "vertical"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_brochure",
      description: "Send a car brochure PDF to the customer via WhatsApp.",
      parameters: {
        type: "object",
        properties: {
          car_name: { type: "string" },
          phone: { type: "string" },
          name: { type: "string" },
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
          phone: { type: "string" },
          reason: { type: "string" },
        },
        required: ["phone"],
      },
    },
  },
];

async function persistMessages(
  supabase: ReturnType<typeof createClient>,
  sessionKey: string,
  messages: Array<{ role: string; content: string }>,
  assistantReply: string,
  userAgent?: string
) {
  try {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const lastUserContent = lastUser?.content || "";
    const phoneMatch = lastUserContent.match(/\b([6-9]\d{9})\b/);
    const detectedVertical = detectVertical(lastUserContent);

    const { data: existing } = await supabase
      .from("riya_chat_sessions")
      .select("id, takeover_state, message_count")
      .eq("session_key", sessionKey)
      .maybeSingle();

    let sessionId: string;
    if (existing) {
      sessionId = existing.id as string;
      await supabase
        .from("riya_chat_sessions")
        .update({
          last_message_preview: assistantReply.slice(0, 200),
          last_message_at: new Date().toISOString(),
          last_visitor_message_at: new Date().toISOString(),
          message_count: (existing.message_count as number) + 2,
          ...(phoneMatch ? { visitor_phone: phoneMatch[1] } : {}),
          ...(detectedVertical ? { vertical_interest: detectedVertical } : {}),
        })
        .eq("id", sessionId);
    } else {
      const { data: created } = await supabase
        .from("riya_chat_sessions")
        .insert({
          session_key: sessionKey,
          last_message_preview: assistantReply.slice(0, 200),
          last_visitor_message_at: new Date().toISOString(),
          message_count: 2,
          visitor_phone: phoneMatch ? phoneMatch[1] : null,
          vertical_interest: detectedVertical,
          user_agent: userAgent || null,
          takeover_state: "ai",
        })
        .select("id")
        .single();
      sessionId = created?.id as string;
    }

    if (!sessionId) return;

    const rows: Array<Record<string, unknown>> = [];
    if (lastUser) {
      rows.push({ session_id: sessionId, role: "user", content: lastUser.content, sender_name: "Visitor" });
    }
    rows.push({ session_id: sessionId, role: "assistant", content: assistantReply, sender_name: "Riya (AI)" });
    await supabase.from("riya_chat_messages").insert(rows);
  } catch (e) {
    console.warn("[riya-chat] persist failed:", e);
  }
}

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

    const sessionKey = sessionId || crypto.randomUUID();
    const userAgent = req.headers.get("user-agent") || undefined;

    // Check takeover state — if a human agent has taken over, pause AI unless the human has been idle for 5+ minutes.
    const { data: sessionRow } = await supabase
      .from("riya_chat_sessions")
      .select("id, takeover_state, assigned_agent_name, human_taken_over_at")
      .eq("session_key", sessionKey)
      .maybeSingle();

    if (sessionRow?.takeover_state === "human") {
      const humanTakenAt = sessionRow.human_taken_over_at ? new Date(sessionRow.human_taken_over_at).getTime() : null;
      const humanTimedOut = humanTakenAt ? Date.now() - humanTakenAt >= 5 * 60 * 1000 : false;

      if (!humanTimedOut) {
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser && sessionRow.id) {
          await supabase.from("riya_chat_messages").insert({
            session_id: sessionRow.id,
            role: "user",
            content: lastUser.content,
            sender_name: "Visitor",
          });
          await supabase
            .from("riya_chat_sessions")
            .update({
              last_message_preview: lastUser.content.slice(0, 200),
              last_message_at: new Date().toISOString(),
              last_visitor_message_at: new Date().toISOString(),
            })
            .eq("id", sessionRow.id);
        }
        return new Response(
          JSON.stringify({
            message: `${sessionRow.assigned_agent_name || "Hamare expert"} aapse personally connect ho rahe hain — ek minute 🙏`,
            sessionId: sessionKey,
            sessionUuid: sessionRow.id,
            takeover: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (sessionRow.id) {
        await supabase
          .from("riya_chat_sessions")
          .update({
            takeover_state: "ai",
            assigned_agent_id: null,
            assigned_agent_name: null,
          })
          .eq("id", sessionRow.id)
          .eq("takeover_state", "human");

        await supabase.from("riya_chat_messages").insert({
          session_id: sessionRow.id,
          role: "system",
          content: "🤖 Human reply 5 minute tak nahi aayi, isliye Riya dobara active ho gayi hai.",
          sender_name: "System",
        });
      }
    }

    const sessionContext = { sessionId: sessionKey, userAgent };

    let conversationMessages: Array<Record<string, unknown>> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    let iterations = 0;
    while (iterations < 4) {
      iterations++;
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
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
          return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        conversationMessages.push(choice as Record<string, unknown>);
        let forcedReply: string | null = null;
        for (const tc of toolCalls) {
          const result = await executeToolCall(tc, supabase, sessionContext);
          const parsed = safeParseToolResult(result);
          if (parsed?.customer_message && typeof parsed.customer_message === "string") {
            forcedReply = parsed.customer_message;
          }
          conversationMessages.push({ role: "tool", tool_call_id: tc.id, content: result });
        }
        if (forcedReply) {
          persistMessages(supabase, sessionKey, messages, forcedReply, userAgent).catch((e) =>
            console.warn("[riya-chat] persist error:", e)
          );
          return new Response(
            JSON.stringify({ message: forcedReply, sessionId: sessionKey }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        continue;
      }

      const reply = choice.content || "Sorry, I didn't catch that. Phir se bolenge?";
      persistMessages(supabase, sessionKey, messages, reply, userAgent).catch((e) =>
        console.warn("[riya-chat] persist error:", e)
      );

      return new Response(
        JSON.stringify({ message: reply, sessionId: sessionKey }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Lagta hai kuch complex hai. Hamari team aapko call karegi — kya phone number share karenge?",
        sessionId: sessionKey,
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
