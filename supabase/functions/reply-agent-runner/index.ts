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

    // Build prompt
    const systemPrompt = [
      agent.system_prompt || "You are a helpful assistant.",
      agent.knowledge_base
        ? `\n\nKNOWLEDGE BASE (use this to answer accurately):\n${agent.knowledge_base}`
        : "",
      customer_name ? `\n\nCustomer name: ${customer_name}` : "",
    ].join("");

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
            { role: "user", content: inbound_message },
          ],
          temperature: Number(agent.temperature ?? 0.7),
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