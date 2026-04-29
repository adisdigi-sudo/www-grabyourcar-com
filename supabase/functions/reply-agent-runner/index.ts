import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      agent_id,
      inbound_message,
      customer_phone = null,
      customer_email = null,
      customer_name = null,
      test_mode = false,
      conversation_history = [], // [{role:'user'|'assistant', content:string}]
    } = body || {};

    if (!agent_id || !inbound_message) {
      return new Response(
        JSON.stringify({ error: "agent_id and inbound_message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: agent, error: agentErr } = await supabase
      .from("reply_agents")
      .select("*")
      .eq("id", agent_id)
      .single();

    if (agentErr || !agent) {
      return new Response(
        JSON.stringify({ error: "Agent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!test_mode && !agent.is_active) {
      return new Response(
        JSON.stringify({ error: "Agent disabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt — human-like WhatsApp style
    const humanStyleRules = `
RESPONSE STYLE — FOLLOW STRICTLY:
- You are a real human sales agent on WhatsApp, NOT a bot. Never say "I am an AI" or "as an assistant".
- Reply length: 1-2 short lines max (WhatsApp style). Never long paragraphs.
- LANGUAGE MATCHING: Detect customer's language from their message and reply in the SAME style:
  • If they write Hinglish (Hindi in English letters like "kitna hai", "batao", "chahiye") → reply Hinglish.
  • If they write pure Hindi (Devanagari) → reply Hindi.
  • If they write English → reply English.
  • If mixed → mirror their mix.
- Tone: friendly, casual, warm — like a real dost/sales bhai. Use natural fillers: "haan ji", "bilkul", "achha", "sure", "got it".
- Ask ONE short question at a time, not 3 things at once.
- Use customer's name occasionally if known, not in every message.
- Emojis: max 1 per message, only when natural (👍 🙏 ✨). Don't overdo.
- Never use bullet points, markdown, headings, or formal email language.
- Never repeat your greeting in every message — greet only the first time.
- If you don't know something, say "ek minute, check karke batata hu" / "let me check and get back".
`;

    const STRICT_RULES = `## STRICT RULES — Never break these (HIGHEST PRIORITY)

1. BROCHURE / PDF / POLICY / IMAGES / DOCUMENTS: Only send when the customer EXPLICITLY asks in THIS message ("brochure chahiye", "PDF bhejo", "policy bhejo", "image dikhao", "photo send karo"). NEVER auto-send. NEVER offer unsolicited.
2. STOCK / OFFERS / DEALS: Never send "updated stock", "new arrivals", "special deals", "available cars list" unless the customer asks first in this message.
3. NO FAKE FOLLOWUPS: Never claim "aapne pehle inquiry ki thi", "last time aapne X dealer se poocha tha", "aapka pending inquiry hai" unless you have explicit verified history in the conversation. Do NOT invent past inquiries, dealers, cars, or context.
4. RELEVANCE: Every reply must be directly related to what the customer just said. No random promotional messages.
5. PHONE FIRST: Before any action (brochure, lead capture, document share), confirm the phone number first if not already verified.
6. ONE QUESTION: Ask only one thing per message. Never ask multiple questions together.
7. IF UNSURE: Say "ek minute, check karke batata hu" — never make up car names, dealer names, prices, or inquiries.

`;

    const systemPrompt = [
      STRICT_RULES,
      agent.system_prompt || "You are a helpful assistant.",
      humanStyleRules,
      agent.knowledge_base
        ? `\n\nKNOWLEDGE BASE (use to answer accurately, but reply in human style):\n${agent.knowledge_base}`
        : "",
      customer_name ? `\n\nCustomer name: ${customer_name}` : "",
    ].join("");

    // Build message array with conversation history (last 10)
    const history = Array.isArray(conversation_history)
      ? conversation_history
          .filter((m: any) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
          .slice(-10)
      : [];

    const startedAt = Date.now();
    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: agent.ai_model || "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: inbound_message },
          ],
          temperature: Number(agent.temperature ?? 0.8),
        }),
      }
    );

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      const status = aiResp.status === 429 ? 429 : aiResp.status === 402 ? 402 : 500;
      const msg =
        status === 429
          ? "Rate limit exceeded, please try again shortly."
          : status === 402
          ? "AI credits exhausted. Please top up at Settings → Workspace → Usage."
          : `AI gateway error: ${errText}`;
      await supabase.from("reply_agent_logs").insert({
        agent_id,
        channel: agent.channel,
        customer_phone,
        customer_email,
        customer_name,
        inbound_message,
        status: "failed",
        error_message: msg,
        ai_model_used: agent.ai_model,
      });
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const reply: string =
      aiData?.choices?.[0]?.message?.content?.trim?.() || "(no reply)";
    const tokens = aiData?.usage?.total_tokens ?? null;
    const duration = Date.now() - startedAt;

    const status = test_mode
      ? "test"
      : agent.auto_send
      ? "sent"
      : "queued_for_approval";

    await supabase.from("reply_agent_logs").insert({
      agent_id,
      channel: agent.channel,
      customer_phone,
      customer_email,
      customer_name,
      inbound_message,
      ai_reply: reply,
      status,
      auto_sent: !test_mode && !!agent.auto_send,
      approval_required: !test_mode && !agent.auto_send,
      ai_model_used: agent.ai_model,
      tokens_used: tokens,
      duration_ms: duration,
    });

    if (!test_mode) {
      await supabase
        .from("reply_agents")
        .update({
          total_runs: (agent.total_runs ?? 0) + 1,
          total_replies_sent:
            (agent.total_replies_sent ?? 0) + (agent.auto_send ? 1 : 0),
          total_approvals_pending:
            (agent.total_approvals_pending ?? 0) + (agent.auto_send ? 0 : 1),
          last_run_at: new Date().toISOString(),
        })
        .eq("id", agent_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        reply,
        status,
        duration_ms: duration,
        tokens_used: tokens,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("reply-agent-runner error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});